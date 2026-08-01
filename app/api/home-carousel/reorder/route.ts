// app/api/home-carousel/reorder/route.ts
import { connectDB } from "@/lib/db"
import { HomeBanner } from "@/lib/models/homeBanner"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// body: { order: [{ id: string, order: number }, ...] }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { order } = await request.json()

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 })
    }

    await Promise.all(
      order.map((item: { id: string; order: number }) =>
        HomeBanner.findByIdAndUpdate(item.id, { order: item.order })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering banners:", error)
    return NextResponse.json({ error: "Failed to reorder banners" }, { status: 500 })
  }
}