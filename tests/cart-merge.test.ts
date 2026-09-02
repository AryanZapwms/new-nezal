// Integration tests for app/api/cart/merge/route.ts — guest cart -> logged-in
// user cart merge, including the duplicate-item quantity-summing + stock-cap
// example from the feature spec (guest x3 + account x2, stock 4 -> result 4).
//
// resolveCartIdentity (lib/cart-server.ts) resolves the logged-in identity
// via User.findOne({email}) rather than trusting session.user.id, so every
// "logged in" case here needs a real User document behind the mocked
// session's email, not just a bare ObjectId.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
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
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
})

function makeRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/cart/merge", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  })
}

async function loginAs(email: string, name = "Test User") {
  const user = await User.create({ email, name, role: "user" })
  vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)
  return user
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
    const user = await User.create({ email: "a@test.com", name: "A", role: "user" })

    await Cart.create({ guestToken: "guest-1", status: "active", items: [{ product: product._id, quantity: 3 }] })
    await Cart.create({ user: user._id, status: "active", items: [{ product: product._id, quantity: 2 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)
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
    const user = await User.create({ email: "b@test.com", name: "B", role: "user" })

    await Cart.create({ guestToken: "guest-2", status: "active", items: [{ product: productB._id, quantity: 1 }] })
    await Cart.create({ user: user._id, status: "active", items: [{ product: productA._id, quantity: 1 }] })

    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)
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
    const guestCart = await Cart.create({ guestToken: "guest-3", status: "active", items: [{ product: product._id, quantity: 1 }] })

    await loginAs("c@test.com", "C")
    const res = await POST(makeRequest("nezal-cart-token=guest-3"))

    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toMatch(/nezal-cart-token=;/)

    const updatedGuestCart = await Cart.findById(guestCart._id)
    expect(updatedGuestCart!.status).toBe("merged")

    // No duplicate active cart under the same guest token.
    expect(await Cart.countDocuments({ guestToken: "guest-3", status: "active" })).toBe(0)
  })

  it("is a harmless no-op (still 200) when the user has no guest cart cookie", async () => {
    await loginAs("d@test.com", "D")

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toEqual([])
  })

  it("drops an item whose product no longer exists", async () => {
    const ghostProductId = new mongoose.Types.ObjectId()
    await Cart.create({ guestToken: "guest-4", status: "active", items: [{ product: ghostProductId, quantity: 1 }] })

    await loginAs("e@test.com", "E")
    const res = await POST(makeRequest("nezal-cart-token=guest-4"))
    const data = await res.json()

    expect(data.items).toEqual([])
  })

  it("resolves the correct user even though session.user.id is absent (matches the codebase's email-lookup identity pattern)", async () => {
    const product = await Product.create({
      name: "Product F",
      slug: "product-f",
      price: 90,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-F",
      stock: 10,
    })
    const user = await User.create({ email: "f@test.com", name: "F", role: "user" })
    // Deliberately no `id` field on session.user — this is the shape that
    // previously caused logged-in customers' carts to be treated as guest.
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email, name: user.name } } as any)

    await Cart.create({ guestToken: "guest-6", status: "active", items: [{ product: product._id, quantity: 1 }] })

    const res = await POST(makeRequest("nezal-cart-token=guest-6"))
    expect(res.status).toBe(200)

    const userCart = await Cart.findOne({ user: user._id })
    expect(userCart).toBeTruthy()
    expect(userCart!.items).toHaveLength(1)
  })
})
