// app/api/hero-products/reorder/route.ts
//
// PUT /api/hero-products/reorder
// body: { heroProductIds: string[] }  -> ordered array of HeroProduct _ids
// Updates sortOrder on each doc to match array index.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { HeroProduct } from "@/lib/models/heroProduct"
// ── Required for the populate("productId") call below to resolve ──
import { Product } from "@/lib/models/product"
import { Company } from "@/lib/models/company"

type ReorderPayload = {
  heroProductIds: string[]
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body: ReorderPayload = await request.json()
    const { heroProductIds } = body

    if (!Array.isArray(heroProductIds) || heroProductIds.length === 0) {
      return NextResponse.json(
        { error: "heroProductIds must be a non-empty array" },
        { status: 400 }
      )
    }

    const bulkOps = heroProductIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))

    await HeroProduct.bulkWrite(bulkOps)

    const heroProducts = await HeroProduct.find({})
      .sort({ sortOrder: 1 })
      .populate({ path: "productId", select: "name slug image price discountPrice company" })
      .lean()

    return NextResponse.json({
      message: "Hero products reordered successfully",
      heroProducts,
    })
  } catch (error) {
    console.error("[hero-products/reorder] PUT error:", error)
    return NextResponse.json(
      {
        error: "Failed to reorder hero products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}