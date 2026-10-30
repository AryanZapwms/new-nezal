// Tests for lib/product-detail.ts and lib/product-reviews.ts — the product and
// review reads shared by GET /api/products/[id], GET /api/products/[id]/reviews
// and the server-rendered product page. Pins both to the route code they were
// moved out of (copied below exactly as it was on main), so the page shows
// what the browser used to fetch, and checks the result is plain JSON that
// can be handed to a Client Component.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Company } from "@/lib/models/company"
import { Category } from "@/lib/models/category"
import { Collection } from "@/lib/models/collection"
import { Product } from "@/lib/models/product"
import { FlashSale } from "@/lib/models/flashsale"
import { Review } from "@/lib/models/review"
import { getActiveFlashSaleMap, applyFlashSale } from "@/lib/flashSale"
import { getProductDetail, isValidProductId } from "@/lib/product-detail"
import { getProductReviews } from "@/lib/product-reviews"
import { connectTestDb, disconnectTestDb } from "./setup-db"

// Never reach Shiprocket from a test (imported by the product route's PUT)
vi.mock("@/lib/shiprocket-webhooks", () => ({ notifyProductWebhook: vi.fn() }))

// What NextResponse.json() puts on the wire
const json = (value: unknown) => JSON.parse(JSON.stringify(value))

// ── The route code as it was on main ──────────────────────────────────────
// app/api/products/[id]/route.ts GET, minus the HTTP wrapper
async function legacyProduct(id: string) {
  const product = await Product.findById(id)
    .populate("company", "name slug")
    .populate("category", "name slug")
    .populate("collectionSaleId", "name slug")
  if (!product) return null
  const productObj = product.toObject()
  const flashSaleMap = await getActiveFlashSaleMap()
  const productWithSale = applyFlashSale(productObj, flashSaleMap)
  const populatedProduct = {
    ...productWithSale,
    company: product.company || { name: "Unknown", slug: "unknown" },
    category: product.category || null,
  }
  return json(populatedProduct)
}

// app/api/products/[id]/reviews/route.ts GET, minus the HTTP wrapper
const legacyEmptySummary = { total: 0, averageRating: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
function legacyBuildSummary(reviews: any[]) {
  if (!reviews.length) return legacyEmptySummary
  const ratingCounts = { ...legacyEmptySummary.ratingCounts }
  let sum = 0
  for (const review of reviews) {
    const rating = review.rating || 0
    if (ratingCounts[review.rating as keyof typeof ratingCounts] !== undefined) {
      ratingCounts[review.rating as keyof typeof ratingCounts] += 1
    }
    sum += rating
  }
  return { total: reviews.length, averageRating: Number((sum / reviews.length).toFixed(1)), ratingCounts }
}
function legacyMapReview(review: any) {
  return {
    id: review._id.toString(),
    productId: review.product.toString(),
    companyId: review.company.toString(),
    userId: review.user.toString(),
    rating: review.rating,
    comment: review.comment,
    userName: review.userName,
    reply: review.reply
      ? {
          message: review.reply.message,
          repliedAt: review.reply.repliedAt,
          repliedBy: review.reply.repliedBy.toString(),
          repliedByName: review.reply.repliedByName,
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }
}
async function legacyReviews(productId: string) {
  const reviews = await Review.find({ product: productId, status: "approved" }).sort({ createdAt: -1 }).lean()
  return json({ reviews: reviews.map(legacyMapReview), summary: legacyBuildSummary(reviews) })
}

// ── Fixtures ──────────────────────────────────────────────────────────────
let onSale: any // sizes, gallery, direct + collection sale, flash sale
let orphan: any // its company was deleted, no category
let plain: any // nothing special
let noReviews: any
const missingId = new mongoose.Types.ObjectId().toString()

beforeAll(async () => {
  await connectTestDb()

  const nezal = await Company.create({ name: "Nezal", slug: "nezal" })
  const faceCare = await Category.create({ name: "Face Care", slug: "face-care", company: nezal._id })
  const { insertedId: monsoon } = await Collection.collection.insertOne({ name: "Monsoon Edit", slug: "monsoon" })

  onSale = await Product.create({
    name: "Kumkumadi Oil",
    slug: "kumkumadi-oil",
    sku: "K1",
    description: "Glow ritual\nA saffron face oil.",
    price: 1000,
    discountPrice: 900,
    image: "https://nezal-cdn.b-cdn.net/k-main.jpg",
    images: ["https://nezal-cdn.b-cdn.net/k-1.jpg", "https://nezal-cdn.b-cdn.net/k-2.jpg"],
    company: nezal._id,
    category: faceCare._id,
    stock: 4,
    ingredients: ["Saffron", "Sandalwood"],
    sizes: [
      { size: "15", unit: "ml", quantity: 15, price: 600, stock: 0, sku: "K1-15" },
      { size: "30", unit: "ml", quantity: 30, price: 1000, discountPrice: 850, stock: 3, sku: "K1-30" },
    ],
    keyIngredients: [{ name: "Saffron", benefit: "Brightens" }],
    salePercentage: 10,
    directSalePercentage: 10,
    directSaleAppliedAt: new Date("2026-10-01T00:00:00Z"),
    collectionSaleId: monsoon,
    isBestSeller: true,
  })
  orphan = await Product.create({
    name: "Orphan Soap",
    slug: "orphan-soap",
    sku: "O1",
    price: 150,
    company: new mongoose.Types.ObjectId(),
  })
  plain = await Product.create({ name: "Plain Gel", slug: "plain-gel", sku: "P1", price: 300, company: nezal._id, stock: 2 })
  noReviews = plain

  const now = Date.now()
  await FlashSale.create({
    name: "Diwali Flash",
    discountPercent: 25,
    products: [onSale._id],
    startsAt: new Date(now - 60_000),
    endsAt: new Date(now + 3_600_000),
    isActive: true,
  })

  const user = () => new mongoose.Types.ObjectId()
  const review = (rating: number, status: string, createdAt: string, extra: object = {}) => ({
    product: onSale._id,
    company: nezal._id,
    user: user(),
    rating,
    comment: `Rated ${rating}`,
    userName: `Customer ${rating}`,
    userEmail: `customer${rating}@example.com`,
    status,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    ...extra,
  })
  await Review.collection.insertMany([
    review(5, "approved", "2026-10-20T10:00:00Z", {
      reply: { message: "Thank you!", repliedAt: new Date("2026-10-21T09:00:00Z"), repliedBy: user(), repliedByName: "Nezal Team" },
    }),
    review(4, "approved", "2026-10-25T10:00:00Z"),
    review(2, "approved", "2026-09-30T10:00:00Z"),
    review(1, "pending", "2026-10-28T10:00:00Z"),
  ])
})

afterAll(async () => {
  await disconnectTestDb()
})

async function apiProduct(id: string) {
  const { GET } = await import("@/app/api/products/[id]/route")
  return GET(new NextRequest(`http://localhost/api/products/${id}`), { params: Promise.resolve({ id }) })
}

async function apiReviews(id: string) {
  const { GET } = await import("@/app/api/products/[id]/reviews/route")
  return GET(new NextRequest(`http://localhost/api/products/${id}/reviews`), { params: Promise.resolve({ id }) })
}

// True when every value is a JSON primitive, plain object or array — no
// ObjectId, Date or Mongoose document left for React to choke on.
function isPlainJson(value: unknown): boolean {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true
  if (Array.isArray(value)) return value.every(isPlainJson)
  if (typeof value === "object") {
    return Object.getPrototypeOf(value) === Object.prototype && Object.values(value as object).every(isPlainJson)
  }
  return false
}

describe("getProductDetail", () => {
  it("returns exactly what the API route used to send", async () => {
    for (const product of [onSale, orphan, plain]) {
      const id = product._id.toString()
      expect(await getProductDetail(id)).toEqual(await legacyProduct(id))
    }
  })

  it("applies the flash sale and populates company, category and collection sale", async () => {
    const product: any = await getProductDetail(onSale._id.toString())
    expect(product.discountPrice).toBe(750)
    expect(product.flashSale).toMatchObject({ saleName: "Diwali Flash", discountPercent: 25 })
    expect(product.company).toMatchObject({ name: "Nezal", slug: "nezal" })
    expect(product.category).toMatchObject({ name: "Face Care", slug: "face-care" })
    expect(product.collectionSaleId).toMatchObject({ name: "Monsoon Edit", slug: "monsoon" })
    expect(product.sizes).toHaveLength(2)
  })

  it("falls back to an Unknown company and a null category", async () => {
    const product: any = await getProductDetail(orphan._id.toString())
    expect(product.company).toEqual({ name: "Unknown", slug: "unknown" })
    expect(product.category).toBeNull()
  })

  it("is plain JSON: ids and dates are strings", async () => {
    const product: any = await getProductDetail(onSale._id.toString())
    expect(isPlainJson(product)).toBe(true)
    expect(product._id).toBe(onSale._id.toString())
    expect(typeof product.sizes[0]._id).toBe("string")
    expect(typeof product.company._id).toBe("string")
    expect(product.directSaleAppliedAt).toBe("2026-10-01T00:00:00.000Z")
    expect(typeof product.createdAt).toBe("string")
  })

  it("returns null for a product that doesn't exist", async () => {
    expect(await getProductDetail(missingId)).toBeNull()
  })

  it("isValidProductId accepts ObjectIds only", () => {
    expect(isValidProductId(onSale._id.toString())).toBe(true)
    expect(isValidProductId("not-a-product")).toBe(false)
    expect(isValidProductId("")).toBe(false)
  })
})

describe("GET /api/products/[id] after the move", () => {
  it("sends the same body as before", async () => {
    for (const product of [onSale, orphan, plain]) {
      const id = product._id.toString()
      const res = await apiProduct(id)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(await legacyProduct(id))
    }
  })

  it("still answers 404 for a missing product", async () => {
    const res = await apiProduct(missingId)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Product not found" })
  })
})

describe("getProductReviews", () => {
  it("returns exactly what the reviews route used to send", async () => {
    for (const product of [onSale, noReviews]) {
      const id = product._id.toString()
      expect(await getProductReviews(id)).toEqual(await legacyReviews(id))
    }
  })

  it("approved reviews only, newest first, with the summary and no emails", async () => {
    const { reviews, summary } = await getProductReviews(onSale._id.toString())
    expect(reviews.map((r: any) => r.rating)).toEqual([4, 5, 2])
    expect(summary).toEqual({ total: 3, averageRating: 3.7, ratingCounts: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 } })
    expect(reviews[1].reply).toMatchObject({ message: "Thank you!", repliedAt: "2026-10-21T09:00:00.000Z" })
    expect(JSON.stringify(reviews)).not.toContain("@example.com")
    expect(isPlainJson({ reviews, summary })).toBe(true)
  })

  it("an empty summary for a product without reviews", async () => {
    expect(await getProductReviews(noReviews._id.toString())).toEqual({
      reviews: [],
      summary: { total: 0, averageRating: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    })
  })

  it("the GET route sends the same body as before", async () => {
    const id = onSale._id.toString()
    const res = await apiReviews(id)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(await legacyReviews(id))
    expect((await apiReviews("not-a-product")).status).toBe(400)
  })
})
