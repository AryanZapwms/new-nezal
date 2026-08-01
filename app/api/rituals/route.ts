// app/api/rituals/route.ts
//
// GET  /api/rituals          -> list all active rituals (for homepage cards)
// POST /api/rituals          -> create a new ritual (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Ritual } from "@/lib/models/ritual"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const includeInactive = req.nextUrl.searchParams.get("all") === "true"
    const filter = includeInactive ? {} : { isActive: true }

    const rituals = await Ritual.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .select("name slug tagline heroImage color sortOrder isActive")
      .lean()

    return NextResponse.json({ rituals })
  } catch (error) {
    console.error("[rituals] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.name || !body.slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const existing = await Ritual.findOne({ slug: body.slug })
    if (existing) {
      return NextResponse.json({ error: "A ritual with this slug already exists" }, { status: 409 })
    }

    const ritual = await Ritual.create({
      name: body.name,
      slug: body.slug,
      tagline: body.tagline || "",
      description: body.description || "",
      heroImage: body.heroImage || "",
      color: body.color || "#F3F5EF",
      steps: body.steps || [],
      idealFor: body.idealFor || [],
      products: body.products || [],
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ ritual }, { status: 201 })
  } catch (error) {
    console.error("[rituals] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}