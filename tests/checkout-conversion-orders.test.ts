// Integration tests for the "when does a cart convert" rule across COD and
// CCAvenue: app/api/orders/route.ts (order creation) and
// app/api/ccavenue/response/route.ts (the payment-confirmation callback).
//
// The rule under test: COD converts the cart immediately at order creation
// (it's a confirmed purchase). CCAvenue does NOT convert at order creation
// (payment hasn't happened yet) — only the response callback's "Success"
// branch converts it, via the cartId captured on the Order at creation time.
// A failed/abandoned CCAvenue payment must leave the cart untouched so it
// still surfaces as an active/abandoned cart to the admin.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
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
vi.mock("@/lib/ccavenue", () => ({
  decrypt: vi.fn((s: string) => s),
  parseCCAvenueResponse: vi.fn(),
}))

import { getServerSession } from "next-auth"
import { parseCCAvenueResponse } from "@/lib/ccavenue"

let ordersPOST: typeof import("@/app/api/orders/route").POST
let ccavenueResponsePOST: typeof import("@/app/api/ccavenue/response/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ POST: ordersPOST } = await import("@/app/api/orders/route"))
  ;({ POST: ccavenueResponsePOST } = await import("@/app/api/ccavenue/response/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue(null)
})

async function makeProduct(overrides: Partial<any> = {}) {
  return Product.create({
    name: "Vitamin C Serum",
    slug: "vitamin-c-serum-checkout",
    price: 500,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-VCS-CO",
    stock: 20,
    ...overrides,
  })
}

function shippingAddress() {
  return {
    name: "Test Customer",
    email: "guest@test.com",
    phone: "9876543210",
    street: "123 Main St",
    city: "Mumbai",
    state: "MH",
    zipCode: "400001",
    country: "India",
  }
}

function makeOrderRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
}

describe("COD order creation converts the cart immediately", () => {
  it("converts a guest cart on a successful COD order", async () => {
    const product = await makeProduct()
    const preRes = await (await import("@/app/api/cart/route")).PUT(
      new NextRequest("http://localhost/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ product: product._id.toString(), quantity: 1 }] }),
      }),
    )
    const guestToken = preRes.headers.get("set-cookie")!.match(/nezal-cart-token=([^;]+)/)![1]

    const res = await ordersPOST(
      makeOrderRequest(
        {
          items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
          shippingAddress: shippingAddress(),
          totalAmount: 500,
          paymentMethod: "cod",
        },
        `nezal-cart-token=${guestToken}`,
      ),
    )
    expect(res.status).toBe(201)

    const cart = await Cart.findOne({ guestToken })
    expect(cart!.status).toBe("converted")
    expect(cart!.convertedOrderId).toBeTruthy()
  })

  it("converts a logged-in user's cart on a successful COD order", async () => {
    const product = await makeProduct()
    const user = await User.create({ email: "cod-user@test.com", name: "COD User", role: "user" })
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: user.email } } as any)

    await Cart.create({ user: user._id, status: "active", items: [{ product: product._id, quantity: 1 }] })

    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 500,
        paymentMethod: "cod",
      }),
    )
    expect(res.status).toBe(201)

    const cart = await Cart.findOne({ user: user._id })
    expect(cart!.status).toBe("converted")
  })
})

describe("CCAvenue: order creation does NOT convert; only a successful callback does", () => {
  it("leaves the cart active after order creation, before payment", async () => {
    const product = await makeProduct()
    const res = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 500,
        paymentMethod: "ccavenue",
      }),
    )
    expect(res.status).toBe(201)
    const { orderId } = await res.json()

    const order = await Order.findById(orderId)
    expect(order!.paymentStatus).toBe("pending")
    expect(order!.cartId).toBeTruthy()

    const cart = await Cart.findById(order!.cartId)
    expect(cart!.status).toBe("active") // not converted yet — payment hasn't happened
  })

  it("converts the cart when the callback reports a successful payment", async () => {
    const product = await makeProduct()
    const createRes = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 500,
        paymentMethod: "ccavenue",
      }),
    )
    const { orderId } = await createRes.json()
    const order = await Order.findById(orderId)

    vi.mocked(parseCCAvenueResponse).mockReturnValue({
      order_id: orderId,
      order_status: "Success",
      tracking_id: "TRACK1",
      bank_ref_no: "BANKREF1",
      amount: order!.totalAmount.toFixed(2),
      failure_message: "",
    })

    const formData = new FormData()
    formData.append("encResp", "dummy-cipher-text")
    const callbackRes = await ccavenueResponsePOST(
      new NextRequest("http://localhost/api/ccavenue/response", { method: "POST", body: formData }),
    )
    expect(callbackRes.status).toBe(303)

    const cart = await Cart.findById(order!.cartId)
    expect(cart!.status).toBe("converted")
    expect(cart!.convertedOrderId!.toString()).toBe(orderId)
  })

  it("leaves the cart active (available for abandoned-cart tracking) when the callback reports failure", async () => {
    const product = await makeProduct()
    const createRes = await ordersPOST(
      makeOrderRequest({
        items: [{ product: product._id.toString(), quantity: 1, price: 500 }],
        shippingAddress: shippingAddress(),
        totalAmount: 500,
        paymentMethod: "ccavenue",
      }),
    )
    const { orderId } = await createRes.json()
    const order = await Order.findById(orderId)

    vi.mocked(parseCCAvenueResponse).mockReturnValue({
      order_id: orderId,
      order_status: "Failure",
      tracking_id: "",
      bank_ref_no: "",
      amount: order!.totalAmount.toFixed(2),
      failure_message: "User cancelled",
    })

    const formData = new FormData()
    formData.append("encResp", "dummy-cipher-text")
    const callbackRes = await ccavenueResponsePOST(
      new NextRequest("http://localhost/api/ccavenue/response", { method: "POST", body: formData }),
    )
    expect(callbackRes.status).toBe(303)

    const updatedOrder = await Order.findById(orderId)
    expect(updatedOrder!.paymentStatus).toBe("failed")

    const cart = await Cart.findById(order!.cartId)
    expect(cart!.status).toBe("active") // untouched — still visible to admin as an active/abandoned cart
  })
})
