// Integration tests for app/api/cron/abandoned-cart-whatsapp/route.ts —
// specifically the per-cart template choice added on top of the existing
// consent/opt-out/reachability filtering (already covered by manual runs,
// not re-asserted here beyond what's needed to reach the branching logic).
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppTemplate: vi.fn().mockResolvedValue({}) }))
import { sendWhatsAppTemplate } from "@/lib/whatsapp"

let GET: typeof import("@/app/api/cron/abandoned-cart-whatsapp/route").GET

beforeAll(async () => {
  await connectTestDb()
  process.env.CRON_SECRET = "test-cron-secret"
  ;({ GET } = await import("@/app/api/cron/abandoned-cart-whatsapp/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({})])
  vi.mocked(sendWhatsAppTemplate).mockClear()
})

function request() {
  return new NextRequest("http://localhost/api/cron/abandoned-cart-whatsapp", {
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

const STALE = new Date(Date.now() - 60 * 60 * 1000) // 1h ago — past the 30min reminder delay

async function makeProduct(overrides: Partial<any> = {}) {
  return Product.create({
    name: "Face Wash",
    slug: `face-wash-${new mongoose.Types.ObjectId()}`,
    price: 200,
    company: new mongoose.Types.ObjectId(),
    sku: `SKU-${new mongoose.Types.ObjectId()}`,
    stock: 10,
    ...overrides,
  })
}

describe("GET /api/cron/abandoned-cart-whatsapp — auth", () => {
  it("rejects requests without the correct bearer secret", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/abandoned-cart-whatsapp"))
    expect(res.status).toBe(401)
  })
})

describe("GET /api/cron/abandoned-cart-whatsapp — template branching", () => {
  it("sends ecommerce_abandoned_cart with discount/expiry variables when an item's flash sale hasn't expired", async () => {
    const product = await makeProduct({ name: "Vitamin C Serum" })
    const endsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    await Cart.create({
      guestPhone: "9876543210",
      whatsappConsent: true,
      status: "active",
      lastActivityAt: STALE,
      items: [
        {
          product: product._id,
          quantity: 1,
          flashSale: { saleId: "sale1", saleName: "Diwali Sale", discountPercent: 30, endsAt },
        },
      ],
    })

    const res = await GET(request())
    const data = await res.json()
    expect(data.sent).toBe(1)

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
    const call = vi.mocked(sendWhatsAppTemplate).mock.calls[0][0]
    expect(call.templateName).toBe("ecommerce_abandoned_cart")
    expect(call.variables).toEqual(["there", "Vitamin C Serum", "30%", expect.any(String)])
    expect(call.variables[3]).toBe(
      endsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    )
  })

  it("sends cart_reminder_plain with just name/product when no item has an active flash sale", async () => {
    const product = await makeProduct({ name: "Lip Balm" })
    await Cart.create({
      guestPhone: "9876543211",
      whatsappConsent: true,
      status: "active",
      lastActivityAt: STALE,
      items: [{ product: product._id, quantity: 1 }],
    })

    const res = await GET(request())
    const data = await res.json()
    expect(data.sent).toBe(1)

    const call = vi.mocked(sendWhatsAppTemplate).mock.calls[0][0]
    expect(call.templateName).toBe("cart_reminder_plain")
    expect(call.variables).toEqual(["there", "Lip Balm"])
  })

  it("falls back to cart_reminder_plain when the flash sale snapshot has already expired", async () => {
    const product = await makeProduct({ name: "Sunscreen" })
    const expiredEndsAt = new Date(Date.now() - 60 * 60 * 1000) // 1h in the past
    await Cart.create({
      guestPhone: "9876543212",
      whatsappConsent: true,
      status: "active",
      lastActivityAt: STALE,
      items: [
        {
          product: product._id,
          quantity: 1,
          flashSale: { saleId: "sale2", saleName: "Expired Sale", discountPercent: 20, endsAt: expiredEndsAt },
        },
      ],
    })

    const res = await GET(request())
    const call = vi.mocked(sendWhatsAppTemplate).mock.calls[0][0]
    expect(call.templateName).toBe("cart_reminder_plain")
    expect(call.variables).toEqual(["there", "Sunscreen"])
  })

  it("prioritizes the on-sale item over the cart's first item when only a later item qualifies", async () => {
    const plainProduct = await makeProduct({ name: "Shampoo" })
    const saleProduct = await makeProduct({ name: "Conditioner" })
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await Cart.create({
      guestPhone: "9876543213",
      whatsappConsent: true,
      status: "active",
      lastActivityAt: STALE,
      items: [
        { product: plainProduct._id, quantity: 1 }, // first item, no sale
        {
          product: saleProduct._id,
          quantity: 1,
          flashSale: { saleId: "sale3", saleName: "Flash Deal", discountPercent: 15, endsAt },
        },
      ],
    })

    const res = await GET(request())
    const call = vi.mocked(sendWhatsAppTemplate).mock.calls[0][0]
    expect(call.templateName).toBe("ecommerce_abandoned_cart")
    expect(call.variables[1]).toBe("Conditioner") // the on-sale item, not "Shampoo"
  })
})
