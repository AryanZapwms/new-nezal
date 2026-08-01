// app/api/admin/rituals/[slug]/route.ts
//
// Admin-only variant of GET /api/rituals/[slug] that returns the ritual
// regardless of isActive status, so drafts can be edited before publishing.

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

    const ritual = await Ritual.findOne({ slug })
      .populate({
        path: "products",
        select: "name image price company",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    if (!ritual) {
      return NextResponse.json({ error: "Ritual not found" }, { status: 404 })
    }

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error("[admin/rituals/slug] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}