// app/api/admin/reviews/[id]/route.ts
import mongoose from "mongoose"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await connectDB()
  const { id } = await params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 })
  }

  const { action } = await req.json()
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const review = await Review.findByIdAndUpdate(
    id,
    { status: action === "approve" ? "approved" : "rejected" },
    { new: true }
  )

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, review })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await connectDB()
  const { id } = await params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 })
  }

  const result = await Review.findByIdAndDelete(id)
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}