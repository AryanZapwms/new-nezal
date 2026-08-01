// app/api/ingredients/[slug]/route.ts
//
// Mirrors app/api/concerns/[slug]/route.ts but filters products by
// ingredient name instead of concern slug. Matches against BOTH the
// flat `ingredients` array (plain names) and `keyIngredients[].name`
// (name + benefit pairs), case-insensitively, since the "slug" here is
// really just a URL-safe version of the ingredient name typed in search
// (e.g. "tea-tree" → matches "Tea Tree", "Tea Tree Oil", etc.)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"

// Convert a URL slug like "tea-tree" back into a search-friendly phrase
function slugToSearchTerm(slug: string): string {
  return slug.replace(/-/g, " ").trim()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()

    const { slug } = await params
    const searchTerm = slugToSearchTerm(slug)

    // Case-insensitive partial match against:
    //   - ingredients: ["Tea Tree Oil", "Aloe Vera", ...]
    //   - keyIngredients: [{ name: "Tea Tree Oil", benefit: "..." }, ...]
    const regex = new RegExp(searchTerm, "i")

    const products = await Product.find(
      {
        isActive: true,
        $or: [
          { ingredients: { $elemMatch: { $regex: regex } } },
          { "keyIngredients.name": { $regex: regex } },
        ],
      },
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
        ingredients: 1,
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

    return NextResponse.json({
      slug,
      searchTerm,
      products,
      total: products.length,
    })
  } catch (error) {
    console.error("[ingredients/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}