// app/api/hero-products/[id]/route.ts
//
// DELETE /api/hero-products/[id]  -> remove from spotlight (admin)
// PATCH  /api/hero-products/[id]  -> toggle isActive (admin)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { HeroProduct } from "@/lib/models/heroProduct"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const result = await HeroProduct.findByIdAndDelete(id)
    if (!result) {
      return NextResponse.json({ error: "Hero product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[hero-products/id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const body = await req.json()

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 })
    }

    const heroProduct = await HeroProduct.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true }
    )

    if (!heroProduct) {
      return NextResponse.json({ error: "Hero product not found" }, { status: 404 })
    }

    return NextResponse.json({ heroProduct })
  } catch (error) {
    console.error("[hero-products/id] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}