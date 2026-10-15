// Tests for lib/cart-live-prices.ts — how the cart and checkout refresh stale
// stored prices (hooks/use-live-cart-prices.ts). The refreshed price must be
// exactly what POST /api/orders charges, so these tests place a real order and
// compare: plain price, direct sale, per-size price, per-size manual discount,
// size + direct sale, and flash sale.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Product } from "@/lib/models/product"
import { Order } from "@/lib/models/order"
import { FlashSale } from "@/lib/models/flashsale"
import type { CartItem } from "@/lib/store/cart-store"
import { repriceCartItems, cartItemKey } from "@/lib/cart-live-prices"
import { connectTestDb, disconnectTestDb } from "./setup-db"

// /api/products imports the NextAuth route handler, so the default export is needed too
vi.mock("next-auth", () => ({ default: vi.fn(() => vi.fn()), getServerSession: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue(""),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
  getPaymentFailedEmail: vi.fn().mockReturnValue(""),
  getAbandonedPaymentEmail: vi.fn().mockReturnValue(""),
}))
vi.mock("@/lib/shiprocket", () => ({ autoCreateShiprocketOrder: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/meta-capi", () => ({
  getRequestMeta: vi.fn().mockReturnValue({ clientIp: "", userAgent: "", fbp: "", fbc: "", eventSourceUrl: "" }),
  sendCapiPurchaseEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/syncUserContact", () => ({ syncUserContactFromOrder: vi.fn().mockResolvedValue(undefined) }))
// Never reach the real WhatsApp API from a test
vi.mock("@/lib/whatsapp-order", () => ({ sendOrderConfirmationWhatsApp: vi.fn().mockResolvedValue(undefined) }))

const company = new mongoose.Types.ObjectId()
const size = (s: string, quantity: number, price: number, sku: string, extra: object = {}) =>
  ({ size: s, unit: "ml" as const, quantity, price, stock: 10, sku, ...extra })

let plain: any, onSale: any, sized: any, sizedOnSale: any, flash: any

// The cart's stored (stale) view of each line, as the product page added it
let staleCart: CartItem[]

beforeAll(async () => {
  await connectTestDb()

  plain = await Product.create({ name: "Plain", slug: "plain", sku: "P", price: 500, company, stock: 20 })
  onSale = await Product.create({ name: "On Sale", slug: "on-sale", sku: "S", price: 400, salePercentage: 20, company, stock: 20 })
  sized = await Product.create({
    name: "Sized", slug: "sized", sku: "Z", price: 300, company, stock: 20,
    sizes: [size("100", 100, 300, "Z-100"), size("200", 200, 550, "Z-200", { discountPrice: 499 })],
  })
  sizedOnSale = await Product.create({
    name: "Sized On Sale", slug: "sized-on-sale", sku: "Y", price: 1000, salePercentage: 10, company, stock: 20,
    sizes: [size("50", 50, 1000, "Y-50")],
  })
  flash = await Product.create({ name: "Flash", slug: "flash", sku: "F", price: 800, company, stock: 20 })
  const now = Date.now()
  await FlashSale.create({
    name: "Flash", discountPercent: 25, products: [flash._id],
    startsAt: new Date(now - 60_000), endsAt: new Date(now + 3_600_000),
  })

  const item = (p: any, price: number, extra: Partial<CartItem> = {}): CartItem =>
    ({ productId: p._id.toString(), name: p.name, image: "", quantity: 1, price, ...extra })

  staleCart = [
    item(plain, 450),                                                     // price went up → 500
    item(onSale, 400, { discountPrice: 300 }),                            // sale changed → 320
    item(sized, 300, { selectedSize: size("100", 100, 300, "Z-100") }),   // unchanged
    item(sized, 550, { discountPrice: 520, selectedSize: size("200", 200, 550, "Z-200", { discountPrice: 520 }) }), // → 499
    item(sizedOnSale, 1000, { selectedSize: size("50", 50, 1000, "Y-50") }), // sale started → 900
    item(flash, 800),                                                     // flash sale → 600
  ]
})

afterAll(async () => {
  await disconnectTestDb()
})

async function liveProducts(ids: string[]) {
  const { GET } = await import("@/app/api/products/route")
  const res = await GET(new NextRequest(`http://localhost/api/products?ids=${ids.join(",")}`))
  return (await res.json()).products
}

async function placeCodOrder(items: CartItem[]) {
  const { POST } = await import("@/app/api/orders/route")
  const res = await POST(new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((i) => ({ product: i.productId, quantity: i.quantity, selectedSize: i.selectedSize })),
      shippingAddress: {
        name: "Test", email: "guest@test.com", phone: "9876543210",
        street: "1 Main St", city: "Mumbai", state: "MH", zipCode: "400001", country: "India",
      },
      totalAmount: 0,
      paymentMethod: "cod",
    }),
  }))
  expect(res.status).toBe(201)
  const { orderId } = await res.json()
  return Order.findById(orderId).lean<any>()
}

describe("repriceCartItems", () => {
  it("refreshes every line to exactly what POST /api/orders charges", async () => {
    const products = await liveProducts(staleCart.map((i) => i.productId))
    const { items } = repriceCartItems(staleCart, products)

    const order = await placeCodOrder(staleCart)
    const charged = order.items.map((i: any) => i.price)
    expect(items.map((i) => i.discountPrice || i.price)).toEqual(charged)
    expect(charged).toEqual([500, 320, 300, 499, 900, 600])
  })

  it("reports each changed line once, from the shown price to the new one", async () => {
    const products = await liveProducts(staleCart.map((i) => i.productId))
    const { changes } = repriceCartItems(staleCart, products)

    expect(changes).toEqual({
      [cartItemKey(staleCart[0])]: { from: 450, to: 500 },
      [cartItemKey(staleCart[1])]: { from: 300, to: 320 },
      [cartItemKey(staleCart[3])]: { from: 520, to: 499 },
      [cartItemKey(staleCart[4])]: { from: 1000, to: 900 },
      [cartItemKey(staleCart[5])]: { from: 800, to: 600 },
    })
  })

  it("leaves unchanged lines untouched and carries the flash sale onto the line", async () => {
    const products = await liveProducts(staleCart.map((i) => i.productId))
    const { items } = repriceCartItems(staleCart, products)

    expect(items[2]).toBe(staleCart[2]) // same object — nothing silently rewritten
    expect(items[5].flashSale?.discountPercent).toBe(25)
    expect(items[3].selectedSize).toMatchObject({ size: "200", price: 550, discountPrice: 499 })
  })

  it("is a no-op on an already-fresh cart, so the refresh settles", async () => {
    const products = await liveProducts(staleCart.map((i) => i.productId))
    const once = repriceCartItems(staleCart, products).items
    const twice = repriceCartItems(once, products)
    expect(twice.changes).toEqual({})
    twice.items.forEach((item, i) => expect(item).toBe(once[i]))
  })

  it("leaves lines alone when the product or the size no longer exists", async () => {
    const products = await liveProducts([sized._id.toString()])
    const gone: CartItem = { productId: new mongoose.Types.ObjectId().toString(), name: "Gone", image: "", quantity: 1, price: 10 }
    const missingSize: CartItem = {
      productId: sized._id.toString(), name: "Sized", image: "", quantity: 1, price: 10,
      selectedSize: size("999", 999, 10, "Z-999"),
    }
    const { items, changes } = repriceCartItems([gone, missingSize], products)
    expect(items[0]).toBe(gone)
    expect(items[1]).toBe(missingSize)
    expect(changes).toEqual({})
  })
})
