import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Collection } from "@/lib/models/collection"

// GET /api/admin/collections/[slug]/products — all products currently in this collection (any status)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const products = await Product.find(
      { collectionSlug: slug },
      { _id: 1, name: 1, image: 1, price: 1, discountPrice: 1, stock: 1, isActive: 1, company: 1 }
    )
      .populate("company", "name slug")
      .lean()

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[admin/collections/slug/products] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/collections/[slug]/products — add a product to this collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const { productId } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const collection = await Collection.findOne({ slug }, { _id: 1 }).lean()
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: { collectionSlug: slug } },
      { new: true }
    )

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/collections/slug/products] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/collections/[slug]/products — remove a product from this collection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const { productId } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    // only unset if it actually belongs to THIS collection — avoids accidentally
    // clearing a product that another admin just moved elsewhere
    const product = await Product.findOneAndUpdate(
      { _id: productId, collectionSlug: slug },
      { $unset: { collectionSlug: "" } },
      { new: true }
    )

    if (!product) {
      return NextResponse.json({ error: "Product not found in this collection" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/collections/slug/products] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}