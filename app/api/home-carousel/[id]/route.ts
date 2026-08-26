// app/api/home-carousel/[id]/route.ts
import { connectDB } from "@/lib/db"
import { HomeBanner } from "@/lib/models/homeBanner"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const body = await request.json()

    // Desktop `url` is the only required image field — `mobileUrl` is always optional.
    if ("url" in body && !body.url?.trim()) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    const allowed = ["url", "mobileUrl", "title", "description", "linkType", "link", "linkLabel", "order", "isActive"]
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const banner = await HomeBanner.findByIdAndUpdate(id, update, { new: true })
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    revalidatePath("/")

    return NextResponse.json(banner)
  } catch (error) {
    console.error("Error updating home banner:", error)
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const banner = await HomeBanner.findById(id)
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    // Clean up local files if they aren't external/data URLs
    for (const fileUrl of [banner.url, banner.mobileUrl].filter(Boolean)) {
      const isExternal = /^https?:\/\//i.test(fileUrl) || fileUrl.startsWith("data:")
      if (isExternal) continue
      try {
        const normalizedPath = fileUrl.replace(/^[\/\\]+/, "")
        const filepath = path.join(process.cwd(), "public", normalizedPath)
        await fs.unlink(filepath)
      } catch (err) {
        console.error("Failed to delete banner file (continuing):", err)
      }
    }

    await HomeBanner.findByIdAndDelete(id)

    revalidatePath("/")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting home banner:", error)
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 })
  }
}