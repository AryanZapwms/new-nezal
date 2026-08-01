import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"

// PATCH /api/admin/collections/reorder
// body: { items: [{ slug: string, sortOrder: number }, ...] }
export async function PATCH(req: NextRequest) {
  try {
    await connectDB()
    const { items } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 })
    }

    await Collection.bulkWrite(
      items.map((item: { slug: string; sortOrder: number }) => ({
        updateOne: {
          filter: { slug: item.slug },
          update: { $set: { sortOrder: item.sortOrder } },
        },
      }))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/collections/reorder] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}