// app/api/rituals/[slug]/route.ts
//
// GET    /api/rituals/[slug]   -> single ritual with populated products + steps (public ritual page)
// PUT    /api/rituals/[slug]   -> update a ritual (admin)
// DELETE /api/rituals/[slug]   -> delete a ritual (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Ritual } from "@/lib/models/ritual"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const ritual = await Ritual.findOne({ slug, isActive: true })
      .populate({
        path: "products",
        select: "name slug price discountPrice image images variantLabel skinTypes concerns keyIngredients sizes stock company",
        populate: { path: "company", select: "name slug" },
      })
      .populate({
        path: "steps.productId",
        select: "name slug image",
      })
      .lean()

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 })
    }

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error("[rituals/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const body = await req.json()

    const ritual = await Ritual.findOneAndUpdate(
      { slug },
      {
        name: body.name,
        slug: body.slug,
        tagline: body.tagline,
        description: body.description,
        heroImage: body.heroImage,
        color: body.color,
        steps: body.steps,
        idealFor: body.idealFor,
        products: body.products,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
      { new: true }
    )

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 })
    }

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error("[rituals/slug] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const result = await Ritual.findOneAndDelete({ slug })
    if (!result) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[rituals/slug] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


// PATCH /api/rituals/[slug]  -> toggle isActive only (admin list view button)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const body = await req.json()

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 })
    }

    const ritual = await Ritual.findOneAndUpdate(
      { slug },
      { isActive: body.isActive },
      { new: true }
    )

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 })
    }

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error("[rituals/slug] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}