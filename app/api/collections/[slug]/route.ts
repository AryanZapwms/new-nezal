// app/api/collections/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"
import { Product } from "@/lib/models/product"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()

    const { slug } = await params

    // Fetch collection document
    const collection = await Collection.findOne({ slug, isActive: true }).lean()

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    // Fetch all active products belonging to this collection
    const products = await Product.find(
      { collectionSlug: slug, isActive: true },
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
        ritualStep: 1,
        sizes: 1,
        stock: 1,
        company: 1,
      }
    )
      .populate("company", "name slug")
      .lean()

    // ── Merge in flash-sale pricing so collection pages match every
    //    other product surface (shop, concerns, home, etc.) ──────────
    const flashSaleMap = await getActiveFlashSaleMap()
    const productsWithSales = applyFlashSaleToList(products, flashSaleMap)

    // Fetch related collections (for "Complete Your Ritual" section)
    const relatedSlugs: string[] = (collection as any).relatedCollections ?? []
    const relatedCollections = await Collection.find(
      { slug: { $in: relatedSlugs }, isActive: true },
      { name: 1, slug: 1, tagline: 1, heroImage: 1, navCategory: 1 }
    ).lean()

    return NextResponse.json({
      collection,
      products: productsWithSales,
      relatedCollections,
    })
  } catch (error) {
    console.error("[collections/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}