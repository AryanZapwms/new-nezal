// app/api/coupons/redeem/route.ts
//
// POST /api/coupons/redeem
// Body: { code: string }
//
// Thin wrapper around redeemCoupon() (lib/coupon-server.ts) — the same
// atomic, race-safe usedCount increment that app/api/orders/route.ts (COD),
// app/api/razorpay/verify-payment/route.ts, and
// app/api/ccavenue/response/route.ts now call directly once a purchase is
// confirmed. This HTTP route itself isn't called by any current checkout
// flow (server-to-server callers use redeemCoupon() directly to avoid a
// self-fetch) — kept standalone in case an admin tool or future flow needs
// to redeem a code without going through order creation.
//
// IMPORTANT: call this (or redeemCoupon() directly) ONLY after the order
// has actually been confirmed — never on the "preview the discount" step,
// or someone could burn through all uses just by typing the code in and
// out of the checkout field without ever actually buying anything.

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { redeemCoupon } from "@/lib/coupon-server"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ success: false, error: "Coupon code is required." }, { status: 400 })
    }

    const result = await redeemCoupon(code)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      remainingUses: result.coupon.maxUses - result.coupon.usedCount,
    })
  } catch (error) {
    console.error("[coupons/redeem] POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}