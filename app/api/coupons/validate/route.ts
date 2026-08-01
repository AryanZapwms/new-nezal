// app/api/coupons/validate/route.ts
//
// POST /api/coupons/validate
// Body: { code: string, cartTotal: number }
//
// Checks a coupon code WITHOUT consuming a use — called when the user
// types a code at checkout, before placing the order. Returns the
// computed discount so the UI can show it live. The actual usedCount
// increment happens separately in /api/coupons/redeem, called only
// AFTER the order is successfully placed (see note in that file).

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Coupon } from "@/lib/models/coupon"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { code, cartTotal } = await req.json()

    if (!code) {
      return NextResponse.json({ valid: false, error: "Enter a coupon code." }, { status: 400 })
    }

    const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code." }, { status: 404 })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: "This coupon is no longer active." }, { status: 400 })
    }

    const now = new Date()
    if (coupon.startsAt && now < coupon.startsAt) {
      return NextResponse.json({ valid: false, error: "This coupon is not active yet." }, { status: 400 })
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return NextResponse.json({ valid: false, error: "This coupon has expired." }, { status: 400 })
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit." }, { status: 400 })
    }

    if (coupon.minOrderValue && (cartTotal ?? 0) < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `This coupon requires a minimum order of ₹${coupon.minOrderValue}.`,
      }, { status: 400 })
    }

    const discountAmount =
      coupon.discountType === "percentage"
        ? Math.round(((cartTotal ?? 0) * coupon.discountValue) / 100)
        : Math.min(coupon.discountValue, cartTotal ?? 0)

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      remainingUses: coupon.maxUses - coupon.usedCount,
    })
  } catch (error) {
    console.error("[coupons/validate] POST error:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}