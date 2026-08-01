// app/api/rituals/reorder/route.ts
//
// PUT /api/rituals/reorder
// body: { ritualIds: string[] }  -> ordered array of Ritual _ids
// Updates sortOrder on each doc to match array index.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Ritual } from "@/lib/models/ritual"

type ReorderPayload = {
  ritualIds: string[]
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body: ReorderPayload = await request.json()
    const { ritualIds } = body

    if (!Array.isArray(ritualIds) || ritualIds.length === 0) {
      return NextResponse.json(
        { error: "ritualIds must be a non-empty array" },
        { status: 400 }
      )
    }

    const bulkOps = ritualIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))

    await Ritual.bulkWrite(bulkOps)

    const rituals = await Ritual.find({})
      .sort({ sortOrder: 1 })
      .select("name slug tagline heroImage sortOrder isActive")
      .lean()

    return NextResponse.json({
      message: "Rituals reordered successfully",
      rituals,
    })
  } catch (error) {
    console.error("[rituals/reorder] PUT error:", error)
    return NextResponse.json(
      {
        error: "Failed to reorder rituals",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}