// app/api/admin/home-carousel/route.ts
import { connectDB } from "@/lib/db"
import { HomeBanner } from "@/lib/models/homeBanner"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// Admin — returns ALL banners (active + inactive), for the admin dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const banners = await HomeBanner.find({}).sort({ order: 1, createdAt: 1 }).lean()

    return NextResponse.json(banners)
  } catch (error) {
    console.error("Error fetching all home banners:", error)
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 })
  }
}