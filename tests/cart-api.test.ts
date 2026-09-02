// Integration tests for app/api/cart/route.ts (GET/PUT) — the endpoint
// lib/store/cart-sync.ts calls on every debounced cart mutation, and that
// components/cart-hydrator.tsx reads from on load.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
import { getServerSession } from "next-auth"

let GET: typeof import("@/app/api/cart/route").GET
let PUT: typeof import("@/app/api/cart/route").PUT

beforeAll(async () => {
  await connectTestDb()
  ;({ GET, PUT } = await import("@/app/api/cart/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue(null)
})

function makeGetRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/cart", {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
  })
}

function makePutRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
}

describe("GET /api/cart", () => {
  it("returns an empty cart and sets no cookie for a first-time guest", async () => {
    const res = await GET(makeGetRequest())
    const data = await res.json()

    expect(data.items).toEqual([])
    expect(res.headers.get("set-cookie")).toBeNull()
    expect(await Cart.countDocuments({})).toBe(0)
  })

  it("returns the guest's existing items without creating a duplicate cart", async () => {
    const product = await Product.create({
      name: "Herbal Face Cream",
      slug: "herbal-face-cream",
      price: 300,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-HFC",
      stock: 10,
    })
    const cart = await Cart.create({
      guestToken: "guest-abc",
      status: "active",
      items: [{ product: product._id, quantity: 2 }],
    })

    const res = await GET(makeGetRequest("nezal-cart-token=guest-abc"))
    const data = await res.json()

    expect(data.items).toHaveLength(1)
    expect(data.items[0]).toMatchObject({ productId: product._id.toString(), name: "Herbal Face Cream", quantity: 2 })
    expect(await Cart.countDocuments({})).toBe(1)
    void cart
  })
})

describe("PUT /api/cart", () => {
  it("mints a guest cart token and persists items on first sync", async () => {
    const product = await Product.create({
      name: "Hair Serum",
      slug: "hair-serum",
      price: 450,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-HS",
      stock: 5,
    })

    const res = await PUT(makePutRequest({ items: [{ product: product._id.toString(), quantity: 3 }] }))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(res.headers.get("set-cookie")).toMatch(/nezal-cart-token=/)

    const stored = await Cart.findOne({ status: "active" })
    expect(stored).toBeTruthy()
    expect(stored!.items).toHaveLength(1)
    expect(stored!.items[0].quantity).toBe(3)
    expect(stored!.lastActivityAt).toBeTruthy()
  })

  it("reuses the same guest cart (no new cookie) on a subsequent sync", async () => {
    const product = await Product.create({
      name: "Rose Water Toner",
      slug: "rose-water-toner",
      price: 250,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-RWT",
      stock: 15,
    })

    const first = await PUT(makePutRequest({ items: [{ product: product._id.toString(), quantity: 1 }] }))
    const setCookie = first.headers.get("set-cookie")!
    const token = setCookie.match(/nezal-cart-token=([^;]+)/)![1]

    const second = await PUT(
      makePutRequest({ items: [{ product: product._id.toString(), quantity: 2 }] }, `nezal-cart-token=${token}`),
    )
    expect(second.headers.get("set-cookie")).toBeNull()
    expect(await Cart.countDocuments({})).toBe(1)

    const stored = await Cart.findOne({ guestToken: token })
    expect(stored!.items[0].quantity).toBe(2)
  })

  it("writes to the logged-in user's cart, ignoring any guest cookie", async () => {
    // Session identity is resolved via a User.findOne({email}) lookup (see
    // lib/cart-server.ts resolveCartIdentity) — session.user.id alone is not
    // trusted, so the mocked session must correspond to a real User doc.
    const user = await User.create({ email: "a@test.com", name: "Test User", role: "user" })
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)
    const product = await Product.create({
      name: "Aloe Gel",
      slug: "aloe-gel-2",
      price: 200,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-AG2",
      stock: 8,
    })

    const res = await PUT(makePutRequest({ items: [{ product: product._id.toString(), quantity: 1 }] }, "nezal-cart-token=some-guest-token"))
    expect(res.headers.get("set-cookie")).toBeNull() // logged-in path never touches the guest cookie

    const userCart = await Cart.findOne({ user: user._id })
    expect(userCart).toBeTruthy()
    expect(userCart!.items).toHaveLength(1)
  })

  it("still resolves the logged-in user when session.user.id is absent", async () => {
    // Regression test: session.user.id is not reliably populated by the
    // bare getServerSession() call this codebase uses, so identity must be
    // resolved via email lookup, not by trusting `.id`.
    const user = await User.create({ email: "no-id@test.com", name: "No Id User", role: "user" })
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email, name: user.name } } as any)
    const product = await Product.create({
      name: "Face Serum",
      slug: "face-serum-no-id",
      price: 350,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-FSNI",
      stock: 5,
    })

    await PUT(makePutRequest({ items: [{ product: product._id.toString(), quantity: 1 }] }))

    const userCart = await Cart.findOne({ user: user._id })
    expect(userCart).toBeTruthy()
    expect(userCart!.items).toHaveLength(1)
    expect(await Cart.countDocuments({ guestToken: { $ne: null } })).toBe(0) // must not have fallen back to a guest cart
  })

  it("drops structurally invalid items instead of persisting them", async () => {
    const validId = new mongoose.Types.ObjectId().toString()
    const res = await PUT(
      makePutRequest({
        items: [
          { product: validId, quantity: 1 },
          { product: "not-a-valid-id", quantity: 1 },
          { product: validId, quantity: -3 },
        ],
      }),
    )
    const data = await res.json()
    expect(data.itemCount).toBe(1)
  })

  it("empties the cart on an empty sync (e.g. after clearCart())", async () => {
    const product = await Product.create({
      name: "Sunscreen",
      slug: "sunscreen",
      price: 350,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-SUN",
      stock: 12,
    })
    const first = await PUT(makePutRequest({ items: [{ product: product._id.toString(), quantity: 1 }] }))
    const token = first.headers.get("set-cookie")!.match(/nezal-cart-token=([^;]+)/)![1]

    await PUT(makePutRequest({ items: [] }, `nezal-cart-token=${token}`))

    const stored = await Cart.findOne({ guestToken: token })
    expect(stored!.items).toHaveLength(0)
    expect(stored!.status).toBe("active") // still active, just empty — never "abandoned" for being empty
  })
})
