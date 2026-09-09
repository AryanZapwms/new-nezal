// app/api/cron/abandoned-cart-whatsapp/route.ts
//
// Finds carts that have items, have been idle REMINDER_DELAY_MINUTES+,
// have explicit WhatsApp consent (whatsappConsent: true — never true unless
// the customer actively checked the box in components/checkout-form.tsx),
// and haven't already been reminded — then fires an approved WhatsApp
// template message to the ones we can actually reach.
//
// "Reachable" means: a phone number is available, from either the cart's
// own guestPhone (captured at checkout, see app/api/cart/route.ts) or the
// logged-in user's User.phone — whichever is present, preferring guestPhone
// since it's the number tied to the actual consent action. A cart with
// consent but no phone at all (shouldn't happen once checkout always
// captures guestPhone before consent can be set, but defensively handled
// anyway) is counted under `unreachable`, not silently dropped or guessed
// at.
//
// Opt-out is checked against lib/models/whatsapp-opt-out.ts (phone-keyed,
// not cart-keyed — see that file for why) in one batched query rather than
// per-candidate.
//
// NOT wired into any scheduler yet (there's no cron-scheduling config in
// this repo at all — whatever triggers app/api/cron/abandoned-payments
// lives outside it). Call this manually with the CRON_SECRET bearer header
// to test until WhatsApp marketing consent for these numbers is confirmed.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { sendWhatsAppTemplate } from "@/lib/whatsapp"

const REMINDER_DELAY_MINUTES = 30 // wait this long since the cart's last real activity
const REMINDER_TEMPLATE_NAME = "cart_reminder" // must be Meta-approved first
const BATCH_SIZE = 100 // candidate carts inspected per run, not guaranteed sends

interface CronResult {
  cartId: string
  status: "sent" | "failed" | "skipped"
  reason?: string
  error?: string
}

// Same normalization used everywhere else this feature touches a phone
// number (sanitizeGuestPhone in lib/cart-server.ts, the webhook's opt-out
// handler) — last 10 digits, so a number stored with or without a country
// code still matches.
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10)
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const cutoff = new Date(Date.now() - REMINDER_DELAY_MINUTES * 60 * 1000)

  const candidates = await Cart.find({
    status: "active",
    "items.0": { $exists: true },
    lastActivityAt: { $lte: cutoff },
    whatsappConsent: true,
    whatsappReminderSentAt: null, // matches missing OR explicitly-null
  })
    .sort({ lastActivityAt: 1 }) // stalest first
    .limit(BATCH_SIZE)
    .populate("user", "name phone")
    .populate("items.product", "name")

  // Resolve a phone up front for every candidate, so opt-outs can be
  // checked in one batched query instead of one-by-one inside the loop.
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

  const results: CronResult[] = []
  let sentCount = 0
  let failedCount = 0
  let skippedGuestCount = 0
  let skippedNoPhoneCount = 0
  let skippedOptOutCount = 0

  for (const cart of candidates) {
    const user = cart.user as any // populated — see the .populate("user", "name phone") above
    const rawPhone = phoneByCartId.get(String(cart._id))

    if (!rawPhone) {
      if (!user) {
        skippedGuestCount++
        results.push({ cartId: String(cart._id), status: "skipped", reason: "guest cart — no phone captured yet" })
      } else {
        skippedNoPhoneCount++
        results.push({
          cartId: String(cart._id),
          status: "skipped",
          reason: "logged-in user has no phone on file or captured at checkout",
        })
      }
      continue
    }

    if (optedOutPhones.has(normalizePhone(rawPhone))) {
      skippedOptOutCount++
      results.push({ cartId: String(cart._id), status: "skipped", reason: "phone has opted out" })
      continue
    }

    const firstItem = cart.items[0] as any // populated .product
    const firstItemName = firstItem?.product?.name ?? "your items"

    try {
      await sendWhatsAppTemplate({
        phone: rawPhone,
        templateName: REMINDER_TEMPLATE_NAME,
        // Body placeholders — match the order defined when the template was
        // submitted for approval, e.g.:
        // "Hi {{1}}, you left {{2}} in your cart. Complete your order now!"
        variables: [user?.name ?? "there", firstItemName],
        buttonVariables: [
          {
            index: 0,
            sub_type: "url",
            text: `cart?ref=whatsapp&cart=${cart._id}`, // suffix appended to the template's base URL button
          },
        ],
      })

      await Cart.findByIdAndUpdate(cart._id, { whatsappReminderSentAt: new Date() })

      sentCount++
      results.push({ cartId: String(cart._id), status: "sent" })
    } catch (err) {
      failedCount++
      results.push({
        cartId: String(cart._id),
        status: "failed",
        error: err instanceof Error ? err.message : "unknown error",
      })
    }
  }

  return NextResponse.json({
    processed: candidates.length,
    sent: sentCount,
    failed: failedCount,
    skippedOptOut: skippedOptOutCount,
    unreachable: {
      guestCarts: skippedGuestCount,
      loggedInNoPhone: skippedNoPhoneCount,
    },
    results,
  })
}
