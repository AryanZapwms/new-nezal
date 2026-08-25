import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { isBunnyUrl, bunnyPathFromUrl, deleteFromBunny } from "@/lib/bunny"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const ALLOWED_LOCAL_FOLDERS = ["arrivals", "blogs", "carousel", "shop-by-concern", "uploads"]

async function isImageUsedInDB(imagePath: string): Promise<{ used: boolean; counts: Record<string, number> }> {
  const [productUsage, blogUsage, companyUsage] = await Promise.all([
    Product.find({
      $or: [{ image: imagePath }, { images: imagePath }, { "results.image": imagePath }],
    }).countDocuments(),
    Blog.find({ image: imagePath }).countDocuments(),
    Company.find({
      $or: [
        { logo: imagePath },
        { banner: imagePath },
        { "carouselImages.url": imagePath },
        { "newArrivals.image": imagePath },
        { "shopByConcern.image": imagePath },
      ],
    }).countDocuments(),
  ])

  return {
    used: productUsage + blogUsage + companyUsage > 0,
    counts: { products: productUsage, blogs: blogUsage, companies: companyUsage },
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const { path: imagePath } = await request.json()
    if (!imagePath) {
      return NextResponse.json({ success: false, error: "Image path is required" }, { status: 400 })
    }

    await connectDB()

    // ── Bunny.net image ──────────────────────────────────────────────────────
    if (isBunnyUrl(imagePath)) {
      const { used, counts } = await isImageUsedInDB(imagePath)
      if (used) {
        return NextResponse.json(
          { success: false, error: "Image is still in use and cannot be deleted", usage: counts },
          { status: 400 }
        )
      }

      await deleteFromBunny(bunnyPathFromUrl(imagePath))

      return NextResponse.json({ success: true, message: "Bunny.net image deleted", path: imagePath })
    }

    // ── Local image ───────────────────────────────────────────────────────────
    if (!imagePath.startsWith("/")) {
      return NextResponse.json({ success: false, error: "Invalid image path" }, { status: 400 })
    }

    // Security: only allow deletion from known folders
    const folder = imagePath.split("/")[1]
    if (!ALLOWED_LOCAL_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { success: false, error: `Deletion not allowed from folder: ${folder}` },
        { status: 400 }
      )
    }

    const fullPath = path.join(PUBLIC_DIR, imagePath)

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ success: false, error: "File not found on disk" }, { status: 404 })
    }

    const { used, counts } = await isImageUsedInDB(imagePath)
    if (used) {
      return NextResponse.json(
        { success: false, error: "Image is still in use and cannot be deleted", usage: counts },
        { status: 400 }
      )
    }

    fs.unlinkSync(fullPath)

    return NextResponse.json({ success: true, message: "Local image deleted", path: imagePath })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ success: false, error: "Failed to delete image" }, { status: 500 })
  }
}