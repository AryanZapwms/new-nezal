// Integration tests for app/api/admin/carts/route.ts — admin-only visibility
// into the cart mirror. Mirrors the auth pattern already used by
// app/api/admin/orders/route.ts (session -> User lookup -> role check).
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
import { getServerSession } from "next-auth"

let GET: typeof import("@/app/api/admin/carts/route").GET

beforeAll(async () => {
  await connectTestDb()
  ;({ GET } = await import("@/app/api/admin/carts/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
})

async function makeAdmin() {
  return User.create({ email: "admin@nezal.com", name: "Admin", role: "admin" })
}
async function makeCustomer(overrides: Partial<any> = {}) {
  return User.create({ email: "customer@nezal.com", name: "Priya Sharma", role: "user", ...overrides })
}

function request(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(`http://localhost/api/admin/carts${qs ? `?${qs}` : ""}`)
}

describe("GET /api/admin/carts — authorization", () => {
  it("rejects unauthenticated requests", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(request())
    expect(res.status).toBe(401)
  })

  it("rejects non-admin users", async () => {
    const user = await makeCustomer()
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)
    const res = await GET(request())
    expect(res.status).toBe(403)
  })

  it("allows admins", async () => {
    const admin = await makeAdmin()
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: admin.email } } as any)
    const res = await GET(request())
    expect(res.status).toBe(200)
  })
})

describe("GET /api/admin/carts — listing", () => {
  beforeEach(async () => {
    const admin = await makeAdmin()
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: admin.email } } as any)
  })

  it("excludes empty carts", async () => {
    const user = await makeCustomer()
    await Cart.create({ user: user._id, status: "active", items: [] })

    const res = await GET(request())
    const data = await res.json()
    expect(data.total).toBe(0)
  })

  it("excludes converted carts from the default (active) filter", async () => {
    const product = await Product.create({
      name: "Face Wash",
      slug: "face-wash",
      price: 200,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-FW",
      stock: 10,
    })
    const user = await makeCustomer()
    await Cart.create({
      user: user._id,
      status: "converted",
      items: [{ product: product._id, quantity: 1 }],
      convertedAt: new Date(),
    })

    const res = await GET(request({ status: "active" }))
    const data = await res.json()
    expect(data.total).toBe(0)

    const convertedRes = await GET(request({ status: "converted" }))
    const convertedData = await convertedRes.json()
    expect(convertedData.total).toBe(1)
  })

  it("only surfaces active carts idle 24h+ under the abandoned filter", async () => {
    const product = await Product.create({
      name: "Lip Balm",
      slug: "lip-balm",
      price: 100,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-LB",
      stock: 10,
    })
    const user = await makeCustomer()
    const recentUser = await User.create({ email: "recent@nezal.com", name: "Recent Shopper", role: "user" })

    await Cart.create({
      user: user._id,
      status: "active",
      items: [{ product: product._id, quantity: 1 }],
      lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
    })
    await Cart.create({
      user: recentUser._id,
      status: "active",
      items: [{ product: product._id, quantity: 1 }],
      lastActivityAt: new Date(), // just now
    })

    const abandonedRes = await GET(request({ status: "abandoned" }))
    const abandonedData = await abandonedRes.json()
    expect(abandonedData.total).toBe(1)
    expect(abandonedData.carts[0].customer.name).toBe("Priya Sharma")

    const activeRes = await GET(request({ status: "active" }))
    const activeData = await activeRes.json()
    expect(activeData.total).toBe(2) // "active" includes both recent and stale-but-still-active
  })

  it("shows guest carts as 'Guest' without leaking the raw token", async () => {
    const product = await Product.create({
      name: "Shampoo",
      slug: "shampoo",
      price: 350,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-SH",
      stock: 10,
    })
    await Cart.create({ guestToken: "secret-guest-token-123", status: "active", items: [{ product: product._id, quantity: 1 }] })

    const res = await GET(request())
    const data = await res.json()
    expect(data.carts[0].customer).toMatchObject({ type: "guest", name: "Guest" })
    expect(JSON.stringify(data)).not.toContain("secret-guest-token-123")
  })

  it("searches by customer name/email", async () => {
    const product = await Product.create({
      name: "Toner",
      slug: "toner",
      price: 220,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-TN",
      stock: 10,
    })
    const match = await makeCustomer()
    const noMatch = await User.create({ email: "other@nezal.com", name: "Someone Else", role: "user" })
    await Cart.create({ user: match._id, status: "active", items: [{ product: product._id, quantity: 1 }] })
    await Cart.create({ user: noMatch._id, status: "active", items: [{ product: product._id, quantity: 1 }] })

    const res = await GET(request({ search: "priya" }))
    const data = await res.json()
    expect(data.total).toBe(1)
    expect(data.carts[0].customer.name).toBe("Priya Sharma")
  })

  it("paginates results", async () => {
    const product = await Product.create({
      name: "Body Lotion",
      slug: "body-lotion",
      price: 280,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-BL",
      stock: 100,
    })
    for (let i = 0; i < 5; i++) {
      const u = await User.create({ email: `user${i}@nezal.com`, name: `User ${i}`, role: "user" })
      await Cart.create({ user: u._id, status: "active", items: [{ product: product._id, quantity: 1 }] })
    }

    const res = await GET(request({ page: "1", limit: "2" }))
    const data = await res.json()
    expect(data.carts).toHaveLength(2)
    expect(data.total).toBe(5)
    expect(data.totalPages).toBe(3)
  })

  it("computes cart total using the size-specific price when a size is selected", async () => {
    const product = await Product.create({
      name: "Multi-size Cream",
      slug: "multi-size-cream",
      price: 999, // base price should be ignored in favor of the selected size's price
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-MSC",
      stock: 10,
    })
    const user = await makeCustomer()
    await Cart.create({
      user: user._id,
      status: "active",
      items: [{ product: product._id, quantity: 2, selectedSize: { size: "50g", unit: "g", price: 150, discountPrice: 120 } }],
    })

    const res = await GET(request())
    const data = await res.json()
    expect(data.carts[0].cartTotal).toBe(240) // 120 * 2, not 999 * 2
  })
})
