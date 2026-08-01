// app/api/coupons/[id]/route.ts
//
// PUT    /api/coupons/[id]   -> update a coupon (admin)
// DELETE /api/coupons/[id]   -> delete a coupon (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Coupon } from "@/lib/models/coupon"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    if (body.code) body.code = String(body.code).trim().toUpperCase()

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue !== undefined ? Number(body.discountValue) : undefined,
        maxUses: body.maxUses !== undefined ? Number(body.maxUses) : undefined,
        startsAt: body.startsAt ? new Date(body.startsAt) : body.startsAt === null ? null : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined,
        minOrderValue: body.minOrderValue !== undefined ? Number(body.minOrderValue) : undefined,
        isActive: body.isActive,
      },
      { new: true }
    )

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error("[coupons/id] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const result = await Coupon.findByIdAndDelete(id)
    if (!result) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[coupons/id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}