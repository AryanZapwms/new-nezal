/**
 * ============================================================
 *  NEZAL — Flag review-import placeholder users
 *  mark-imported-users.js
 *
 *  Sets isImported=true on every user whose email ends with
 *  @imported.nezal — the placeholder accounts created by
 *  seed-customer-reviews-xlsx.js (375) and seed-client-reviews.js (9).
 *  The app already treats that email domain as imported (see
 *  lib/imported-users.ts); this backfill makes the flag authoritative.
 *
 *  Only the isImported field is written (plus its index). Safe to re-run.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/mark-imported-users.js            # dry run (default)
 *    node nezal-seed/mark-imported-users.js --commit   # apply
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
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
loadEnvLocal()

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("❌  Could not find MONGODB_URI — set it as an env var, or add it to .env.local in the project root.")
  process.exit(1)
}

// 375 from the xlsx import + 9 from seed-client-reviews.js
const EXPECTED_COUNT = 384
const IMPORTED_EMAIL_REGEX = /@imported\.nezal$/i

function parseArgs(argv) {
  const args = { commit: false }
  for (const a of argv) {
    if (a === "--commit") args.commit = true
    else if (a === "--dry-run") args.commit = false
    else {
      console.error(`❌  Unknown argument "${a}"`)
      process.exit(1)
    }
  }
  return args
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  console.log(args.commit ? "✍️   COMMIT MODE — changes WILL be written.\n" : "🔍  DRY RUN — nothing will be written. Re-run with --commit to apply.\n")

  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  // Raw collection: no schema needed, and only the fields named below are touched.
  const users = mongoose.connection.db.collection("users")
  const reviews = mongoose.connection.db.collection("reviews")

  const matchImported = { email: IMPORTED_EMAIL_REGEX }
  const total = await users.countDocuments(matchImported)
  const alreadyFlagged = await users.countDocuments({ ...matchImported, isImported: true })
  const toUpdate = total - alreadyFlagged

  // Safety checks: these accounts should never be admins or have real contact data.
  const admins = await users.countDocuments({ ...matchImported, role: "admin" })
  const withPhone = await users.countDocuments({ ...matchImported, phone: { $nin: [null, ""] } })
  const ids = (await users.find(matchImported).project({ _id: 1 }).toArray()).map((u) => u._id)
  const withReviews = (await reviews.distinct("user", { user: { $in: ids } })).length
  // Flagged accounts outside the domain would mean someone set the flag by hand.
  const flaggedElsewhere = await users.countDocuments({ isImported: true, email: { $not: IMPORTED_EMAIL_REGEX } })

  console.log(`   users with @imported.nezal email : ${total}`)
  console.log(`   already isImported=true          : ${alreadyFlagged}`)
  console.log(`   ${args.commit ? "updating" : "would update"}                     : ${toUpdate}`)
  console.log(`   of those, own ≥1 review           : ${withReviews}`)
  console.log(`   admins among them                : ${admins}`)
  console.log(`   with a phone number              : ${withPhone}`)
  console.log(`   isImported=true outside domain   : ${flaggedElsewhere}\n`)

  if (total === EXPECTED_COUNT) {
    console.log(`✅  Count matches the expected ${EXPECTED_COUNT} (375 xlsx + 9 client seed).`)
  } else {
    console.warn(`⚠️   Expected ${EXPECTED_COUNT} placeholder users but found ${total} — check before committing.`)
  }
  if (admins > 0) {
    console.error("❌  Refusing to continue: some @imported.nezal accounts are admins. Investigate first.")
    await mongoose.disconnect()
    process.exit(1)
  }

  if (args.commit) {
    const res = await users.updateMany({ ...matchImported, isImported: { $ne: true } }, { $set: { isImported: true } })
    await users.createIndex({ isImported: 1 })
    console.log(`\nUpdated ${res.modifiedCount} user(s); ensured index on isImported.`)
  }

  console.log(`\nDone. ${args.commit ? "Flagged" : "Would flag"}: ${toUpdate}`)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error("❌  Failed:", err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
