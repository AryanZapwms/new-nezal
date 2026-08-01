import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"

// GET /api/admin/collections — full list (active + inactive) for admin table
export async function GET() {
  try {
    await connectDB()
    const collections = await Collection.find({})
      .sort({ navCategory: 1, subCategory: 1, sortOrder: 1 })
      .lean()
    return NextResponse.json({ collections })
  } catch (error) {
    console.error("[admin/collections] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/collections — create a new collection
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.name?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }
    if (!body.navCategory || !body.subCategory) {
      return NextResponse.json({ error: "navCategory and subCategory are required" }, { status: 400 })
    }

    const existing = await Collection.findOne({ slug: body.slug.trim().toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 409 })
    }

    const collection = await Collection.create({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      tagline: body.tagline,
      heroImage: body.heroImage,
      heroHeadline: body.heroHeadline,
      heroSubheadline: body.heroSubheadline,
      storyText: body.storyText,
      keyIngredients: body.keyIngredients || [],
      concerns: body.concerns || [],
      ritualSteps: body.ritualSteps || [],
      relatedCollections: body.relatedCollections || [],
      faq: body.faq || [],
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      metaKeywords: body.metaKeywords || [],
      navCategory: body.navCategory,
      subCategory: body.subCategory,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ collection }, { status: 201 })
  } catch (error: any) {
    console.error("[admin/collections] POST error:", error)
    if (error.code === 11000) {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}