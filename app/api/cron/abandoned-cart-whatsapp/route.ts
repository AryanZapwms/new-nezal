// app/api/cron/abandoned-cart-whatsapp/route.ts
//
// Finds carts that have items, have been idle REMINDER_DELAY_MINUTES+,
// have explicit WhatsApp consent (whatsappConsent: true — never true unless
// the customer actively checked the box in components/checkout-form.tsx),
// and haven't already been reminded — then fires an approved WhatsApp
// template message to the ones we can actually reach.
//
// Two templates, chosen per cart: if any item carries a flash-sale snapshot
// (cartItemSchema.flashSale in lib/models/cart.ts) whose endsAt hasn't
// passed yet, ecommerce_abandoned_cart goes out quoting that discount —
// otherwise the plain cart_reminder_plain nudge. When more than one item
// qualifies, the first one (array order) is used; when none do, the first
// item in the cart is used same as before. An on-sale item is preferred
// over the cart's literal first item as the one named in the message,
// since the discount is the stronger hook.
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
const REMINDER_TEMPLATE_DISCOUNT = "ecommerce_abandoned_cart" // must be Meta-approved first
const REMINDER_TEMPLATE_PLAIN = "cart_reminder_plain" // must be Meta-approved first
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

// First item (array order) whose flash-sale snapshot hasn't expired yet.
// The snapshot is point-in-time (see cartItemSchema.flashSale in
// lib/models/cart.ts) — it doesn't carry an isActive flag, so "still on
// sale" is just endsAt being in the future.
function findActiveFlashSaleItem(items: any[]): any | undefined {
  const now = Date.now()
  return items.find((item) => item.flashSale?.endsAt && new Date(item.flashSale.endsAt).getTime() > now)
}

// Short human date for the WhatsApp template body, e.g. "15 Sep".
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
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

    const items = cart.items as any[] // populated .product
    const saleItem = findActiveFlashSaleItem(items)
    // The on-sale item is the stronger hook, so it's named in the message
    // over the cart's literal first item when both are available.
    const featuredItem = saleItem ?? items[0]
    const featuredItemName = featuredItem?.product?.name ?? "your items"

    const templateName = saleItem ? REMINDER_TEMPLATE_DISCOUNT : REMINDER_TEMPLATE_PLAIN
    const variables = saleItem
      ? [
          user?.name ?? "there",
          featuredItemName,
          `${saleItem.flashSale.discountPercent}%`,
          formatShortDate(new Date(saleItem.flashSale.endsAt)),
        ]
      : [user?.name ?? "there", featuredItemName]

    try {
      await sendWhatsAppTemplate({
        phone: rawPhone,
        templateName,
        // Body placeholders — match the order defined when each template was
        // submitted for approval, e.g.:
        // discount: "Hi {{1}}, {{2}} in your cart is {{3}} off until {{4}}!"
        // plain:    "Hi {{1}}, you left {{2}} in your cart. Complete your order now!"
        variables,
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
