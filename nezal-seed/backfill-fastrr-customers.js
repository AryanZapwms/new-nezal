/**
 * ============================================================
 *  NEZAL — Backfill Fastrr checkout customers into users
 *  backfill-fastrr-customers.js
 *
 *  New confirmed Shiprocket checkout (Fastrr) orders save their
 *  customer as a User and link the order to it (saveFastrrCustomer in
 *  lib/fastrr-customers.ts). This script applies the same rules to the
 *  orders placed before that existed:
 *    - confirmed orders only — paid, or COD and not pending/cancelled
 *      (isCheckoutOrderConfirmed in lib/shiprocket-checkout-order.ts)
 *    - orders already linked to a user are left alone
 *    - customers matched by email only; the <phone>@fastrr.com
 *      placeholder counts as an email
 *    - a new customer is created from their first order, oldest first,
 *      and its created date ("Joined") is that order's date
 *    - an existing account is linked, and only gains a phone or address
 *      it's missing; a Fastrr customer the live code saved from a later
 *      order gets their Joined date moved back to their first order
 *  The report also lists phone numbers that map to more than one email,
 *  for a later decision on merging (nothing is merged).
 *
 *  SAFETY
 *    - Dry run by default: read-only. Writes only with --commit.
 *    - --commit reads MONGODB_URI from the environment only, never
 *      .env.local (which points at production), and asks you to type the
 *      database name after showing the host it will write to.
 *    - Writes only the users and orders collections, through the raw
 *      driver: no app code runs, so no emails, WhatsApp messages,
 *      webhooks or Shiprocket calls. No models, autoIndex off.
 *    - Idempotent: every write is conditional, so a second run creates
 *      and links nothing. The confirmed orders are re-read at write time.
 *    - Every write is appended to a log file as it happens (ids and the
 *      values it replaced, no emails), so a run — even an interrupted
 *      one — can be reversed with --revert.
 *
 *  --revert <log> undoes a run, only where nothing has changed since:
 *    - a created user is deleted only while it is still unclaimed
 *      (source "fastrr", no password, isVerified false), unchanged since
 *      the backfill (same updatedAt), and has no orders other than the
 *      ones the backfill linked; then its orders are unlinked. Claimed or
 *      changed users are kept, with their orders, and reported.
 *    - an order the backfill linked to an existing account is unlinked
 *      only if it still points at that account
 *    - a filled phone/address is restored only if it still holds the
 *      value the backfill wrote
 *    - a moved Joined date is restored only if it is still the date the
 *      backfill set
 *    Same safeguards as --commit; safe to run twice.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/backfill-fastrr-customers.js                    # dry run
 *    MONGODB_URI="mongodb+srv://..." \
 *      node nezal-seed/backfill-fastrr-customers.js --commit          # apply
 *    ... --commit --out path/to/log.jsonl   # log file (default: nezal-seed/logs/, gitignored)
 *    node nezal-seed/backfill-fastrr-customers.js --revert <log>     # revert, dry run
 *    MONGODB_URI="mongodb+srv://..." \
 *      node nezal-seed/backfill-fastrr-customers.js --revert <log> --commit
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const readline = require("readline")
const mongoose = require("mongoose")

// Try to load MONGODB_URI from .env.local (same file the Next.js app uses),
// without requiring the "dotenv" package to be installed.
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

// Mirrors lib/imported-users.ts and lib/fastrr-customers.ts.
const IMPORTED_EMAIL_REGEX = /@imported\.nezal$/i
const FASTRR_PLACEHOLDER_EMAIL_REGEX = /@fastrr\.com$/i
const EXAMPLES = 5

function parseArgs(argv) {
  const args = { commit: false, out: null, revert: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--commit") args.commit = true
    else if (a === "--dry-run") args.commit = false
    else if (a === "--out" && argv[i + 1]) args.out = argv[++i]
    else if (a === "--revert" && argv[i + 1]) args.revert = argv[++i]
    else {
      console.error(`❌  Unknown argument "${a}"`)
      process.exit(1)
    }
  }
  return args
}

// Same rule as sanitizePhone in lib/shiprocket-checkout-order.ts, for the
// free-text phones on existing users.
function normalizePhone(raw) {
  if (!raw) return ""
  let digits = String(raw).replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  return digits.length === 10 ? digits : ""
}

// Mirrors saveFastrrCustomer's phone and email choice.
function customerOf(order) {
  const shipping = order.shippingAddress || {}
  const phone = order.guestPhone || shipping.phone || ""
  const email = typeof order.guestEmail === "string" ? order.guestEmail.trim().toLowerCase() : ""
  if (email.includes("@")) return { email, phone }
  return { email: phone ? `${phone}@fastrr.com` : null, phone }
}

// Drops undefined values, which the raw driver would store as null.
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

// Everything saveFastrrCustomer would save for this order's customer, or
// null when the order has no usable email or phone.
function customerFields(order) {
  const { email, phone } = customerOf(order)
  if (!email || IMPORTED_EMAIL_REGEX.test(email)) return null
  const shipping = order.shippingAddress || {}
  const address = compact({
    street: shipping.street || shipping.address,
    city: shipping.city,
    state: shipping.state,
    zipCode: shipping.zipCode || shipping.pincode,
    country: shipping.country,
  })
  return {
    email,
    phone: phone || undefined,
    name: (order.guestName || "").trim() || "Customer",
    address: address.street || address.city ? address : undefined,
  }
}

const isPlaceholder = (email) => FASTRR_PLACEHOLDER_EMAIL_REGEX.test(email)
const hasAddress = (a) => Boolean(a && (a.street || a.address || a.city))
const isEmpty = (v) => v === undefined || v === null || v === ""
const orderDate = (order) => order.createdAt || order._id.getTimestamp()
const objectId = (v) => new mongoose.Types.ObjectId(String(v))

const maskPhone = (p) => (p ? `******${String(p).slice(-4)}` : "(none)")
function maskEmail(email) {
  if (isPlaceholder(email)) return `${maskPhone(email.split("@")[0])}@fastrr.com`
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}***@${domain}`
}
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "?")
const pad = (label) => `   ${label}`.padEnd(52, " ") + ": "

// Host part of a connection string, without credentials.
function hostOf(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri)
  return match ? match[1] : "(unknown host)"
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    let answered = false
    rl.question(question, (answer) => {
      answered = true
      rl.close()
      resolve(answer)
    })
    rl.on("close", () => {
      if (!answered) resolve("")
    })
  })
}

async function confirmWrite(db, uri) {
  console.log(`\n⚠️   About to WRITE to database "${db.databaseName}" on host ${hostOf(uri)}.`)
  const answer = await ask(`    Type the database name to continue: `)
  if (answer.trim() === db.databaseName) return true
  console.log("Aborted — nothing was written.")
  return false
}

const CHECKOUT = { paymentMethod: "shiprocket_checkout" }
const CONFIRMED = {
  ...CHECKOUT,
  $or: [
    { paymentStatus: "completed" },
    { shiprocketPaymentType: "cod", orderStatus: { $nin: ["pending", "cancelled"] } },
  ],
}

function fetchConfirmed(orders) {
  return orders
    .find(CONFIRMED)
    .project({ orderNumber: 1, user: 1, guestEmail: 1, guestName: 1, guestPhone: 1, shippingAddress: 1, createdAt: 1 })
    .sort({ createdAt: 1, _id: 1 })
    .toArray()
}

// ── Dry-run report (also shown before --commit asks to continue) ─────────────
async function report(db) {
  const orders = db.collection("orders")
  const users = db.collection("users")

  const totalCheckout = await orders.countDocuments(CHECKOUT)
  const confirmed = await fetchConfirmed(orders)

  // Why the rest don't count.
  const notConfirmed = await orders
    .aggregate([
      { $match: { ...CHECKOUT, _id: { $nin: confirmed.map((o) => o._id) } } },
      {
        $group: {
          _id: { pay: "$paymentStatus", type: { $ifNull: ["$shiprocketPaymentType", "(none)"] }, status: "$orderStatus" },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
    ])
    .toArray()

  // Walk the confirmed orders, oldest first, like the live code would have.
  const alreadyLinked = []
  const noContact = []
  const toLink = []
  const customers = new Map() // email -> { firstOrderAt, orders, name, phone, hasAddress }
  const emailsByPhone = new Map() // phone -> Set(email), across every confirmed order

  for (const order of confirmed) {
    const { email, phone } = customerOf(order)
    if (phone && email) {
      if (!emailsByPhone.has(phone)) emailsByPhone.set(phone, new Set())
      emailsByPhone.get(phone).add(email)
    }
    if (order.user) {
      alreadyLinked.push(order)
      continue
    }
    if (!email || IMPORTED_EMAIL_REGEX.test(email)) {
      noContact.push(order)
      continue
    }
    toLink.push(order)
    const c = customers.get(email)
    if (!c) {
      customers.set(email, {
        firstOrderAt: orderDate(order),
        orders: 1,
        name: (order.guestName || "").trim(),
        phone,
        hasAddress: hasAddress(order.shippingAddress),
      })
    } else {
      c.orders += 1
      c.phone = c.phone || phone
      c.hasAddress = c.hasAddress || hasAddress(order.shippingAddress)
    }
  }

  // Already-linked orders pointing at a user that no longer exists.
  const linkedIds = Array.from(new Set(alreadyLinked.map((o) => String(o.user))))
  const linkedExisting = await users
    .find({ _id: { $in: linkedIds.map(objectId) } })
    .project({ _id: 1 })
    .toArray()
  const danglingLinks = alreadyLinked.length - alreadyLinked.filter((o) => linkedExisting.some((u) => String(u._id) === String(o.user))).length

  // Which customers already have an account.
  const emails = Array.from(customers.keys())
  const existing = await users
    .find({ email: { $in: emails } })
    .project({ email: 1, isVerified: 1, isImported: 1, role: 1, source: 1, phone: 1, address: 1, createdAt: 1 })
    .toArray()
  const existingByEmail = new Map(existing.map((u) => [u.email, u]))

  const newCustomers = emails.filter((e) => !existingByEmail.has(e))
  const newPlaceholders = newCustomers.filter(isPlaceholder)
  const newWithoutName = newCustomers.filter((e) => !customers.get(e).name)
  const newWithoutAddress = newCustomers.filter((e) => !customers.get(e).hasAddress)
  const joinedDates = newCustomers.map((e) => customers.get(e).firstOrderAt).filter(Boolean).sort((a, b) => a - b)
  const repeatCustomers = emails.filter((e) => customers.get(e).orders > 1)

  const phoneFills = existing.filter((u) => isEmpty(u.phone) && customers.get(u.email).phone)
  const addressFills = existing.filter((u) => !hasAddress(u.address) && customers.get(u.email).hasAddress)
  const joinedMoves = existing.filter((u) => u.source === "fastrr" && u.createdAt > customers.get(u.email).firstOrderAt)

  // Phones that map to more than one email.
  const multiEmailPhones = Array.from(emailsByPhone.entries()).filter(([, set]) => set.size > 1)
  const placeholderAndReal = multiEmailPhones.filter(([, set]) => {
    const list = Array.from(set)
    return list.some(isPlaceholder) && list.some((e) => !isPlaceholder(e))
  })
  const onlyReal = multiEmailPhones.filter(([, set]) => Array.from(set).every((e) => !isPlaceholder(e)))

  // New customers whose phone an existing account (under another email) also has.
  const allUsersWithPhone = await users
    .find({ phone: { $nin: [null, ""] } })
    .project({ email: 1, phone: 1 })
    .toArray()
  const accountEmailsByPhone = new Map()
  for (const u of allUsersWithPhone) {
    const p = normalizePhone(u.phone)
    if (!p) continue
    if (!accountEmailsByPhone.has(p)) accountEmailsByPhone.set(p, new Set())
    accountEmailsByPhone.get(p).add(u.email)
  }
  const phoneOnOtherAccount = newCustomers.filter((e) => {
    const p = customers.get(e).phone
    const others = p && accountEmailsByPhone.get(p)
    return others && Array.from(others).some((other) => other !== e)
  })

  console.log("ORDERS")
  console.log(pad("shiprocket_checkout orders") + totalCheckout)
  console.log(pad("confirmed (paid, or COD not pending/cancelled)") + confirmed.length)
  console.log(pad("  already linked to a user") + alreadyLinked.length)
  console.log(pad("    of those, linked to a user that's gone") + danglingLinks)
  console.log(pad("  no usable email or phone (skipped)") + noContact.length)
  console.log(pad("  would be linked") + toLink.length)
  console.log(pad("not confirmed (no customer)") + (totalCheckout - confirmed.length))
  for (const g of notConfirmed) {
    console.log(`     ${String(g.n).padStart(4)}  pay=${g._id.pay} type=${g._id.type} status=${g._id.status}`)
  }

  console.log("\nCUSTOMERS (distinct emails on the orders that would be linked)")
  console.log(pad("distinct emails") + emails.length)
  console.log(pad("  with more than one order") + repeatCustomers.length)
  console.log(pad("new users to create") + newCustomers.length)
  console.log(pad("  of which @fastrr.com placeholders") + newPlaceholders.length)
  console.log(pad("  with no name (saved as \"Customer\")") + newWithoutName.length)
  console.log(pad("  with no address on any order") + newWithoutAddress.length)
  console.log(pad("  Joined dates (first order) range") + (joinedDates.length ? `${day(joinedDates[0])} → ${day(joinedDates.at(-1))}` : "—"))
  console.log(pad("existing users matched") + existing.length)
  console.log(pad("  verified") + existing.filter((u) => u.isVerified).length)
  console.log(pad("  unverified") + existing.filter((u) => !u.isVerified).length)
  console.log(pad("  source fastrr already") + existing.filter((u) => u.source === "fastrr").length)
  console.log(pad("  admins") + existing.filter((u) => u.role === "admin").length)
  console.log(pad("  imported reviewers") + existing.filter((u) => u.isImported || IMPORTED_EMAIL_REGEX.test(u.email)).length)
  console.log(pad("  would gain a phone (theirs is empty)") + phoneFills.length)
  console.log(pad("  would gain an address (theirs is empty)") + addressFills.length)
  console.log(pad("  Fastrr, Joined date moved to first order") + joinedMoves.length)

  console.log("\nPHONES WITH MORE THAN ONE EMAIL (across all confirmed orders — not merged)")
  console.log(pad("phones with 2+ distinct emails") + multiEmailPhones.length)
  console.log(pad("  a placeholder and a real email") + placeholderAndReal.length)
  console.log(pad("  only real emails") + onlyReal.length)
  console.log(pad("  placeholders only (should be 0)") + (multiEmailPhones.length - placeholderAndReal.length - onlyReal.length))
  for (const [phone, set] of multiEmailPhones.slice(0, EXAMPLES)) {
    const list = Array.from(set).map((e) => {
      const tags = [isPlaceholder(e) ? "placeholder" : "real"]
      if (existingByEmail.has(e)) tags.push("has account")
      return `${maskEmail(e)} (${tags.join(", ")})`
    })
    console.log(`     ${maskPhone(phone)} → ${list.join(" | ")}`)
  }
  console.log(pad("new users whose phone an existing account has") + phoneOnOtherAccount.length)
  for (const e of phoneOnOtherAccount.slice(0, EXAMPLES)) {
    const p = customers.get(e).phone
    const others = Array.from(accountEmailsByPhone.get(p)).filter((o) => o !== e)
    console.log(`     ${maskPhone(p)} → new ${maskEmail(e)} | account ${others.map(maskEmail).join(", ")}`)
  }
}

// ── --commit ─────────────────────────────────────────────────────────────────
async function backfill(db, logPath) {
  const orders = db.collection("orders")
  const users = db.collection("users")

  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const log = (entry) => fs.appendFileSync(logPath, JSON.stringify(entry) + "\n")
  log({ type: "run", db: db.databaseName, startedAt: new Date() })

  // Re-read now: orders may have arrived since the report above.
  const totalCheckout = await orders.countDocuments(CHECKOUT)
  const confirmed = await fetchConfirmed(orders)

  const createdThisRun = new Set()
  const s = { created: 0, linked: 0, filled: 0, joinedMoved: 0, alreadyLinked: 0, linkedMeanwhile: 0, noContact: 0 }

  for (const order of confirmed) {
    if (order.user) {
      s.alreadyLinked++
      continue
    }
    const c = customerFields(order)
    if (!c) {
      s.noContact++
      continue
    }

    const now = new Date()
    const firstOrderAt = orderDate(order)
    let user
    let created = false
    try {
      // email comes from the filter on insert. The defaults are the ones
      // Mongoose adds when lib/fastrr-customers.ts creates a customer.
      const res = await users.findOneAndUpdate(
        { email: c.email },
        {
          $setOnInsert: compact({
            name: c.name,
            phone: c.phone,
            address: c.address,
            source: "fastrr",
            isVerified: false,
            role: "user",
            marketingConsent: false,
            isActive: true,
            isImported: false,
            provider: "credentials",
            wishlist: [],
            createdAt: firstOrderAt,
            updatedAt: now,
            __v: 0,
          }),
        },
        { upsert: true, returnDocument: "after", includeResultMetadata: true }
      )
      user = res.value
      created = !res.lastErrorObject?.updatedExisting
    } catch (err) {
      // The live code created this customer at the same moment.
      if (err?.code !== 11000) throw err
      user = await users.findOne({ email: c.email })
      if (!user) throw err
    }

    if (created) {
      createdThisRun.add(String(user._id))
      s.created++
      // updatedAt lets --revert tell whether the user changed after the run.
      log({ type: "createdUser", userId: user._id, orderId: order._id, updatedAt: now })
    } else {
      // An existing account only gains what it's missing. Each write is
      // logged with the value it replaced, so --revert can put it back.
      const isCreated = createdThisRun.has(String(user._id))
      const fills = [
        c.phone && { field: "phone", value: c.phone, empty: { phone: { $in: [null, ""] } } },
        c.address && {
          field: "address",
          value: c.address,
          empty: { "address.street": { $in: [null, ""] }, "address.city": { $in: [null, ""] } },
        },
      ].filter(Boolean)
      let filledExisting = false
      for (const f of fills) {
        const before = await users.findOneAndUpdate(
          { _id: user._id, ...f.empty },
          { $set: { [f.field]: f.value, updatedAt: now } },
          { returnDocument: "before", projection: { [f.field]: 1 } }
        )
        if (!before) continue
        log({
          type: "filledUser",
          userId: user._id,
          field: f.field,
          value: f.value,
          previous: before[f.field] ?? null,
          previousMissing: !(f.field in before),
          updatedAt: now,
          createdThisRun: isCreated,
        })
        if (!isCreated) filledExisting = true
      }
      if (filledExisting) s.filled++

      // A Fastrr customer the live code saved from a later order: Joined
      // becomes their first order. Registered accounts keep their date.
      const beforeMove = await users.findOneAndUpdate(
        { _id: user._id, source: "fastrr", createdAt: { $gt: firstOrderAt } },
        { $set: { createdAt: firstOrderAt } },
        { returnDocument: "before", projection: { createdAt: 1 } }
      )
      if (beforeMove) {
        s.joinedMoved++
        log({ type: "movedJoinedDate", userId: user._id, from: beforeMove.createdAt, to: firstOrderAt })
      }
    }

    const linked = await orders.updateOne({ _id: order._id, user: null }, { $set: { user: user._id } })
    if (linked.modifiedCount) {
      s.linked++
      log({ type: "linkedOrder", orderId: order._id, userId: user._id })
    } else {
      s.linkedMeanwhile++
    }
  }

  log({ type: "done", finishedAt: new Date(), ...s })

  console.log("\nSUMMARY")
  console.log(pad("users created") + s.created)
  console.log(pad("orders linked") + s.linked)
  console.log(pad("existing users given a missing phone/address") + s.filled)
  console.log(pad("Fastrr customers' Joined date moved back") + s.joinedMoved)
  console.log(pad("skipped — already linked") + s.alreadyLinked)
  console.log(pad("skipped — linked by the live code meanwhile") + s.linkedMeanwhile)
  console.log(pad("skipped — no usable email or phone") + s.noContact)
  console.log(pad("not confirmed (no customer)") + (totalCheckout - confirmed.length))
  console.log(`\n📝  Log for reversing this run (--revert): ${logPath}`)
  console.log("    Only the users and orders collections were written — no emails, messages or webhooks.")
}

// ── --revert <log> ───────────────────────────────────────────────────────────
function readLog(logPath) {
  if (!fs.existsSync(logPath)) {
    console.error(`❌  Log file not found: ${logPath}`)
    process.exit(1)
  }
  const entries = fs
    .readFileSync(logPath, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
  const header = entries.find((e) => e.type === "run")
  if (!header) {
    console.error("❌  Not a backfill log: it has no run entry.")
    process.exit(1)
  }
  return { entries, header, finished: entries.some((e) => e.type === "done") }
}

// With apply false, only reads, and reports what a revert would do. With
// apply true, every write is conditional on the state the backfill left.
async function revertBackfill(db, entries, apply) {
  const users = db.collection("users")
  const orders = db.collection("orders")
  const unlink = async (filter) =>
    apply ? (await orders.updateMany(filter, { $unset: { user: "" } })).modifiedCount : await orders.countDocuments(filter)

  const created = entries.filter((e) => e.type === "createdUser")
  const createdIds = new Set(created.map((e) => String(e.userId)))
  const links = entries.filter((e) => e.type === "linkedOrder")
  const fills = entries.filter((e) => e.type === "filledUser")
  const moves = entries.filter((e) => e.type === "movedJoinedDate")

  // The last updatedAt the backfill wrote on each user it created: anything
  // else means the user changed after the run.
  const lastWritten = new Map()
  for (const e of [...created, ...fills]) {
    const id = String(e.userId)
    if (!createdIds.has(id)) continue
    const at = new Date(e.updatedAt).getTime()
    if (!lastWritten.has(id) || at > lastWritten.get(id)) lastWritten.set(id, at)
  }
  const linkedOrdersOf = new Map()
  for (const e of links) {
    const id = String(e.userId)
    if (!linkedOrdersOf.has(id)) linkedOrdersOf.set(id, [])
    linkedOrdersOf.get(id).push(objectId(e.orderId))
  }

  const r = {
    created: created.length,
    deleted: 0,
    kept: { claimed: [], changed: [], newerOrders: [] },
    gone: 0,
    links: links.length,
    unlinked: 0,
    leftLinked: 0,
    alreadyUnlinked: 0,
    relinked: 0,
    fills: 0,
    restored: 0,
    alreadyRestored: 0,
    fillChanged: 0,
    moves: moves.length,
    joinedRestored: 0,
    joinedAlready: 0,
    joinedChanged: 0,
  }

  // Splits a user's logged orders by where they point now.
  async function logged(userId) {
    const ids = linkedOrdersOf.get(String(userId)) || []
    const docs = await orders.find({ _id: { $in: ids } }).project({ user: 1 }).toArray()
    const pointing = docs.filter((o) => String(o.user) === String(userId)).length
    const unlinkedNow = docs.filter((o) => !o.user).length
    return { ids, pointing, unlinkedNow, elsewhere: ids.length - pointing - unlinkedNow }
  }

  // ── Users the backfill created ──
  for (const e of created) {
    const userId = objectId(e.userId)
    const written = new Date(lastWritten.get(String(userId)))
    const l = await logged(userId)
    r.alreadyUnlinked += l.unlinkedNow
    r.relinked += l.elsewhere

    const doc = await users.findOne({ _id: userId })
    if (!doc) {
      // Deleted already (an earlier revert, or an admin): unlink what still
      // points at it rather than leave it dangling.
      r.gone++
      r.unlinked += await unlink({ user: userId })
      continue
    }

    const newerOrders = await orders.countDocuments({ user: userId, _id: { $nin: l.ids } })
    let reason = null
    if (doc.isVerified === true || !isEmpty(doc.password)) reason = "claimed"
    else if (doc.source !== "fastrr" || !doc.updatedAt || doc.updatedAt.getTime() !== written.getTime()) reason = "changed"
    else if (newerOrders > 0) reason = "newerOrders"

    if (!reason && apply) {
      // Deleted only while every condition still holds at this moment.
      const res = await users.deleteOne({
        _id: userId,
        source: "fastrr",
        password: { $in: [null, ""] },
        isVerified: { $ne: true },
        updatedAt: written,
      })
      if (!res.deletedCount) reason = "changed"
    }
    if (reason) {
      r.kept[reason].push(String(userId))
      r.leftLinked += l.pointing
      continue
    }
    r.deleted++
    r.unlinked += await unlink({ user: userId })
  }

  // ── Orders linked to accounts the backfill didn't create ──
  for (const e of links) {
    if (createdIds.has(String(e.userId))) continue
    const order = await orders.findOne({ _id: objectId(e.orderId) }, { projection: { user: 1 } })
    if (!order || !order.user) r.alreadyUnlinked++
    else if (String(order.user) !== String(e.userId)) r.relinked++
    else r.unlinked += await unlink({ _id: objectId(e.orderId), user: objectId(e.userId) })
  }

  // ── Phones/addresses filled on existing accounts ──
  // Fills on users the backfill created go with those users.
  for (const e of fills) {
    if (createdIds.has(String(e.userId))) continue
    r.fills++
    const userId = objectId(e.userId)
    const holdsWritten = { _id: userId, [e.field]: e.value }
    const restore = e.previousMissing ? { $unset: { [e.field]: "" } } : { $set: { [e.field]: e.previous } }
    const n = apply ? (await users.updateOne(holdsWritten, restore)).modifiedCount : await users.countDocuments(holdsWritten)
    if (n) {
      r.restored++
      continue
    }
    const current = await users.findOne({ _id: userId }, { projection: { [e.field]: 1 } })
    const back = current && (e.previousMissing ? !(e.field in current) : JSON.stringify(current[e.field] ?? null) === JSON.stringify(e.previous))
    back ? r.alreadyRestored++ : r.fillChanged++
  }

  // ── Joined dates moved back ──
  for (const e of moves) {
    const userId = objectId(e.userId)
    const stillMoved = { _id: userId, createdAt: new Date(e.to) }
    const n = apply
      ? (await users.updateOne(stillMoved, { $set: { createdAt: new Date(e.from) } })).modifiedCount
      : await users.countDocuments(stillMoved)
    if (n) {
      r.joinedRestored++
      continue
    }
    const current = await users.findOne({ _id: userId }, { projection: { createdAt: 1 } })
    current?.createdAt?.getTime() === new Date(e.from).getTime() ? r.joinedAlready++ : r.joinedChanged++
  }

  return r
}

function printRevert(r, applied) {
  const did = (done, would) => (applied ? done : would)
  console.log(applied ? "\nREVERT SUMMARY" : "REVERT PLAN (dry run)")
  console.log(pad("users the backfill created") + r.created)
  console.log(pad(did("  deleted", "  would delete")) + r.deleted)
  console.log(pad("  kept — claimed (sign-up, Google or reset)") + r.kept.claimed.length)
  console.log(pad("  kept — changed since the backfill") + r.kept.changed.length)
  console.log(pad("  kept — has orders linked since the backfill") + r.kept.newerOrders.length)
  console.log(pad("  already gone") + r.gone)
  console.log(pad("orders the backfill linked") + r.links)
  console.log(pad(did("  unlinked", "  would unlink")) + r.unlinked)
  console.log(pad("  left linked to a kept user") + r.leftLinked)
  console.log(pad("  already unlinked") + r.alreadyUnlinked)
  console.log(pad("  skipped — now linked to someone else") + r.relinked)
  console.log(pad("fields filled on existing accounts") + r.fills)
  console.log(pad(did("  restored", "  would restore")) + r.restored)
  console.log(pad("  already restored") + r.alreadyRestored)
  console.log(pad("  skipped — changed since the backfill") + r.fillChanged)
  console.log(pad("Joined dates moved back") + r.moves)
  console.log(pad(did("  restored", "  would restore")) + r.joinedRestored)
  console.log(pad("  already restored") + r.joinedAlready)
  console.log(pad("  skipped — changed since the backfill") + r.joinedChanged)
  for (const [reason, ids] of Object.entries(r.kept)) {
    if (ids.length) console.log(`     kept (${reason}): ${ids.slice(0, EXAMPLES).join(", ")}${ids.length > EXAMPLES ? ", …" : ""}`)
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const log = args.revert ? readLog(path.resolve(args.revert)) : null

  // Writing needs the database named on purpose: .env.local points at
  // production, so --commit never falls back to it.
  if (!args.commit) loadEnvLocal()
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error(
      args.commit
        ? "❌  --commit needs MONGODB_URI set explicitly in the environment (.env.local is not used for writes)."
        : "❌  Could not find MONGODB_URI — set it as an env var, or add it to .env.local in the project root."
    )
    process.exit(1)
  }

  const what = args.revert ? "REVERT" : "BACKFILL"
  console.log(
    args.commit
      ? `✍️   ${what} — COMMIT MODE: the report below is followed by a confirmation, then writes.\n`
      : `🔍  ${what} — DRY RUN: read-only, nothing will be written. Re-run with --commit to apply.\n`
  )

  console.log("🔌  Connecting to MongoDB...")
  // No models are compiled, and autoIndex/autoCreate are off, so connecting
  // can't build indexes or create collections.
  await mongoose.connect(MONGODB_URI, { autoIndex: false, autoCreate: false })
  const db = mongoose.connection.db
  console.log(`✅  Connected to database "${db.databaseName}" on ${hostOf(MONGODB_URI)}.\n`)

  if (log) {
    if (log.header.db !== db.databaseName) {
      console.error(`❌  This log is from database "${log.header.db}", not "${db.databaseName}" — refusing to revert.`)
      await mongoose.disconnect()
      process.exit(1)
    }
    console.log(`Log: ${path.resolve(args.revert)} — backfill started ${log.header.startedAt}${log.finished ? "" : " (interrupted: no done entry)"}\n`)
    printRevert(await revertBackfill(db, log.entries, false), false)
    if (args.commit) {
      if (!(await confirmWrite(db, MONGODB_URI))) {
        await mongoose.disconnect()
        process.exit(1)
      }
      printRevert(await revertBackfill(db, log.entries, true), true)
    } else {
      console.log("\nDone. Nothing was written.")
    }
    await mongoose.disconnect()
    return
  }

  await report(db)

  if (!args.commit) {
    console.log("\nDone. Nothing was written.")
    await mongoose.disconnect()
    return
  }

  if (!(await confirmWrite(db, MONGODB_URI))) {
    await mongoose.disconnect()
    process.exit(1)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.resolve(args.out || path.join(__dirname, "logs", `fastrr-customers-backfill-${db.databaseName}-${stamp}.jsonl`))
  await backfill(db, logPath)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error("❌  Failed:", err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
