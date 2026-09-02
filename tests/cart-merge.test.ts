// Integration tests for app/api/cart/merge/route.ts — guest cart -> logged-in
// user cart merge, including the duplicate-item quantity-summing + stock-cap
// example from the feature spec (guest x3 + account x2, stock 4 -> result 4).
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
import { getServerSession } from "next-auth"

let POST: typeof import("@/app/api/cart/merge/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ POST } = await import("@/app/api/cart/merge/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
})

function makeRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/cart/merge", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  })
}

describe("POST /api/cart/merge", () => {
  it("requires an authenticated session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it("sums duplicate item quantities and caps at current stock (guest x3 + account x2, stock 4 -> 4)", async () => {
    const product = await Product.create({
      name: "Serum",
      slug: "serum",
      price: 500,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-SERUM",
      stock: 4,
    })
    const userId = new mongoose.Types.ObjectId()

    await Cart.create({ guestToken: "guest-1", status: "active", items: [{ product: product._id, quantity: 3 }] })
    await Cart.create({ user: userId, status: "active", items: [{ product: product._id, quantity: 2 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId.toString(), email: "a@test.com" } } as any)
    const res = await POST(makeRequest("nezal-cart-token=guest-1"))
    const data = await res.json()

    expect(data.items).toHaveLength(1)
    expect(data.items[0].quantity).toBe(4) // capped at stock, not 5
  })

  it("appends non-overlapping guest items to the user's cart", async () => {
    const productA = await Product.create({
      name: "Product A",
      slug: "product-a",
      price: 100,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-A",
      stock: 10,
    })
    const productB = await Product.create({
      name: "Product B",
      slug: "product-b",
      price: 200,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-B",
      stock: 10,
    })
    const userId = new mongoose.Types.ObjectId()

    await Cart.create({ guestToken: "guest-2", status: "active", items: [{ product: productB._id, quantity: 1 }] })
    await Cart.create({ user: userId, status: "active", items: [{ product: productA._id, quantity: 1 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId.toString(), email: "b@test.com" } } as any)
    const res = await POST(makeRequest("nezal-cart-token=guest-2"))
    const data = await res.json()

    expect(data.items).toHaveLength(2)
  })

  it("marks the guest cart merged (not deletable/active) and clears the guest cookie", async () => {
    const product = await Product.create({
      name: "Product C",
      slug: "product-c",
      price: 150,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-C",
      stock: 10,
    })
    const userId = new mongoose.Types.ObjectId()
    const guestCart = await Cart.create({ guestToken: "guest-3", status: "active", items: [{ product: product._id, quantity: 1 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId.toString(), email: "c@test.com" } } as any)
    const res = await POST(makeRequest("nezal-cart-token=guest-3"))

    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toMatch(/nezal-cart-token=;/)

    const updatedGuestCart = await Cart.findById(guestCart._id)
    expect(updatedGuestCart!.status).toBe("merged")

    // No duplicate active cart under the same guest token.
    expect(await Cart.countDocuments({ guestToken: "guest-3", status: "active" })).toBe(0)
  })

  it("is a harmless no-op (still 200) when the user has no guest cart cookie", async () => {
    const userId = new mongoose.Types.ObjectId()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId.toString(), email: "d@test.com" } } as any)

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toEqual([])
  })

  it("drops an item whose product no longer exists", async () => {
    const ghostProductId = new mongoose.Types.ObjectId()
    const userId = new mongoose.Types.ObjectId()
    await Cart.create({ guestToken: "guest-4", status: "active", items: [{ product: ghostProductId, quantity: 1 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId.toString(), email: "e@test.com" } } as any)
    const res = await POST(makeRequest("nezal-cart-token=guest-4"))
    const data = await res.json()

    expect(data.items).toEqual([])
  })
})
