// app/api/webhooks/whatsapp/[secret]/route.ts
//
// Register this URL once via ScaleChat's webhook API:
//   POST https://scalechat.in/api/v1/webhooks
//   { "url": "https://nezalherbocare.com/api/webhooks/whatsapp/WHATSAPP_WEBHOOK_SECRET_VALUE",
//     "events": ["message.received", "message.status", "contact.created"] }
//
// Auth: ScaleChat's webhook registration API (POST /webhooks) only accepts
// {url, events} — no custom header or secret field, so a shared-secret
// header (the pattern used for Shiprocket's webhook, see
// app/api/webhooks/shipment-updates/route.ts) can never actually be
// satisfied by real ScaleChat traffic. Instead the secret lives in the URL
// path itself: the segment after /whatsapp/ must match
// WHATSAPP_WEBHOOK_SECRET, checked below. Swap for real signature/HMAC
// verification if ScaleChat ever adds one.
//
// What an inbound message can do here:
//   STOP / UNSUBSCRIBE  opt the phone out of reminders
//   START               opt it back in
//   Complete order      the reminder template's quick-reply button — answered
//                       with a link to the customer's cart
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { BRAND } from "@/lib/config"
import { Cart } from "@/lib/models/cart"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { getWhatsAppTestMode, sendWhatsAppText } from "@/lib/whatsapp"

// The label of the quick-reply button on ecommerce_abandoned_cart, lowercased.
const COMPLETE_ORDER_BUTTON = "complete order"

function firstString(...values: unknown[]): string {
  const found = values.find((value) => typeof value === "string" && value.trim())
  return typeof found === "string" ? found.trim() : ""
}

function maskPhone(last10: string): string {
  return `******${last10.slice(-4)}`
}

// The reminder's "Complete order" button is a quick reply: tapping it only
// sends us that text, so the link has to come from here. Plain text is
// allowed because the tap opens WhatsApp's 24-hour reply window.
async function replyWithCartLink(phone: string) {
  const { testMode, testPhone } = getWhatsAppTestMode()
  if (testMode && phone !== testPhone) {
    console.log(`[whatsapp-webhook] cart link not sent to ${maskPhone(phone)}: test mode`)
    return
  }

  // The cart the reminder was about — reminded carts sort first, then the
  // most recently used.
  const cart: any = await Cart.findOne({ guestPhone: phone, status: "active" })
    .sort({ whatsappReminderSentAt: -1, lastActivityAt: -1 })
    .select("guestToken")
    .lean()

  // A guest cart lives in one browser, and WhatsApp may open the link in a
  // different one — app/api/cart/recover carries the cart across. An
  // account's cart follows the login, so plain /cart is enough for those.
  const link = cart?.guestToken
    ? `${BRAND.domain}/api/cart/recover?token=${cart.guestToken}`
    : `${BRAND.domain}/cart`

  try {
    await sendWhatsAppText(phone, `Your cart is saved. Complete your order here: ${link}`)
    console.log(`[whatsapp-webhook] cart link sent to ${maskPhone(phone)}`)
  } catch (err) {
    // Swallowed: a non-200 here would only make ScaleChat redeliver the tap.
    console.error(`[whatsapp-webhook] cart link to ${maskPhone(phone)} failed:`, err)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params
  if (secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    console.warn("WhatsApp webhook: invalid or missing secret")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ScaleChat's docs don't show the exact envelope shape for webhook
  // deliveries, so fields are looked for in the places they plausibly sit.
  // The log lines below print the keys actually received (never the message
  // itself) — tighten the lookups once real deliveries confirm them.
  const eventType = payload?.event ?? payload?.type
  const data = payload?.data ?? {}
  console.log(
    `[whatsapp-webhook] event=${eventType} keys=${Object.keys(payload ?? {}).join(",")} dataKeys=${Object.keys(data).join(",")}`,
  )

  await connectDB()

  switch (eventType) {
    case "message.status": {
      // e.g. { event: "message.status", data: { phone, status: "delivered" | "read" | "failed", ... } }
      // Useful to track WhatsApp reminder delivery/read rate per cart if you
      // store a reference id when sending (consider adding a `reference_id`
      // param if ScaleChat supports it, or match by phone + recent timestamp).
      break
    }
    case "message.received": {
      // Incoming numbers arrive however ScaleChat/WhatsApp formats them
      // (typically with country code); everywhere else in the app stores
      // a bare 10-digit number (see sanitizePhone in app/api/orders/route.ts
      // and sanitizeGuestPhone in lib/cart-server.ts), so normalize to the
      // last 10 digits to match that same canonical form.
      const phone = firstString(data.phone, data.from).replace(/\D/g, "").slice(-10)
      // Letters only, so "STOP." or "Stop!" still count.
      const text = firstString(
        data.message,
        data.text,
        data.message?.text,
        data.message?.body,
        data.text?.body,
        data.button?.text,
        data.button_text,
      )
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .trim()

      if (phone.length !== 10) {
        console.warn("[whatsapp-webhook] message.received with no usable phone number — ignored")
        break
      }

      // Opt-out is keyed purely by phone (lib/models/whatsapp-opt-out.ts),
      // not by Cart or User, so it survives a cart converting and a new one
      // starting.
      if (["stop", "unsubscribe"].includes(text)) {
        await WhatsAppOptOut.updateOne(
          { phone },
          { $set: { phone, optedOutAt: new Date() } },
          { upsert: true },
        )
        console.log(`[whatsapp-webhook] opt-out recorded for ${maskPhone(phone)}`)
      } else if (text === "start") {
        await WhatsAppOptOut.deleteOne({ phone })
        console.log(`[whatsapp-webhook] opt-out removed for ${maskPhone(phone)}`)
      } else if (text === COMPLETE_ORDER_BUTTON) {
        await replyWithCartLink(phone)
      } else {
        console.log(`[whatsapp-webhook] message from ${maskPhone(phone)} matched nothing (text found: ${text !== ""})`)
      }
      break
    }
    case "contact.created":
      break
  }

  return NextResponse.json({ received: true })
}
