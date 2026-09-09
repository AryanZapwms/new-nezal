// app/api/cart/claim-discount/route.ts
//
// Powers components/whatsapp-discount-popup.tsx (cart page). Saves
// guestPhone + whatsappConsent onto the visitor's cart — same fields/model
// the checkout-form.tsx consent checkbox writes to (lib/models/cart.ts) —
// then, unless this phone already claimed a discount before
// (lib/models/whatsapp-discount-claim.ts), issues a one-time coupon
// through the existing Coupon system (lib/models/coupon.ts): the same
// model admin-created coupons use (app/api/coupons/route.ts), just created
// programmatically here instead of through the admin UI.
//
// Judgment calls made without an explicit spec (flagged in chat) —
// discount is 10% (matches the popup copy), one-time (maxUses: 1),
// expires in 14 days. Change the constants below if these aren't right.
//
// Does NOT send the code via WhatsApp — lib/whatsapp.ts's
// sendWhatsAppTemplate requires a Meta-approved template, and no template
// for "here's your discount code" exists yet (cart_reminder is a different
// message). Creating one needs external Meta approval, which is new
// infrastructure outside this change — showing the code on-screen is the
// v1 delivery mechanism, as scoped.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Coupon } from "@/lib/models/coupon"
import { WhatsAppDiscountClaim } from "@/lib/models/whatsapp-discount-claim"
import {
  resolveCartIdentity,
  getOrCreateActiveCart,
  sanitizeGuestPhone,
  setCartTokenCookie,
} from "@/lib/cart-server"

const DISCOUNT_TYPE = "percentage" as const
const DISCOUNT_VALUE = 10
const DISCOUNT_MAX_USES = 1
const DISCOUNT_EXPIRY_DAYS = 14
const CODE_PREFIX = "WHATSAPP10"

// ─── IP rate limiting (stopgap until real OTP verification exists) ────────
// This is IP-based, not phone-based: it caps how many claims one IP can
// make, but proves nothing about whether the submitter actually owns the
// phone number typed in — someone can still enter an arbitrary number, or
// spread attempts across several IPs. OTP verification (planned
// separately) is the real fix for phone ownership; this only stops the
// cheap version of the abuse (one script hammering this endpoint).
//
// In-memory only, per the existing precedent in
// app/api/auth/register/route.ts (same Map-based approach, same
// x-forwarded-for/x-real-ip header reading) — resets on deploy/restart and
// isn't shared across server instances. Acceptable here since this is a
// soft cap, not a security boundary. Unlike that route's fixed-window
// counter, this tracks a rolling 24h window of actual timestamps (per this
// task's spec), pruning entries older than the window on every check.
const RATE_LIMIT_MAX_CLAIMS = 5
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

const claimTimestampsByIp = new Map<string, number[]>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const recent = (claimTimestampsByIp.get(ip) ?? []).filter((t) => t > cutoff)

  if (recent.length >= RATE_LIMIT_MAX_CLAIMS) {
    claimTimestampsByIp.set(ip, recent) // still save the pruned list even on rejection
    return true
  }

  recent.push(now)
  claimTimestampsByIp.set(ip, recent)
  return false
}

function generateCouponCode(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0")
  return `${CODE_PREFIX}-${random}`
}

async function createUniqueCoupon() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Coupon.create({
        code: generateCouponCode(),
        discountType: DISCOUNT_TYPE,
        discountValue: DISCOUNT_VALUE,
        maxUses: DISCOUNT_MAX_USES,
        expiresAt: new Date(Date.now() + DISCOUNT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        isActive: true,
      })
    } catch (err: any) {
      if (err?.code === 11000) continue // code collision — vanishingly unlikely; just retry
      throw err
    }
  }
  throw new Error("Failed to generate a unique coupon code")
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts, please try again later." },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => ({}))

    const cleanPhone = sanitizeGuestPhone(body?.phone)
    if (!cleanPhone) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number." }, { status: 400 })
    }
    // Defensive server-side check, independent of the UI disabling the
    // button until checked — this endpoint must never issue a coupon
    // without explicit consent, no matter what calls it.
    if (body?.whatsappConsent !== true) {
      return NextResponse.json({ error: "Consent is required to claim this discount." }, { status: 400 })
    }

    await connectDB()

    // Same phone, already claimed before (any cart, any session, possibly
    // even before this browser's current cart existed) — hand back the
    // existing code instead of minting a second one.
    const existingClaim = await WhatsAppDiscountClaim.findOne({ phone: cleanPhone })

    const identity = await resolveCartIdentity(request)
    const { cart, newGuestToken } = await getOrCreateActiveCart(identity)
    ;(cart as any).guestPhone = cleanPhone
    ;(cart as any).whatsappConsent = true
    cart.lastActivityAt = new Date()
    await cart.save()

    if (existingClaim) {
      const res = NextResponse.json({
        success: true,
        alreadyClaimed: true,
        code: existingClaim.couponCode,
        discountType: DISCOUNT_TYPE,
        discountValue: DISCOUNT_VALUE,
      })
      if (newGuestToken) setCartTokenCookie(res, newGuestToken)
      return res
    }

    const coupon = await createUniqueCoupon()

    let claim
    try {
      claim = await WhatsAppDiscountClaim.create({ phone: cleanPhone, couponCode: coupon.code })
    } catch (err: any) {
      if (err?.code === 11000) {
        // Lost a race — another request for this same phone (double-click,
        // two tabs) claimed a moment ago. The coupon we just made is
        // orphaned but harmless (unused, single-use) — hand back the
        // winner's code instead of ours.
        const winner = await WhatsAppDiscountClaim.findOne({ phone: cleanPhone })
        if (winner) {
          const res = NextResponse.json({
            success: true,
            alreadyClaimed: true,
            code: winner.couponCode,
            discountType: DISCOUNT_TYPE,
            discountValue: DISCOUNT_VALUE,
          })
          if (newGuestToken) setCartTokenCookie(res, newGuestToken)
          return res
        }
      }
      throw err
    }

    const res = NextResponse.json({
      success: true,
      alreadyClaimed: false,
      code: claim.couponCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    })
    if (newGuestToken) setCartTokenCookie(res, newGuestToken)
    return res
  } catch (error) {
    console.error("Error claiming WhatsApp discount:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
