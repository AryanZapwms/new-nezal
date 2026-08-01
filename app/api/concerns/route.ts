// app/api/concerns/route.ts
//
// GET  /api/concerns          -> list all active concerns (for homepage cards + search)
// POST /api/concerns          -> create a new concern (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Concern } from "@/lib/models/concern"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const includeInactive = req.nextUrl.searchParams.get("all") === "true"
    const filter = includeInactive ? {} : { isActive: true }

    const concerns = await Concern.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .select("label slug headline heroImage color sortOrder isActive")
      .lean()

    return NextResponse.json({ concerns })
  } catch (error) {
    console.error("[concerns] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.label || !body.slug) {
      return NextResponse.json({ error: "Label and slug are required" }, { status: 400 })
    }

    const existing = await Concern.findOne({ slug: body.slug })
    if (existing) {
      return NextResponse.json({ error: "A concern with this slug already exists" }, { status: 409 })
    }

    const concern = await Concern.create({
      label: body.label,
      slug: body.slug,
      headline: body.headline || "",
      subheadline: body.subheadline || "",
      description: body.description || "",
      heroImage: body.heroImage || "",
      color: body.color || "#F3F5EF",
      products: body.products || [],
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ concern }, { status: 201 })
  } catch (error) {
    console.error("[concerns] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}