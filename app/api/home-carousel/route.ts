// app/api/home-carousel/route.ts
import { connectDB } from "@/lib/db"
import { HomeBanner } from "@/lib/models/homeBanner"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// Public — used by the homepage to render the carousel
export async function GET() {
  try {
    await connectDB()
    const banners = await HomeBanner.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean()

    return NextResponse.json(banners)
  } catch (error) {
    console.error("Error fetching home banners:", error)
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 })
  }
}

// Admin — create a new banner
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await request.json()

    if (!body.url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // Default order = end of list
    const count = await HomeBanner.countDocuments()

    const banner = await HomeBanner.create({
      url: body.url,
      title: body.title || "",
      description: body.description || "",
      linkType: body.linkType || "none",
      link: body.link || "",
      linkLabel: body.linkLabel || "",
      order: typeof body.order === "number" ? body.order : count,
      isActive: body.isActive ?? true,
    })

    return NextResponse.json(banner)
  } catch (error) {
    console.error("Error creating home banner:", error)
    return NextResponse.json(
      { error: "Failed to create banner", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}