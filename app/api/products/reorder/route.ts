// app/api/products/reorder/route.ts
//
// PUT /api/products/reorder
// body: { productIds: string[] }  -> ordered array of Product _ids
// Updates sortOrder on each doc to match array index.
//
// Only enabled from the admin panel when no search/category filter is
// active, so productIds always represents the FULL product set — that's
// what lets this double as a one-time backfill: any products that still
// share the default sortOrder (0) get spread into an explicit order the
// very first time an admin drags anything.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
// Required for populate() below to resolve these refs correctly
import "@/lib/models/company"
import "@/lib/models/category"

type ReorderPayload = {
  productIds: string[]
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body: ReorderPayload = await request.json()
    const { productIds } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds must be a non-empty array" },
        { status: 400 }
      )
    }

    const bulkOps = productIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))

    await Product.bulkWrite(bulkOps)

    const products = await Product.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate("company", "name")
      .populate("category", "name")
      .select("name price discountPrice image stock isActive company category sortOrder")
      .lean()

    return NextResponse.json({
      message: "Products reordered successfully",
      products,
    })
  } catch (error) {
    console.error("[products/reorder] PUT error:", error)
    return NextResponse.json(
      {
        error: "Failed to reorder products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}