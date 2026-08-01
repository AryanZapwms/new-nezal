// app/api/concerns/[slug]/route.ts
//
// REPLACES the old tag-matching version. Now returns the admin-curated
// product list for this concern, plus the concern's own metadata
// (headline, subheadline, description, color) instead of relying on
// hardcoded CONCERN_META in the page component.
//
// GET    /api/concerns/[slug]   -> public, only if isActive
// PUT    /api/concerns/[slug]   -> update (admin)
// DELETE /api/concerns/[slug]   -> delete (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Concern } from "@/lib/models/concern"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params
    const isAdmin = req.nextUrl.searchParams.get("admin") === "true"

    // Admin can fetch inactive concerns too
    const filter = isAdmin ? { slug } : { slug, isActive: true }

    const concern = await Concern.findOne(filter)
      .populate({
        path: "products",
        select: "name slug price discountPrice image images variantLabel skinTypes concerns keyIngredients sizes stock company",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    if (!concern) {
      return NextResponse.json({ error: "Concern not found" }, { status: 404 })
    }

    // ── Merge in flash-sale pricing so concern-page listings match
    //    every other surface (shop grid, home, etc.) ──────────────────
    const flashSaleMap = await getActiveFlashSaleMap()
    const concernWithSales = {
      ...concern,
      products: applyFlashSaleToList((concern as any).products ?? [], flashSaleMap),
    }

    return NextResponse.json({ concern: concernWithSales })
  } catch (error) {
    console.error("[concerns/slug] GET error:", error)
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

    const concern = await Concern.findOneAndUpdate(
      { slug },
      {
        label: body.label,
        slug: body.slug,
        headline: body.headline,
        subheadline: body.subheadline,
        description: body.description,
        heroImage: body.heroImage,
        color: body.color,
        products: body.products,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
      { new: true }
    )

    if (!concern) {
      return NextResponse.json({ error: "Concern not found" }, { status: 404 })
    }

    return NextResponse.json({ concern })
  } catch (error) {
    console.error("[concerns/slug] PUT error:", error)
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

    const result = await Concern.findOneAndDelete({ slug })
    if (!result) {
      return NextResponse.json({ error: "Concern not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[concerns/slug] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const concern = await Concern.findOneAndUpdate(
      { slug },
      { isActive: body.isActive },
      { new: true }
    )

    if (!concern) {
      return NextResponse.json({ error: "Concern not found" }, { status: 404 })
    }

    return NextResponse.json({ concern })
  } catch (error) {
    console.error("[concerns/slug] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}