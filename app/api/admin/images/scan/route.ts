import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Blog } from "@/lib/models/blog"
import { Company } from "@/lib/models/company"
import { isAdmin } from "@/lib/admin-check"
import { isBunnyUrl, bunnyPathFromUrl } from "@/lib/bunny"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const LOCAL_FOLDERS = ["arrivals", "blogs", "carousel", "shop-by-concern", "uploads"]

interface ImageFile {
  path: string        // local: "/carousel/banner1.jpg" | bunny: "https://<pull-zone>/products/..."
  folder: string      // local: "carousel" | bunny: "bunny/products"
  filename: string
  size: number
  isUsed: boolean
  usedBy: string[]
  storageType: "local" | "bunny"
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

// ── 2. Extract Bunny.net URLs from DB ────────────────────────────────────────
function bunnyFolder(url: string): string {
  // e.g. .../products/64f.../filename.jpg → "products"
  try {
    const targetPath = bunnyPathFromUrl(url)
    return targetPath.split("/")[0] || "uploads"
  } catch {
    return "uploads"
  }
}

function bunnyFilename(url: string): string {
  try {
    const targetPath = bunnyPathFromUrl(url)
    return targetPath.split("/").pop() || url
  } catch {
    return url
  }
}

async function getBunnyImagesFromDB(): Promise<ImageFile[]> {
  const seen = new Set<string>()
  const images: ImageFile[] = []

  const addUrl = (url: string, label: string) => {
    if (!url || !isBunnyUrl(url) || seen.has(url)) return
    seen.add(url)
    const folder = bunnyFolder(url)
    images.push({
      path: url,
      folder: `bunny/${folder}`,
      filename: bunnyFilename(url),
      size: 0, // Bunny.net doesn't expose size without a separate API call
      isUsed: false,
      usedBy: [],
      storageType: "bunny",
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

  // All Bunny.net URLs found in DB are by definition "used"
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
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    await connectDB()

    const [localImages, bunnyImages] = await Promise.all([
      Promise.resolve(getLocalImageFiles()),
      getBunnyImagesFromDB(),
    ])

    await checkLocalImageUsage(localImages)

    const allImages = [...localImages, ...bunnyImages]

    return NextResponse.json({
      success: true,
      images: allImages,
      total: allImages.length,
      used: allImages.filter(i => i.isUsed).length,
      unused: allImages.filter(i => !i.isUsed).length,
      breakdown: {
        local: localImages.length,
        bunny: bunnyImages.length,
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