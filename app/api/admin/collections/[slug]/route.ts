import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"

// GET /api/admin/collections/[slug] — fetch regardless of isActive, for editing
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const collection = await Collection.findOne({ slug }).lean()
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }
    return NextResponse.json({ collection })
  } catch (error) {
    console.error("[admin/collections/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/admin/collections/[slug] — full update
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug: originalSlug } = await params
    const body = await req.json()

    if (!body.name?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const newSlug = body.slug.trim().toLowerCase()

    if (newSlug !== originalSlug) {
      const clash = await Collection.findOne({ slug: newSlug })
      if (clash) {
        return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 409 })
      }
    }

    const updated = await Collection.findOneAndUpdate(
      { slug: originalSlug },
      {
        name: body.name.trim(),
        slug: newSlug,
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
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    return NextResponse.json({ collection: updated })
  } catch (error: any) {
    console.error("[admin/collections/slug] PUT error:", error)
    if (error.code === 11000) {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/collections/[slug] — partial update (used by list page for toggle-active + reorder-adjacent tweaks)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const body = await req.json()

    const updated = await Collection.findOneAndUpdate(
      { slug },
      { $set: body },
      { new: true }
    )
    if (!updated) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }
    return NextResponse.json({ collection: updated })
  } catch (error) {
    console.error("[admin/collections/slug] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/collections/[slug]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const deleted = await Collection.findOneAndDelete({ slug })
    if (!deleted) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/collections/slug] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}