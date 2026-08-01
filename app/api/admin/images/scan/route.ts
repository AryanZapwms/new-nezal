import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const LOCAL_FOLDERS = ["arrivals", "blogs", "carousel", "shop-by-concern", "uploads"]

interface ImageFile {
  path: string        // local: "/carousel/banner1.jpg" | cloudinary: "https://res.cloudinary.com/..."
  folder: string      // local: "carousel" | cloudinary: "cloudinary/arrivals"
  filename: string
  size: number
  isUsed: boolean
  usedBy: string[]
  storageType: "local" | "cloudinary"
}

// ── 1. Collect local disk images ──────────────────────────────────────────────
function getLocalImageFiles(): ImageFile[] {
  const images: ImageFile[] = []

  for (const folder of LOCAL_FOLDERS) {
    const folderPath = path.join(PUBLIC_DIR, folder)
    if (!fs.existsSync(folderPath)) continue

    for (const file of fs.readdirSync(folderPath)) {
      const filePath = path.join(folderPath, file)
      const stat = fs.statSync(filePath)
      if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
        images.push({
          path: `/${folder}/${file}`,
          folder,
          filename: file,
          size: stat.size,
          isUsed: false,
          usedBy: [],
          storageType: "local",
        })
      }
    }
  }

  return images
}

// ── 2. Extract Cloudinary URLs from DB ────────────────────────────────────────
function isCloudinaryUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith("https://res.cloudinary.com/")
}

function cloudinaryFolder(url: string): string {
  // e.g. .../nezal/arrivals/filename.jpg → "arrivals"
  try {
    const parts = new URL(url).pathname.split("/")
    const nezalIdx = parts.indexOf("nezal")
    return nezalIdx !== -1 && parts[nezalIdx + 1] ? parts[nezalIdx + 1] : "uploads"
  } catch {
    return "uploads"
  }
}

function cloudinaryFilename(url: string): string {
  try {
    return new URL(url).pathname.split("/").pop() || url
  } catch {
    return url
  }
}

async function getCloudinaryImagesFromDB(): Promise<ImageFile[]> {
  const seen = new Set<string>()
  const images: ImageFile[] = []

  const addUrl = (url: string, label: string) => {
    if (!url || !isCloudinaryUrl(url) || seen.has(url)) return
    seen.add(url)
    const folder = cloudinaryFolder(url)
    images.push({
      path: url,
      folder: `cloudinary/${folder}`,
      filename: cloudinaryFilename(url),
      size: 0, // Cloudinary doesn't expose size without API call
      isUsed: false,
      usedBy: [],
      storageType: "cloudinary",
    })
  }

  const [products, blogs, companies] = await Promise.all([
    Product.find({}, "name image images results").lean(),
    Blog.find({}, "title image").lean(),
    Company.find({}, "name logo banner carouselImages newArrivals shopByConcern").lean(),
  ])

  for (const p of products as any[]) {
    addUrl(p.image, `Product: ${p.name}`)
    for (const img of p.images || []) addUrl(img, `Product: ${p.name}`)
    for (const r of p.results || []) addUrl(r.image, `Product: ${p.name}`)
  }

  for (const b of blogs as any[]) {
    addUrl(b.image, `Blog: ${b.title}`)
  }

  for (const c of companies as any[]) {
    addUrl(c.logo, `Company: ${c.name}`)
    addUrl(c.banner, `Company: ${c.name}`)
    for (const ci of c.carouselImages || []) addUrl(ci.url, `Company: ${c.name}`)
    for (const na of c.newArrivals || []) addUrl(na.image, `Company: ${c.name}`)
    for (const sc of c.shopByConcern || []) addUrl(sc.image, `Company: ${c.name}`)
  }

  // All Cloudinary URLs found in DB are by definition "used"
  for (const img of images) {
    img.isUsed = true
  }

  return images
}

// ── 3. Check usage of local images against DB ─────────────────────────────────
async function checkLocalImageUsage(images: ImageFile[]): Promise<void> {
  if (images.length === 0) return

  const [products, blogs, companies] = await Promise.all([
    Product.find({}, "name image images results").lean(),
    Blog.find({}, "title image").lean(),
    Company.find({}, "name logo banner carouselImages newArrivals shopByConcern").lean(),
  ])

  const imageMap = new Map<string, ImageFile>()
  for (const img of images) imageMap.set(img.path, img)

  const mark = (url: string, label: string) => {
    const img = imageMap.get(url)
    if (img) {
      img.isUsed = true
      img.usedBy.push(label)
    }
  }

  for (const p of products as any[]) {
    mark(p.image, `Product: ${p.name}`)
    for (const img of p.images || []) mark(img, `Product: ${p.name}`)
    for (const r of p.results || []) mark(r.image, `Product: ${p.name}`)
  }

  for (const b of blogs as any[]) mark(b.image, `Blog: ${b.title}`)

  for (const c of companies as any[]) {
    mark(c.logo, `Company: ${c.name}`)
    mark(c.banner, `Company: ${c.name}`)
    for (const ci of c.carouselImages || []) mark(ci.url, `Company: ${c.name}`)
    for (const na of c.newArrivals || []) mark(na.image, `Company: ${c.name}`)
    for (const sc of c.shopByConcern || []) mark(sc.image, `Company: ${c.name}`)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(_request: NextRequest) {
  try {
    await connectDB()

    const [localImages, cloudinaryImages] = await Promise.all([
      Promise.resolve(getLocalImageFiles()),
      getCloudinaryImagesFromDB(),
    ])

    await checkLocalImageUsage(localImages)

    const allImages = [...localImages, ...cloudinaryImages]

    return NextResponse.json({
      success: true,
      images: allImages,
      total: allImages.length,
      used: allImages.filter(i => i.isUsed).length,
      unused: allImages.filter(i => !i.isUsed).length,
      breakdown: {
        local: localImages.length,
        cloudinary: cloudinaryImages.length,
      },
    })
  } catch (error) {
    console.error("Error scanning images:", error)
    return NextResponse.json(
      { success: false, error: "Failed to scan images" },
      { status: 500 }
    )
  }
}