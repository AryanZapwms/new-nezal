// app/api/collections/route.ts
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")

   const query: Record<string, unknown> = { isActive: true }
if (category && category !== "all") {
  query.$or = [{ navCategory: category }, { subCategory: category }]
}

    const collections = await Collection.find(query, {
      _id: 1,
      name: 1,
      slug: 1,
      tagline: 1,
      heroImage: 1,
      navCategory: 1,
      subCategory: 1,
      sortOrder: 1,
    })
      .sort({ navCategory: 1, sortOrder: 1 })
      .lean()

    return NextResponse.json(collections)
  } catch (error) {
    console.error("[collections] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}