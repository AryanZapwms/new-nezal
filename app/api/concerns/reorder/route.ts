// app/api/concerns/reorder/route.ts
//
// PUT /api/concerns/reorder
// body: { concernIds: string[] }  -> ordered array of Concern _ids
// Updates sortOrder on each doc to match array index.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Concern } from "@/lib/models/concern"

type ReorderPayload = {
  concernIds: string[]
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body: ReorderPayload = await request.json()
    const { concernIds } = body

    if (!Array.isArray(concernIds) || concernIds.length === 0) {
      return NextResponse.json(
        { error: "concernIds must be a non-empty array" },
        { status: 400 }
      )
    }

    const bulkOps = concernIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))

    await Concern.bulkWrite(bulkOps)

    const concerns = await Concern.find({})
      .sort({ sortOrder: 1 })
      .select("label slug heroImage sortOrder isActive")
      .lean()

    return NextResponse.json({
      message: "Concerns reordered successfully",
      concerns,
    })
  } catch (error) {
    console.error("[concerns/reorder] PUT error:", error)
    return NextResponse.json(
      {
        error: "Failed to reorder concerns",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}