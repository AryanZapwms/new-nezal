// lib/coupon-server.ts
//
// Shared coupon eligibility + redemption logic, used by:
//   - app/api/coupons/validate/route.ts — preview only, no mutation, called
//     when the user types a code at checkout.
//   - app/api/orders/route.ts (COD/CCAvenue) and
//     app/api/razorpay/verify-payment/route.ts — server-side re-validation
//     at order-creation/payment-verification time. NEVER trust a discount
//     amount echoed back by the client — recompute it here from the live
//     Coupon record against the server-verified cart total.
//   - app/api/coupons/redeem/route.ts, app/api/orders/route.ts (COD),
//     app/api/razorpay/verify-payment/route.ts, and
//     app/api/ccavenue/response/route.ts — the atomic usedCount increment,
//     called only once a purchase is actually confirmed (see redeemCoupon).
//
// Kept as one module (not copy-pasted per route) so the eligibility rules
// can't drift between the "preview" and "charge" paths — that exact drift
// (order-creation recomputing the total without ever consulting the coupon)
// is what caused CCAvenue to receive the pre-discount amount.
import { Coupon } from "@/lib/models/coupon"

export interface CouponValidationResult {
  valid: boolean
  error?: string
  coupon?: any
  discountAmount?: number
}

/**
 * Checks a coupon's eligibility against a server-computed cart total and
 * returns the discount to apply. Read-only — does not touch usedCount.
 */
export async function validateCouponServerSide(
  rawCode: string,
  cartTotal: number,
): Promise<CouponValidationResult> {
  const code = String(rawCode ?? "").trim().toUpperCase()
  if (!code) return { valid: false, error: "Enter a coupon code." }

  const coupon = await Coupon.findOne({ code })
  if (!coupon) return { valid: false, error: "Invalid coupon code." }
  if (!coupon.isActive) return { valid: false, error: "This coupon is no longer active." }

  const now = new Date()
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, error: "This coupon is not active yet." }
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, error: "This coupon has expired." }
  }
  if (coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "This coupon has reached its usage limit." }
  }
  if (coupon.minOrderValue && (cartTotal ?? 0) < coupon.minOrderValue) {
    return {
      valid: false,
      error: `This coupon requires a minimum order of ₹${coupon.minOrderValue}.`,
    }
  }

  const discountAmount =
    coupon.discountType === "percentage"
      ? Math.round(((cartTotal ?? 0) * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, cartTotal ?? 0)

  return { valid: true, coupon, discountAmount }
}

/**
 * Atomically increments usedCount, but only if usedCount < maxUses at the
 * moment of the write — avoids the race where two customers redeem the
 * last available use at the same time and both succeed. Call ONLY once a
 * purchase is actually confirmed (see call sites listed above) — never on
 * the "preview the discount" step.
 */
export async function redeemCoupon(
  rawCode: string,
): Promise<{ success: boolean; error?: string; coupon?: any }> {
  const code = String(rawCode ?? "").trim().toUpperCase()
  const coupon = await Coupon.findOneAndUpdate(
    { code, isActive: true, $expr: { $lt: ["$usedCount", "$maxUses"] } },
    { $inc: { usedCount: 1 } },
    { new: true },
  )
  if (!coupon) {
    return {
      success: false,
      error: "This coupon could not be redeemed — it may have just reached its usage limit.",
    }
  }
  return { success: true, coupon }
}
