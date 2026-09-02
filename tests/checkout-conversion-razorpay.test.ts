// Integration tests for app/api/razorpay/verify-payment/route.ts — the only
// place a Razorpay cart converts, since (unlike COD/CCAvenue) no local Order
// exists before payment succeeds. A bad/failed verification must leave the
// cart untouched.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import crypto from "crypto"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { connectTestDb, disconnectTestDb } from "./setup-db"

process.env.RAZORPAY_KEY_ID = "test-key-id"
process.env.RAZORPAY_KEY_SECRET = "test-key-secret"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue(""),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
}))
vi.mock("@/lib/shiprocket", () => ({ autoCreateShiprocketOrder: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/meta-capi", () => ({
  getRequestMeta: vi.fn().mockReturnValue({ clientIp: "", userAgent: "", fbp: "", fbc: "", eventSourceUrl: "" }),
  sendCapiPurchaseEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/syncUserContact", () => ({ syncUserContactFromOrder: vi.fn().mockResolvedValue(undefined) }))

const ordersFetch = vi.fn()
vi.mock("razorpay", () => {
  class MockRazorpay {
    orders = { fetch: ordersFetch }
  }
  return { default: MockRazorpay }
})

import { getServerSession } from "next-auth"

let verifyPOST: typeof import("@/app/api/razorpay/verify-payment/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ POST: verifyPOST } = await import("@/app/api/razorpay/verify-payment/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue(null)
  ordersFetch.mockReset()
})

function signature(orderId: string, paymentId: string) {
  return crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex")
}

function shippingAddress() {
  return {
    name: "Razorpay Customer",
    email: "razorpay-guest@test.com",
    phone: "9876543210",
    street: "123 Main St",
    city: "Mumbai",
    state: "MH",
    zipCode: "400001",
    country: "India",
  }
}

describe("Razorpay verify-payment: cart conversion", () => {
  it("converts the cart on a successful verified payment", async () => {
    const product = await Product.create({
      name: "Razorpay Product",
      slug: "razorpay-product",
      price: 600,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-RZP",
      stock: 10,
    })

    const razorpayOrderId = "order_test123"
    const razorpayPaymentId = "pay_test123"
    ordersFetch.mockResolvedValue({ amount: 60000 }) // 600 * 100 paise

    const res = await verifyPOST(
      new NextRequest("http://localhost/api/razorpay/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signature(razorpayOrderId, razorpayPaymentId),
          items: [{ product: product._id.toString(), quantity: 1 }],
          shippingAddress: shippingAddress(),
          totalAmount: 600,
          shippingAmount: 0,
        }),
      }),
    )

    expect(res.status).toBe(200)
    const data = await res.json()

    const order = await Order.findById(data.orderId)
    expect(order!.paymentStatus).toBe("completed")
    expect(order!.cartId).toBeTruthy()

    const cart = await Cart.findById(order!.cartId)
    expect(cart!.status).toBe("converted")
    expect(cart!.convertedOrderId!.toString()).toBe(order!._id.toString())
  })

  it("converts the logged-in user's existing cart, not a guest cart", async () => {
    const user = await User.create({ email: "rzp-user@test.com", name: "RZP User", role: "user" })
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)

    const product = await Product.create({
      name: "Razorpay Product 2",
      slug: "razorpay-product-2",
      price: 300,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-RZP2",
      stock: 10,
    })
    const existingCart = await Cart.create({ user: user._id, status: "active", items: [{ product: product._id, quantity: 1 }] })

    const razorpayOrderId = "order_test456"
    const razorpayPaymentId = "pay_test456"
    ordersFetch.mockResolvedValue({ amount: 30000 })

    const res = await verifyPOST(
      new NextRequest("http://localhost/api/razorpay/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signature(razorpayOrderId, razorpayPaymentId),
          items: [{ product: product._id.toString(), quantity: 1 }],
          shippingAddress: shippingAddress(),
          totalAmount: 300,
          shippingAmount: 0,
        }),
      }),
    )
    expect(res.status).toBe(200)

    const updatedCart = await Cart.findById(existingCart._id)
    expect(updatedCart!.status).toBe("converted")
  })

  it("rejects an invalid signature and leaves the cart untouched", async () => {
    const product = await Product.create({
      name: "Razorpay Product 3",
      slug: "razorpay-product-3",
      price: 400,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-RZP3",
      stock: 10,
    })
    const cart = await Cart.create({ guestToken: "rzp-guest-token", status: "active", items: [{ product: product._id, quantity: 1 }] })

    const res = await verifyPOST(
      new NextRequest("http://localhost/api/razorpay/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "nezal-cart-token=rzp-guest-token" },
        body: JSON.stringify({
          razorpayOrderId: "order_bad",
          razorpayPaymentId: "pay_bad",
          razorpaySignature: "totally-wrong-signature",
          items: [{ product: product._id.toString(), quantity: 1 }],
          shippingAddress: shippingAddress(),
          totalAmount: 400,
          shippingAmount: 0,
        }),
      }),
    )

    expect(res.status).toBe(400)
    expect(await Order.countDocuments({})).toBe(0)

    const unchangedCart = await Cart.findById(cart._id)
    expect(unchangedCart!.status).toBe("active")
  })
})
