// app/api/concerns/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Collection } from "@/lib/models/collection"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()

    const { slug } = await params

    // Products that address this concern
    const products = await Product.find(
      { concerns: slug, isActive: true },
      {
        _id: 1,
        name: 1,
        slug: 1,
        price: 1,
        discountPrice: 1,
        image: 1,
        images: 1,
        variantLabel: 1,
        skinTypes: 1,
        concerns: 1,
        keyIngredients: 1,
        collectionSlug: 1,
        ritualStep: 1,
        sizes: 1,
        stock: 1,
        company: 1,
      }
    )
      .populate("company", "name slug")
      .lean()

    // Collections that address this concern
    const collections = await Collection.find(
      { concerns: slug, isActive: true },
      { name: 1, slug: 1, tagline: 1, heroImage: 1, navCategory: 1, sortOrder: 1 }
    )
      .sort({ sortOrder: 1 })
      .lean()

    return NextResponse.json({
      slug,
      products,
      collections,
      total: products.length,
    })
  } catch (error) {
    console.error("[concerns/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}