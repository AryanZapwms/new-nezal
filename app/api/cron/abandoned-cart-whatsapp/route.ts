// app/api/cron/abandoned-cart-whatsapp/route.ts
//
// Sends one WhatsApp reminder (ScaleChat template ecommerce_abandoned_cart)
// to each cart that has items, has explicit WhatsApp consent
// (whatsappConsent: true — only ever set by the customer ticking the box in
// components/whatsapp-discount-popup.tsx or components/checkout-form.tsx),
// and has sat idle for REMINDER_DELAY_MINUTES.
//
// Once per cart: the cart is claimed (whatsappReminderSentAt flipped from
// null) BEFORE the send, in one atomic update, so overlapping runs — or the
// two PM2 instances — can't both message it. A send ScaleChat refuses is
// retried on later runs, up to MAX_ATTEMPTS; a send with no clear answer is
// never retried, because the message may have gone out.
//
// Skipped, never messaged:
//   - no phone: neither the cart's own guestPhone (captured with the
//     consent, see app/api/cart/route.ts) nor the logged-in user's
//     User.phone. guestPhone wins when both exist — it's the number tied to
//     the actual consent action.
//   - opted out: the phone is in lib/models/whatsapp-opt-out.ts (phone-keyed,
//     not cart-keyed — see that file for why).
//   - ordered: the customer has placed an order since the cart was created.
//     Orders from our own checkout convert their cart on the spot, so this
//     mostly catches Shiprocket checkout orders, which only convert the cart
//     if the customer makes it back to /checkout/success.
//
// Test mode is the default — WHATSAPP_REMINDER_MODE must be exactly "live"
// to leave it. In test mode only carts whose phone is WHATSAPP_TEST_PHONE
// are loaded, and the same check runs again on every cart before the send.
//   ?dryRun=1        sends nothing and writes nothing; lists every cart the
//                    job would message once live.
//   ?delayMinutes=1  test mode only — shortens the 45-minute wait so a test
//                    cart doesn't have to sit that long.
//
// Every send attempt is saved to lib/models/whatsapp-message-log.ts and
// printed to the server log.
//
// Scheduling: nothing in this repo runs it (whatever triggers
// app/api/cron/abandoned-payments lives outside it too). On the VPS crontab:
//   */5 * * * * curl -sS -m 240 -w "\n" -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3005/api/cron/abandoned-cart-whatsapp >> /home/nezalherbocare.com/shared/logs/whatsapp-cron.log 2>&1
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Order } from "@/lib/models/order"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { WhatsAppMessageLog } from "@/lib/models/whatsapp-message-log"
import { getWhatsAppTestMode, sendWhatsAppTemplate, toWhatsAppPhone, ScaleChatError } from "@/lib/whatsapp"

const REMINDER_DELAY_MINUTES = 45 // wait this long since the cart's last real activity
// Upper bound on idleness, so switching the job on doesn't message everyone
// who abandoned a cart weeks ago.
const REMINDER_MAX_AGE_HOURS = 24
// Approved in ScaleChat as:
//   "Hi {{1}}, you left {{2}} in your cart. Complete your order now and get {{3}} off"
// Its "Complete order" button is a quick reply, so there are no button
// variables to send — app/api/webhooks/whatsapp answers the tap with the
// cart link.
const REMINDER_TEMPLATE = "ecommerce_abandoned_cart"
const REMINDER_LANGUAGE = "en"
// {{3}}. CART10 is a coupon set up in Shiprocket's checkout — the checkout
// the cart page opens — not one from our own Coupon collection, so the same
// code goes to everyone and nothing here can check it's still active.
const REMINDER_DISCOUNT = "10% (code CART10)"
const BATCH_SIZE = 100 // candidate carts inspected per run, not guaranteed sends
const MAX_ATTEMPTS = 3 // tries per cart when ScaleChat refuses the request
const MAX_CONSECUTIVE_FAILURES = 3 // then stop the run — ScaleChat is down or misconfigured

const SKIP_REASONS = {
  noPhone: "no phone number on the cart or the account",
  optedOut: "phone has opted out",
  ordered: "customer has placed an order since this cart was created",
  notTestNumber: "test mode — not the test number",
  claimed: "taken by another run, or the customer came back",
} as const

type SkipReason = keyof typeof SKIP_REASONS

interface CronResult {
  cartId: string
  phone?: string // masked
  status: "sent" | "failed" | "skipped" | "would_send"
  reason?: string
  error?: string
  variables?: string[]
}

// Same normalization used everywhere else this feature touches a phone
// number (sanitizeGuestPhone in lib/cart-server.ts, the webhook's opt-out
// handler) — last 10 digits, so a number stored with or without a country
// code still matches.
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10)
}

function maskPhone(raw: string): string {
  return `******${normalizePhone(raw).slice(-4)}`
}

// Meta rejects template variables containing newlines, tabs or runs of
// spaces, so whitespace is collapsed; the cap keeps one long product name
// from swallowing the message.
function cleanVariable(value: string, maxLength = 60): string {
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

// {{2}} — "Vitamin C Serum + 2 more".
function describeItems(items: any[]): string {
  // A product deleted since it was added populates as null.
  const names = items.map((item) => item.product?.name).filter(Boolean)
  if (names.length === 0) return "your items"
  const first = cleanVariable(names[0])
  return names.length > 1 ? `${first} + ${names.length - 1} more` : first
}

// A real purchase, as opposed to a payment the customer never finished —
// those leave an Order row behind too (CCAvenue creates it before the
// customer pays, Shiprocket for an unpaid prepaid checkout).
function isPlacedOrder(order: any): boolean {
  if (order.paymentStatus === "failed") return false
  if (order.paymentStatus !== "pending") return true // paid, or paid then refunded
  if (order.paymentMethod === "ccavenue") return false
  if (order.paymentMethod === "shiprocket_checkout") return order.shiprocketPaymentType === "cod"
  return true // cash on delivery
}

// Ids of the carts whose customer — matched by cart, account or phone — has
// placed an order since the cart was created. One query for the whole batch.
async function findOrderedCartIds(carts: any[], phoneByCartId: Map<string, string>): Promise<Set<string>> {
  const ordered = new Set<string>()
  if (carts.length === 0) return ordered

  // Orders store a bare 10-digit phone (sanitizePhone in app/api/orders/route.ts
  // and lib/shiprocket-checkout-order.ts), the same form normalizePhone gives.
  const phones = Array.from(new Set(Array.from(phoneByCartId.values()).map(normalizePhone)))
  const earliestCart = new Date(Math.min(...carts.map((cart) => new Date(cart.createdAt).getTime())))

  const orders: any[] = await Order.find({
    createdAt: { $gte: earliestCart },
    $or: [
      { cartId: { $in: carts.map((cart) => cart._id) } },
      { user: { $in: carts.map((cart) => cart.user?._id).filter(Boolean) } },
      { guestPhone: { $in: phones } },
      { "shippingAddress.phone": { $in: phones } },
    ],
  })
    .select("user cartId guestPhone shippingAddress.phone createdAt paymentStatus paymentMethod shiprocketPaymentType")
    .lean()

  for (const cart of carts) {
    const cartId = String(cart._id)
    const userId = cart.user?._id ? String(cart.user._id) : null
    const rawPhone = phoneByCartId.get(cartId)
    const phone = rawPhone ? normalizePhone(rawPhone) : null
    const cartCreatedAt = new Date(cart.createdAt).getTime()

    const hasOrder = orders.some(
      (order) =>
        isPlacedOrder(order) &&
        new Date(order.createdAt).getTime() >= cartCreatedAt &&
        (String(order.cartId) === cartId ||
          (userId !== null && String(order.user) === userId) ||
          (phone !== null &&
            [order.guestPhone, order.shippingAddress?.phone].some((p) => p && normalizePhone(p) === phone))),
    )
    if (hasOrder) ordered.add(cartId)
  }

  return ordered
}

async function logSend(entry: {
  cart: unknown
  phone: string
  variables: string[]
  mode: "test" | "live"
  status: "sent" | "failed"
  attempt: number
  error?: string
  response?: unknown
}) {
  const line = `[abandoned-cart-whatsapp] ${entry.status} cart=${entry.cart} phone=${maskPhone(entry.phone)} mode=${entry.mode} attempt=${entry.attempt}`
  if (entry.status === "sent") console.log(line)
  else console.error(`${line} error=${entry.error}`)

  try {
    await WhatsAppMessageLog.create({ ...entry, templateName: REMINDER_TEMPLATE })
  } catch (err) {
    // The line above already recorded it — a logging failure must not stop
    // the remaining sends.
    console.error("[abandoned-cart-whatsapp] failed to save message log:", err)
  }
}

export async function GET(request: NextRequest) {
  // `!cronSecret` matters: with CRON_SECRET unset, the comparison alone
  // would accept the literal header "Bearer undefined".
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const dryRun = params.get("dryRun") === "1"
  const { testMode, testPhone } = getWhatsAppTestMode()
  const mode: "test" | "live" = testMode ? "test" : "live"

  if (!dryRun) {
    const problem = !process.env.SCALECHAT_API_KEY
      ? "SCALECHAT_API_KEY is not set"
      : testMode && testPhone.length !== 10
        ? "test mode needs WHATSAPP_TEST_PHONE (or set WHATSAPP_REMINDER_MODE=live to message customers)"
        : null
    if (problem) {
      console.error(`[abandoned-cart-whatsapp] not running: ${problem}`)
      return NextResponse.json({ error: problem }, { status: 500 })
    }
  }

  await connectDB()

  const requestedDelay = testMode ? Number.parseFloat(params.get("delayMinutes") ?? "") : NaN
  const delayMinutes = requestedDelay >= 0 ? requestedDelay : REMINDER_DELAY_MINUTES

  const now = Date.now()
  const idleSince = new Date(now - delayMinutes * 60 * 1000)
  const notOlderThan = new Date(now - REMINDER_MAX_AGE_HOURS * 60 * 60 * 1000)

  const filter: Record<string, unknown> = {
    status: "active",
    "items.0": { $exists: true },
    lastActivityAt: { $lte: idleSince, $gte: notOlderThan },
    whatsappConsent: true,
    whatsappReminderSentAt: null, // matches missing OR explicitly-null
  }
  // A real test-mode run never even loads anyone else's cart. (A dry run
  // does, to preview the live audience — it can't send.)
  if (testMode && !dryRun) filter.guestPhone = testPhone

  const candidates = await Cart.find(filter)
    .sort({ lastActivityAt: 1 }) // stalest first
    .limit(BATCH_SIZE)
    .populate("user", "name phone")
    .populate("items.product", "name")

  // Resolve a phone up front for every candidate, so opt-outs and orders can
  // each be checked in one batched query instead of one-by-one in the loop.
  const phoneByCartId = new Map<string, string>() // cartId -> raw (un-normalized) phone
  for (const cart of candidates) {
    const user = cart.user as any
    const rawPhone = (cart as any).guestPhone || user?.phone
    if (rawPhone) phoneByCartId.set(String(cart._id), rawPhone)
  }

  const normalizedPhones = Array.from(new Set(Array.from(phoneByCartId.values()).map(normalizePhone)))
  const optedOutDocs = normalizedPhones.length
    ? await WhatsAppOptOut.find({ phone: { $in: normalizedPhones } }).select("phone")
    : []
  const optedOutPhones = new Set(optedOutDocs.map((d: any) => d.phone))

  const orderedCartIds = await findOrderedCartIds(candidates, phoneByCartId)

  const results: CronResult[] = []
  const skipped: Record<SkipReason, number> = { noPhone: 0, optedOut: 0, ordered: 0, notTestNumber: 0, claimed: 0 }
  let sentCount = 0
  let failedCount = 0
  let consecutiveFailures = 0
  let stoppedEarly = false

  for (const cart of candidates) {
    const cartId = String(cart._id)
    const user = cart.user as any // populated — see the .populate("user", "name phone") above
    const rawPhone = phoneByCartId.get(cartId)
    const maskedPhone = rawPhone ? maskPhone(rawPhone) : undefined

    const skip = (reason: SkipReason, variables?: string[]) => {
      skipped[reason]++
      results.push({ cartId, phone: maskedPhone, status: "skipped", reason: SKIP_REASONS[reason], variables })
    }

    if (!rawPhone) {
      skip("noPhone")
      continue
    }
    if (optedOutPhones.has(normalizePhone(rawPhone))) {
      skip("optedOut")
      continue
    }
    if (orderedCartIds.has(cartId)) {
      skip("ordered")
      continue
    }

    // Body placeholders, in the order the template was approved with.
    const variables = [
      cleanVariable((user?.name ?? "").trim().split(/\s+/)[0]) || "there",
      describeItems(cart.items as any[]),
      REMINDER_DISCOUNT,
    ]

    // The hard stop for test mode: checked on every cart, however it was
    // loaded. A dry run still reports what the cart would have been sent.
    if (testMode && normalizePhone(rawPhone) !== testPhone) {
      skip("notTestNumber", variables)
      continue
    }

    if (dryRun) {
      results.push({ cartId, phone: maskedPhone, status: "would_send", variables })
      continue
    }

    // Claim before sending — only the run that flips whatsappReminderSentAt
    // from null gets to send. Re-checking status and lastActivityAt here
    // also drops a cart whose customer ordered or came back since the query
    // above.
    const claimed = await Cart.findOneAndUpdate(
      { _id: cart._id, status: "active", whatsappReminderSentAt: null, lastActivityAt: { $lte: idleSince } },
      { $set: { whatsappReminderSentAt: new Date() }, $inc: { whatsappReminderAttempts: 1 } },
      { returnDocument: "after" },
    )
    if (!claimed) {
      skip("claimed")
      continue
    }

    const attempt: number = (claimed as any).whatsappReminderAttempts
    const logEntry = { cart: cart._id, phone: toWhatsAppPhone(rawPhone), variables, mode, attempt }

    try {
      const response = await sendWhatsAppTemplate({
        phone: rawPhone,
        templateName: REMINDER_TEMPLATE,
        language: REMINDER_LANGUAGE,
        variables,
      })

      sentCount++
      consecutiveFailures = 0
      await logSend({ ...logEntry, status: "sent", response })
      results.push({ cartId, phone: maskedPhone, status: "sent", variables })
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown error"

      // Only a request ScaleChat explicitly refused is safe to try again.
      // Otherwise the cart stays claimed: a lost reminder beats a duplicate.
      if (err instanceof ScaleChatError && err.rejected && attempt < MAX_ATTEMPTS) {
        await Cart.updateOne({ _id: cart._id }, { $set: { whatsappReminderSentAt: null } })
      }

      failedCount++
      consecutiveFailures++
      await logSend({ ...logEntry, status: "failed", error })
      results.push({ cartId, phone: maskedPhone, status: "failed", error, variables })

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        stoppedEarly = true
        console.error(`[abandoned-cart-whatsapp] stopping this run after ${consecutiveFailures} failures in a row`)
        break
      }
    }
  }

  if (candidates.length > 0) {
    console.log(
      `[abandoned-cart-whatsapp] mode=${mode} dryRun=${dryRun} processed=${candidates.length} sent=${sentCount} failed=${failedCount} skipped=${JSON.stringify(skipped)}`,
    )
  }

  return NextResponse.json({
    mode,
    dryRun,
    processed: candidates.length,
    sent: sentCount,
    failed: failedCount,
    skipped,
    stoppedEarly,
    results,
  })
}
