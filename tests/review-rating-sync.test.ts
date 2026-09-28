// Product.rating / Product.reviewCount are a stored snapshot of APPROVED
// reviews (lib/syncProductRating.ts). Every route that changes a review's
// rating or visibility must refresh it.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { syncProductRating } from "@/lib/syncProductRating"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
import { getServerSession } from "next-auth"

let adminReview: typeof import("@/app/api/admin/reviews/[id]/route")
let productReviews: typeof import("@/app/api/products/[id]/reviews/route")

beforeAll(async () => {
  await connectTestDb()
  adminReview = await import("@/app/api/admin/reviews/[id]/route")
  productReviews = await import("@/app/api/products/[id]/reviews/route")
})

afterAll(async () => {
  await disconnectTestDb()
})

let product: any

beforeEach(async () => {
  await Promise.all([Review.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin", role: "admin" } } as any)
  product = await Product.create({
    name: "Rose Soap",
    slug: "rose-soap",
    price: 100,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-RS",
  })
})

async function addReview(rating: number, status: "pending" | "approved" | "rejected", userId = new mongoose.Types.ObjectId()) {
  return Review.create({
    product: product._id,
    company: product.company,
    user: userId,
    rating,
    comment: `Rated ${rating}`,
    userName: "Reviewer",
    userEmail: "reviewer@example.com",
    status,
  })
}

async function snapshot() {
  const p: any = await Product.findById(product._id).lean()
  return { rating: p.rating, reviewCount: p.reviewCount }
}

const ctx = (id: any) => ({ params: Promise.resolve({ id: String(id) }) })
const patch = (id: any, action: string) =>
  adminReview.PATCH(
    new NextRequest(`http://localhost/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    ctx(id),
  )

describe("syncProductRating", () => {
  it("counts only approved reviews", async () => {
    await addReview(5, "approved")
    await addReview(4, "approved")
    await addReview(1, "pending")
    await addReview(1, "rejected")

    await syncProductRating(product._id)
    expect(await snapshot()).toEqual({ rating: 4.5, reviewCount: 2 })
  })

  it("resets to null / 0 when nothing is approved", async () => {
    await addReview(3, "pending")
    await syncProductRating(product._id)
    expect(await snapshot()).toEqual({ rating: null, reviewCount: 0 })
  })
})

describe("admin review routes keep the product rating in sync", () => {
  it("approving a review updates rating and count", async () => {
    await addReview(5, "approved")
    await syncProductRating(product._id)
    const pending = await addReview(2, "pending")

    const res = await patch(pending._id, "approve")
    expect(res.status).toBe(200)
    expect(await snapshot()).toEqual({ rating: 3.5, reviewCount: 2 })
  })

  it("rejecting an approved review removes it from the rating", async () => {
    await addReview(5, "approved")
    const approved = await addReview(1, "approved")
    await syncProductRating(product._id)
    expect(await snapshot()).toEqual({ rating: 3, reviewCount: 2 })

    await patch(approved._id, "reject")
    expect(await snapshot()).toEqual({ rating: 5, reviewCount: 1 })
  })

  it("deleting a review updates rating and count", async () => {
    await addReview(5, "approved")
    const approved = await addReview(3, "approved")
    await syncProductRating(product._id)

    const res = await adminReview.DELETE(new NextRequest(`http://localhost/api/admin/reviews/${approved._id}`), ctx(approved._id))
    expect(res.status).toBe(200)
    expect(await snapshot()).toEqual({ rating: 5, reviewCount: 1 })
  })

  it("deleting the last approved review clears the rating", async () => {
    const only = await addReview(4, "approved")
    await syncProductRating(product._id)

    await adminReview.DELETE(new NextRequest(`http://localhost/api/admin/reviews/${only._id}`), ctx(only._id))
    expect(await snapshot()).toEqual({ rating: null, reviewCount: 0 })
  })
})

describe("public review POST keeps the product rating in sync", () => {
  it("editing an approved review sends it back to pending and drops it from the rating", async () => {
    const customer = await User.create({ email: "c@example.com", name: "Cust", role: "user" })
    await addReview(5, "approved")
    await addReview(1, "approved", customer._id)
    await syncProductRating(product._id)
    expect(await snapshot()).toEqual({ rating: 3, reviewCount: 2 })

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: String(customer._id), role: "user" } } as any)
    const res = await productReviews.POST(
      new NextRequest(`http://localhost/api/products/${product._id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: 4, comment: "Changed my mind", userName: "Cust", userEmail: "c@example.com" }),
      }),
      ctx(product._id),
    )
    expect(res.status).toBe(200)
    expect(await snapshot()).toEqual({ rating: 5, reviewCount: 1 })
  })
})
