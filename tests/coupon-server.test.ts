// Unit/integration tests for lib/coupon-server.ts — the module shared by
// /api/coupons/validate (client "Apply" preview), /api/orders (COD/
// CCAvenue), /api/razorpay/verify-payment, and /api/ccavenue/response
// (redemption). Two things matter most here, because they're exactly what
// the original CCAvenue bug and its fix hinge on:
//   1. The discount math validateCouponServerSide returns must match what
//      app/checkout/page.tsx displays to the customer — any divergence
//      would reintroduce a version of "the number you saw isn't the number
//      you paid." Since /api/coupons/validate now calls this same function
//      (see its refactor), proving parity here proves it for every caller.
//   2. redeemCoupon's atomic increment must actually be race-safe under
//      concurrency — that's the whole reason maxUses enforcement works at
//      all now (it didn't before this fix; the endpoint existed but was
//      never called by any checkout flow).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { Coupon } from "@/lib/models/coupon"
import { validateCouponServerSide, redeemCoupon } from "@/lib/coupon-server"
import { connectTestDb, disconnectTestDb } from "./setup-db"

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Coupon.deleteMany({})
})

// Mirrors app/checkout/page.tsx's couponData.discountAmount math exactly
// (see handleApplyCoupon / the /api/coupons/validate response it consumes).
// Kept as an independent re-implementation here, deliberately NOT imported
// from lib/coupon-server.ts, so this test can't pass merely because both
// sides reference the same code — it has to independently compute the same
// number.
function clientReferenceDiscount(
  cartTotal: number,
  discountType: "percentage" | "flat",
  discountValue: number,
): number {
  return discountType === "percentage"
    ? Math.round((cartTotal * discountValue) / 100)
    : Math.min(discountValue, cartTotal)
}

describe("validateCouponServerSide — discount math parity with the client", () => {
  it("percentage discount matches the client's rounding for a whole-rupee cart total", async () => {
    await Coupon.create({ code: "TEN", discountType: "percentage", discountValue: 10, maxUses: 100 })

    const cartTotal = 521.72
    const result = await validateCouponServerSide("TEN", cartTotal)

    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(clientReferenceDiscount(cartTotal, "percentage", 10))
    expect(result.discountAmount).toBe(52) // Math.round(52.172) — the exact THANKYOU10-style case from the bug report
  })

  it("percentage discount rounds the same way at a half-paisa boundary", async () => {
    await Coupon.create({ code: "HALF", discountType: "percentage", discountValue: 25, maxUses: 100 })

    // 25% of 402 is exactly 100.5 — round-half-up should land on 101, matching
    // the client's Math.round (not banker's rounding, which would land on 100).
    const cartTotal = 402
    const result = await validateCouponServerSide("HALF", cartTotal)

    expect(result.discountAmount).toBe(clientReferenceDiscount(cartTotal, "percentage", 25))
    expect(result.discountAmount).toBe(101)
  })

  it("flat discount matches the client's min(discountValue, cartTotal) clamp", async () => {
    await Coupon.create({ code: "FLAT100", discountType: "flat", discountValue: 100, maxUses: 100 })

    const belowValue = await validateCouponServerSide("FLAT100", 500)
    expect(belowValue.discountAmount).toBe(clientReferenceDiscount(500, "flat", 100))
    expect(belowValue.discountAmount).toBe(100)

    // Cart smaller than the flat discount — clamps to the cart total, same as client
    const aboveValue = await validateCouponServerSide("FLAT100", 60)
    expect(aboveValue.discountAmount).toBe(clientReferenceDiscount(60, "flat", 100))
    expect(aboveValue.discountAmount).toBe(60)
  })

  it("rejects with the same eligibility rules the old validate route used (expired/inactive/limit/minOrder)", async () => {
    await Coupon.create({
      code: "EXPIRED",
      discountType: "percentage",
      discountValue: 10,
      maxUses: 100,
      expiresAt: new Date(Date.now() - 1000),
    })
    await Coupon.create({ code: "OFF", discountType: "percentage", discountValue: 10, maxUses: 100, isActive: false })
    await Coupon.create({ code: "USEDUP", discountType: "percentage", discountValue: 10, maxUses: 1, usedCount: 1 })
    await Coupon.create({ code: "MINORDER", discountType: "percentage", discountValue: 10, maxUses: 100, minOrderValue: 1000 })

    expect((await validateCouponServerSide("EXPIRED", 500)).valid).toBe(false)
    expect((await validateCouponServerSide("OFF", 500)).valid).toBe(false)
    expect((await validateCouponServerSide("USEDUP", 500)).valid).toBe(false)
    expect((await validateCouponServerSide("MINORDER", 500)).valid).toBe(false)
    expect((await validateCouponServerSide("NOSUCHCODE", 500)).valid).toBe(false)
  })
})

describe("redeemCoupon — atomic behavior under a simulated race", () => {
  it("exactly one of several concurrent redeems succeeds when only one use is left", async () => {
    await Coupon.create({ code: "LASTSLOT", discountType: "percentage", discountValue: 10, maxUses: 5, usedCount: 4 })

    const results = await Promise.all(
      Array.from({ length: 5 }, () => redeemCoupon("LASTSLOT")),
    )

    const succeeded = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(4)
    failed.forEach((r) => expect(r.error).toMatch(/usage limit/i))

    const coupon = await Coupon.findOne({ code: "LASTSLOT" })
    expect(coupon!.usedCount).toBe(5) // never overshoots maxUses, regardless of how many raced
  })

  it("never lets usedCount exceed maxUses even with more concurrent callers than remaining slots", async () => {
    await Coupon.create({ code: "TWOSLOTS", discountType: "flat", discountValue: 50, maxUses: 2, usedCount: 0 })

    const results = await Promise.all(
      Array.from({ length: 10 }, () => redeemCoupon("TWOSLOTS")),
    )

    expect(results.filter((r) => r.success)).toHaveLength(2)
    expect(results.filter((r) => !r.success)).toHaveLength(8)

    const coupon = await Coupon.findOne({ code: "TWOSLOTS" })
    expect(coupon!.usedCount).toBe(2)
  })

  it("fails cleanly (no throw, no write) when the coupon doesn't exist or is inactive", async () => {
    const missing = await redeemCoupon("DOES-NOT-EXIST")
    expect(missing.success).toBe(false)

    await Coupon.create({ code: "INACTIVE", discountType: "percentage", discountValue: 10, maxUses: 5, isActive: false })
    const inactive = await redeemCoupon("INACTIVE")
    expect(inactive.success).toBe(false)

    const coupon = await Coupon.findOne({ code: "INACTIVE" })
    expect(coupon!.usedCount).toBe(0)
  })
})
