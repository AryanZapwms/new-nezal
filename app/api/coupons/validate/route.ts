// app/api/coupons/validate/route.ts
//
// POST /api/coupons/validate
// Body: { code: string, cartTotal: number }
//
// Checks a coupon code WITHOUT consuming a use — called when the user
// types a code at checkout, before placing the order. Returns the
// computed discount so the UI can show it live. The actual usedCount
// increment happens separately via redeemCoupon() (lib/coupon-server.ts),
// called only AFTER the order is successfully placed/paid — see
// app/api/orders/route.ts, app/api/razorpay/verify-payment/route.ts, and
// app/api/ccavenue/response/route.ts.
//
// Eligibility rules live in lib/coupon-server.ts's validateCouponServerSide,
// shared with the order-creation/payment-verification routes so this
// "preview" check can never drift from what actually gets charged.

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { validateCouponServerSide } from "@/lib/coupon-server"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { code, cartTotal } = await req.json()

    const result = await validateCouponServerSide(code, cartTotal ?? 0)
    if (!result.valid) {
      const status = result.error === "Invalid coupon code." ? 404 : 400
      return NextResponse.json({ valid: false, error: result.error }, { status })
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      discountAmount: result.discountAmount,
      remainingUses: result.coupon.maxUses - result.coupon.usedCount,
    })
  } catch (error) {
    console.error("[coupons/validate] POST error:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}