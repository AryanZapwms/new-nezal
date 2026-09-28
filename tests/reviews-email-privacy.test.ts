// Public review endpoints must never expose reviewer emails. Emails are only
// available through the admin-protected routes under app/api/admin/reviews/**.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import "@/lib/models/company"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
// These routes import authOptions from the NextAuth route, which calls NextAuth() at import time.
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
import { getServerSession } from "next-auth"

let productReviews: typeof import("@/app/api/products/[id]/reviews/route")
let allReviews: typeof import("@/app/api/products/reviews/all/route")
let adminReviews: typeof import("@/app/api/admin/reviews/route")

const REVIEWER_EMAIL = "reviewer.secret@example.com"
const SUBMITTER_EMAIL = "submitter.secret@example.com"

beforeAll(async () => {
  await connectTestDb()
  productReviews = await import("@/app/api/products/[id]/reviews/route")
  allReviews = await import("@/app/api/products/reviews/all/route")
  adminReviews = await import("@/app/api/admin/reviews/route")
})

afterAll(async () => {
  await disconnectTestDb()
})

let productId: string
let companyId: mongoose.Types.ObjectId

beforeEach(async () => {
  await Promise.all([Review.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(getServerSession).mockReset()

  companyId = new mongoose.Types.ObjectId()
  const product = await Product.create({ name: "Rose Soap", slug: "rose-soap", price: 100, company: companyId, sku: "SKU-RS" })
  productId = product._id.toString()
  const reviewer = await User.create({ email: REVIEWER_EMAIL, name: "Ananya", role: "user" })
  await Review.create({
    product: product._id,
    company: companyId,
    user: reviewer._id,
    rating: 5,
    comment: "Lovely soap",
    userName: "Ananya",
    userEmail: REVIEWER_EMAIL,
    status: "approved",
  })
})

// Walks the whole JSON body so a nested field (e.g. a populated user) can't slip through.
function emailKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => emailKeys(v, `${path}[${i}]`))
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [
      ...(/email/i.test(k) ? [`${path}.${k}`] : []),
      ...emailKeys(v, `${path}.${k}`),
    ])
  }
  return []
}

function expectNoEmails(body: unknown, ...emails: string[]) {
  expect(emailKeys(body)).toEqual([])
  const raw = JSON.stringify(body)
  for (const email of emails) expect(raw).not.toContain(email)
}

describe("public review endpoints never return emails", () => {
  it("GET /api/products/[id]/reviews", async () => {
    const res = await productReviews.GET(new NextRequest(`http://localhost/api/products/${productId}/reviews`), {
      params: Promise.resolve({ id: productId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews).toHaveLength(1)
    expect(body.reviews[0].userName).toBe("Ananya")
    expectNoEmails(body, REVIEWER_EMAIL)
  })

  it("POST /api/products/[id]/reviews response", async () => {
    const submitter = await User.create({ email: SUBMITTER_EMAIL, name: "Rahul", role: "user" })
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: submitter._id.toString(), name: "Rahul", email: SUBMITTER_EMAIL },
    } as any)

    const res = await productReviews.POST(
      new NextRequest(`http://localhost/api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: 4, comment: "Nice", userName: "Rahul", userEmail: SUBMITTER_EMAIL }),
      }),
      { params: Promise.resolve({ id: productId }) },
    )
    expect(res.status).toBe(201)
    expectNoEmails(await res.json(), SUBMITTER_EMAIL, REVIEWER_EMAIL)

    // The email is still stored for admins.
    const stored = await Review.findOne({ user: submitter._id }).lean()
    expect((stored as any).userEmail).toBe(SUBMITTER_EMAIL)
  })

  it("GET /api/products/reviews/all", async () => {
    const res = await allReviews.GET(new NextRequest("http://localhost/api/products/reviews/all?limit=50"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews).toHaveLength(1)
    expect(body.reviews[0].customerName).toBe("Ananya")
    expectNoEmails(body, REVIEWER_EMAIL)
  })
})

describe("admin reviews endpoint keeps emails behind admin auth", () => {
  const adminRequest = () => new NextRequest("http://localhost/api/admin/reviews?status=all")

  it("rejects anonymous and non-admin users", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await adminReviews.GET(adminRequest())).status).toBe(403)

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "x", role: "user" } } as any)
    expect((await adminReviews.GET(adminRequest())).status).toBe(403)
  })

  it("returns reviewer emails to admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin", role: "admin" } } as any)
    const res = await adminReviews.GET(adminRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews[0].userEmail).toBe(REVIEWER_EMAIL)
  })
})
