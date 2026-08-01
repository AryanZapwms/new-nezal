// app/api/coupons/route.ts
//
// GET  /api/coupons          -> list all coupons (admin)
// POST /api/coupons          -> create a new coupon (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Coupon } from "@/lib/models/coupon"

export async function GET() {
  try {
    await connectDB()
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ coupons })
  } catch (error) {
    console.error("[coupons] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.code || !body.discountType || body.discountValue === undefined || !body.maxUses) {
      return NextResponse.json({ error: "Code, discount type, discount value, and max uses are required" }, { status: 400 })
    }

    const code = String(body.code).trim().toUpperCase()

    const existing = await Coupon.findOne({ code })
    if (existing) {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }

    if (body.discountType === "percentage" && (body.discountValue <= 0 || body.discountValue > 100)) {
      return NextResponse.json({ error: "Percentage discount must be between 1 and 100" }, { status: 400 })
    }

    const coupon = await Coupon.create({
      code,
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      maxUses: Number(body.maxUses),
      usedCount: 0,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      minOrderValue: body.minOrderValue ? Number(body.minOrderValue) : 0,
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error) {
    console.error("[coupons] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}