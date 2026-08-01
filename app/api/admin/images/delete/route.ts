import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { v2 as cloudinary } from "cloudinary"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const PUBLIC_DIR = path.join(process.cwd(), "public")
const ALLOWED_LOCAL_FOLDERS = ["arrivals", "blogs", "carousel", "shop-by-concern", "uploads"]

function isCloudinaryUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith("https://res.cloudinary.com/")
}

// Extract Cloudinary public_id from URL
// e.g. https://res.cloudinary.com/demo/image/upload/v123/nezal/arrivals/foo.jpg
//   → "nezal/arrivals/foo"  (without extension)
function getCloudinaryPublicId(url: string): string {
  try {
    const pathname = new URL(url).pathname
    // Remove leading slash, strip version segment (v\d+), strip extension
    const parts = pathname.split("/").filter(Boolean)
    // parts: ["demo","image","upload","v123","nezal","arrivals","foo.jpg"]
    const uploadIdx = parts.indexOf("upload")
    if (uploadIdx === -1) throw new Error("Not a valid Cloudinary upload URL")
    const relevant = parts.slice(uploadIdx + 1)
    // Skip version segment if present (starts with "v" followed by digits)
    const start = /^v\d+$/.test(relevant[0]) ? 1 : 0
    const withoutExt = relevant.slice(start).join("/").replace(/\.[^/.]+$/, "")
    return withoutExt
  } catch {
    throw new Error(`Cannot extract public_id from Cloudinary URL: ${url}`)
  }
}

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

    // ── Cloudinary image ──────────────────────────────────────────────────────
    if (isCloudinaryUrl(imagePath)) {
      const { used, counts } = await isImageUsedInDB(imagePath)
      if (used) {
        return NextResponse.json(
          { success: false, error: "Image is still in use and cannot be deleted", usage: counts },
          { status: 400 }
        )
      }

      const publicId = getCloudinaryPublicId(imagePath)
      const result = await cloudinary.uploader.destroy(publicId)

      if (result.result !== "ok" && result.result !== "not found") {
        return NextResponse.json(
          { success: false, error: `Cloudinary deletion failed: ${result.result}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: "Cloudinary image deleted", path: imagePath })
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