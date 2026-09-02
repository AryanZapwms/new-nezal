// Integration tests for lib/cart-server.ts against a real (in-memory) Mongo,
// covering identity->cart resolution, active-cart creation/reuse, and item
// sanitization — the core building blocks the /api/cart* routes sit on top of.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import {
  getOrCreateActiveCart,
  findActiveCart,
  markCartConverted,
  sanitizeCartItems,
  type CartIdentity,
} from "@/lib/cart-server"
import { connectTestDb, disconnectTestDb } from "./setup-db"

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
})

async function makeProduct(overrides: Partial<any> = {}) {
  return Product.create({
    name: "Vitamin C Serum",
    slug: "vitamin-c-serum",
    price: 500,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-VCS",
    stock: 20,
    ...overrides,
  })
}

describe("getOrCreateActiveCart", () => {
  it("creates a new active cart for a logged-in user identity", async () => {
    const userId = new mongoose.Types.ObjectId().toString()
    const identity: CartIdentity = { kind: "user", userId }

    const { cart, newGuestToken } = await getOrCreateActiveCart(identity)

    expect(newGuestToken).toBeNull()
    expect(cart.user.toString()).toBe(userId)
    expect(cart.status).toBe("active")
    expect(cart.items).toHaveLength(0)
  })

  it("reuses the same active cart on a second call for the same user", async () => {
    const identity: CartIdentity = { kind: "user", userId: new mongoose.Types.ObjectId().toString() }

    const first = await getOrCreateActiveCart(identity)
    const second = await getOrCreateActiveCart(identity)

    expect(second.cart._id.toString()).toBe(first.cart._id.toString())
    expect(await Cart.countDocuments({ user: (identity as any).userId })).toBe(1)
  })

  it("mints a new guest token when the identity has none, and reuses the cart once the token is known", async () => {
    const identity: CartIdentity = { kind: "guest", guestToken: null }

    const { cart, newGuestToken } = await getOrCreateActiveCart(identity)
    expect(newGuestToken).toBeTruthy()
    expect(cart.guestToken).toBe(newGuestToken)

    const second = await getOrCreateActiveCart({ kind: "guest", guestToken: newGuestToken })
    expect(second.newGuestToken).toBeNull()
    expect(second.cart._id.toString()).toBe(cart._id.toString())
  })

  it("starts a fresh active cart if the identity's previous cart already converted", async () => {
    const userId = new mongoose.Types.ObjectId().toString()
    const identity: CartIdentity = { kind: "user", userId }

    const { cart: firstCart } = await getOrCreateActiveCart(identity)
    await markCartConverted(firstCart._id, new mongoose.Types.ObjectId())

    const { cart: secondCart } = await getOrCreateActiveCart(identity)
    expect(secondCart._id.toString()).not.toBe(firstCart._id.toString())
    expect(secondCart.status).toBe("active")

    const stored = await Cart.findById(firstCart._id)
    expect(stored!.status).toBe("converted")
  })
})

describe("findActiveCart", () => {
  it("returns null for a guest identity with no token, without creating anything", async () => {
    const result = await findActiveCart({ kind: "guest", guestToken: null })
    expect(result).toBeNull()
    expect(await Cart.countDocuments({})).toBe(0)
  })

  it("returns null for a user/guest with no existing cart, without creating anything", async () => {
    const result = await findActiveCart({ kind: "user", userId: new mongoose.Types.ObjectId().toString() })
    expect(result).toBeNull()
    expect(await Cart.countDocuments({})).toBe(0)
  })
})

describe("markCartConverted", () => {
  it("flips an active cart to converted and links the order", async () => {
    const product = await makeProduct()
    const identity: CartIdentity = { kind: "user", userId: new mongoose.Types.ObjectId().toString() }
    const { cart } = await getOrCreateActiveCart(identity)
    cart.items = [{ product: product._id, quantity: 2 } as any]
    await cart.save()

    const orderId = new mongoose.Types.ObjectId()
    await markCartConverted(cart._id, orderId)

    const updated = await Cart.findById(cart._id)
    expect(updated!.status).toBe("converted")
    expect(updated!.convertedOrderId!.toString()).toBe(orderId.toString())
    expect(updated!.convertedAt).toBeTruthy()
  })

  it("is a no-op when cartId is null/undefined (e.g. a failed/abandoned CCAvenue payment)", async () => {
    await expect(markCartConverted(null, new mongoose.Types.ObjectId())).resolves.not.toThrow()
  })
})

describe("sanitizeCartItems", () => {
  it("keeps structurally valid items and drops invalid ones", () => {
    const validId = new mongoose.Types.ObjectId().toString()
    const result = sanitizeCartItems([
      { product: validId, quantity: 2 },
      { product: "not-an-object-id", quantity: 1 }, // invalid product id
      { product: validId, quantity: 0 }, // invalid quantity
      { product: validId, quantity: -5 }, // invalid quantity
      "garbage", // not an object
      null,
      { product: validId, quantity: 5000 }, // clamped, not dropped
    ])

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ product: validId, quantity: 2 })
    expect(result[1].quantity).toBeLessThanOrEqual(999)
  })

  it("returns an empty array for non-array input", () => {
    expect(sanitizeCartItems(undefined)).toEqual([])
    expect(sanitizeCartItems({})).toEqual([])
  })

  it("carries through selectedSize/flashSale/ritual when present", () => {
    const productId = new mongoose.Types.ObjectId().toString()
    const [item] = sanitizeCartItems([
      {
        product: productId,
        quantity: 1,
        selectedSize: { size: "100ml", unit: "ml", quantity: 100, price: 400, stock: 5, sku: "SKU-1" },
        flashSale: { saleId: "sale1", saleName: "Flash Friday", discountPercent: 20, endsAt: "2026-01-01" },
        ritual: { slug: "morning-glow", name: "Morning Glow" },
      },
    ])

    expect(item.selectedSize).toMatchObject({ size: "100ml", unit: "ml", price: 400 })
    expect(item.flashSale).toMatchObject({ saleId: "sale1", discountPercent: 20 })
    expect(item.ritual).toMatchObject({ slug: "morning-glow" })
  })
})
