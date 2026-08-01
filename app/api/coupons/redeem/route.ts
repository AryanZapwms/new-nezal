// app/api/coupons/redeem/route.ts
//
// POST /api/coupons/redeem
// Body: { code: string }
//
// Atomically increments usedCount, but ONLY if usedCount < maxUses at
// the moment of the update. This is a single atomic MongoDB operation
// (findOneAndUpdate with a $lt filter), which avoids the race condition
// where two customers redeem the last available use at the same time
// and both succeed.
//
// IMPORTANT: call this ONLY after the order has actually been placed
// successfully (e.g. at the end of your /api/orders POST handler, or
// right after Razorpay payment verification succeeds) — never on the
// "preview the discount" step, or someone could burn through all uses
// just by typing the code in and out of the checkout field without
// ever actually buying anything.

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Coupon } from "@/lib/models/coupon"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ success: false, error: "Coupon code is required." }, { status: 400 })
    }

    const normalizedCode = String(code).trim().toUpperCase()

    // Atomic: only increments if usedCount is still below maxUses at write-time
    const coupon = await Coupon.findOneAndUpdate(
      {
        code: normalizedCode,
        isActive: true,
        $expr: { $lt: ["$usedCount", "$maxUses"] },
      },
      { $inc: { usedCount: 1 } },
      { new: true }
    )

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: "This coupon could not be redeemed — it may have just reached its usage limit.",
      }, { status: 409 })
    }

    return NextResponse.json({ success: true, remainingUses: coupon.maxUses - coupon.usedCount })
  } catch (error) {
    console.error("[coupons/redeem] POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}