// app/api/flash-sales/[id]/route.ts
//
// GET    /api/flash-sales/[id]   -> single sale (admin edit page)
// PUT    /api/flash-sales/[id]   -> update a sale (admin)
// DELETE /api/flash-sales/[id]   -> delete a sale (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { FlashSale } from "@/lib/models/flashsale"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const sale = await FlashSale.findById(id)
      .populate({ path: "products", select: "name image price company", populate: { path: "company", select: "name slug" } })
      .lean()

    if (!sale) {
      return NextResponse.json({ error: "Flash sale not found" }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (error) {
    console.error("[flash-sales/id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    const sale = await FlashSale.findByIdAndUpdate(
      id,
      {
        name: body.name,
        discountPercent: body.discountPercent !== undefined ? Number(body.discountPercent) : undefined,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        products: body.products,
        isActive: body.isActive,
      },
      { new: true }
    )

    if (!sale) {
      return NextResponse.json({ error: "Flash sale not found" }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (error) {
    console.error("[flash-sales/id] PUT error:", error)
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

    const result = await FlashSale.findByIdAndDelete(id)
    if (!result) {
      return NextResponse.json({ error: "Flash sale not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[flash-sales/id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/flash-sales/[id]  -> toggle isActive only (admin list view button)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 })
    }

    const sale = await FlashSale.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true }
    )

    if (!sale) {
      return NextResponse.json({ error: "Flash sale not found" }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (error) {
    console.error("[flash-sales/id] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}