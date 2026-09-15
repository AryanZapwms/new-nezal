// Integration tests for the coupon handling added to app/api/orders/route.ts
// (Stage 1 of the CCAvenue pre-discount-amount fix). Two things under test:
//   1. A stale/invalid coupon rejects the order with 400 and leaves the
//      request's side effects at zero — no Order, no Cart, no Coupon
//      mutation. This matters because the coupon check runs BEFORE
//      getOrCreateActiveCart/Order.create in the route, specifically so a
//      rejection can't leave anything partially written.
//   2. redeemCoupon() is called for COD before the Order is created (not
//      after), so a lost race against another concurrent COD order for the
//      same last-remaining coupon slot aborts cleanly — same zero-side-effect
//      guarantee — rather than leaving stock/order/coupon state inconsistent.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { Coupon } from "@/lib/models/coupon"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
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

import { getServerSession } from "next-auth"

let ordersPOST: typeof import("@/app/api/orders/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ POST: ordersPOST } = await import("@/app/api/orders/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([
    Cart.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
  ])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue(null)
})

async function makeProduct(overrides: Partial<any> = {}) {
  return Product.create({
    name: "Vitamin C Serum",
    slug: "vitamin-c-serum-orders-coupon",
    price: 500,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-VCS-OC",
    stock: 20,
    ...overrides,
  })
}

function shippingAddress(email = "guest@test.com") {
  return {
    name: "Test Customer",
    email,
    phone: "9876543210",
    street: "123 Main St",
    city: "Mumbai",
    state: "MH",
    zipCode: "400001",
    country: "India",
  }
}

function makeOrderRequest(body: unknown) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("stale coupon at order creation — rejects with zero side effects", () => {
  it("400s when the coupon has already hit its usage limit, and writes nothing", async () => {
    const product = await makeProduct()
    await Coupon.create({
      code: "STALE10",
      discountType: "percentage",
      discountValue: 10,
      maxUses: 1,
      usedCount: 1, // already exhausted — this is the "went stale between Apply and Pay" case
    })

    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 450, // client's stale discounted total — must be ignored
        paymentMethod: "cod",
        couponCode: "STALE10",
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/usage limit/i)

    // Zero side effects: the coupon block runs before getOrCreateActiveCart
    // and Order.create in app/api/orders/route.ts, so a rejection here must
    // leave literally nothing behind.
    expect(await Order.countDocuments({})).toBe(0)
    expect(await Cart.countDocuments({})).toBe(0)

    const coupon = await Coupon.findOne({ code: "STALE10" })
    expect(coupon!.usedCount).toBe(1) // unchanged — not incremented, not reset

    const untouchedProduct = await Product.findById(product._id)
    expect(untouchedProduct!.stock).toBe(20) // this route never decrements stock at all
  })

  it("400s on an expired coupon the same way, with the same zero-write guarantee", async () => {
    const product = await makeProduct()
    await Coupon.create({
      code: "OLDCODE",
      discountType: "flat",
      discountValue: 50,
      maxUses: 100,
      expiresAt: new Date(Date.now() - 60_000),
    })

    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 450,
        paymentMethod: "cod",
        couponCode: "OLDCODE",
      }),
    )

    expect(res.status).toBe(400)
    expect(await Order.countDocuments({})).toBe(0)
    expect(await Cart.countDocuments({})).toBe(0)
  })

  it("still creates the order normally when no coupon is supplied at all", async () => {
    const product = await makeProduct()

    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 500,
        paymentMethod: "cod",
      }),
    )

    expect(res.status).toBe(201)
    expect(await Order.countDocuments({})).toBe(1)
  })

  it("applies a valid coupon's discount to totalAmount and persists couponCode/discountAmount on the order", async () => {
    const product = await makeProduct()
    await Coupon.create({ code: "SAVE10", discountType: "percentage", discountValue: 10, maxUses: 100 })

    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 9999, // deliberately wrong client-echoed total — must be ignored
        paymentMethod: "cod",
        couponCode: "save10", // lowercase on purpose — normalization should still match
      }),
    )

    expect(res.status).toBe(201)
    const { orderId } = await res.json()
    const order = await Order.findById(orderId)

    expect(order!.couponCode).toBe("SAVE10")
    expect(order!.discountAmount).toBe(50) // 10% of the server-verified 500
    expect(order!.totalAmount).toBe(450) // 500 - 50, no shipping in this test

    const coupon = await Coupon.findOne({ code: "SAVE10" })
    expect(coupon!.usedCount).toBe(1) // redeemed at creation time for COD
  })
})

describe("COD coupon redemption race — lost race aborts before any write", () => {
  it("exactly one of two concurrent COD orders for the last coupon slot succeeds; the loser leaves nothing behind", async () => {
    const productA = await makeProduct({ slug: "race-product-a", sku: "SKU-RACE-A" })
    const productB = await makeProduct({ slug: "race-product-b", sku: "SKU-RACE-B" })
    await Coupon.create({ code: "RACE10", discountType: "percentage", discountValue: 10, maxUses: 1, usedCount: 0 })

    const requestFor = (product: typeof productA, email: string) =>
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(email),
        totalAmount: 450,
        paymentMethod: "cod",
        couponCode: "RACE10",
      })

    const [resA, resB] = await Promise.all([
      ordersPOST(requestFor(productA, "racer-a@test.com")),
      ordersPOST(requestFor(productB, "racer-b@test.com")),
    ])

    // Numeric sort, not the default lexicographic one — 201 happens to sort
    // first either way here, but this is the correct/intentional version.
    const statuses = [resA.status, resB.status].sort((a, b) => a - b)
    // Whichever way the race breaks, exactly one request must succeed (201)
    // and the other must be rejected — either at validate-time (400, if the
    // sequential read already saw usedCount at the limit) or at redeem-time
    // (409, if both validated concurrently and only one redeem won). This
    // assertion holds regardless of how the two requests happened to
    // interleave, which is the actual invariant that matters.
    expect(statuses[0]).toBe(201)
    expect([400, 409]).toContain(statuses[1])

    expect(await Order.countDocuments({})).toBe(1)
    expect(await Cart.countDocuments({})).toBe(1) // only the winner's cart was ever created

    const coupon = await Coupon.findOne({ code: "RACE10" })
    expect(coupon!.usedCount).toBe(1) // never 0 (lost the redeem entirely) or 2 (oversold)
  })
})
