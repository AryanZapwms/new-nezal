// Integration tests for lib/shiprocket-checkout-order.ts — the shared
// create-or-update used by BOTH the Shiprocket order webhook and the
// /checkout/success pull fallback. The properties under test: one order per
// Shiprocket order id no matter how many times / how concurrently either
// path runs; side effects (stock, shipment, emails) exactly once; COD and
// case-insensitive payment statuses handled; never downgrading a paid order.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue(""),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
}))
vi.mock("@/lib/shiprocket", () => ({
  createShiprocketOrderForOrder: vi.fn().mockResolvedValue({ shiprocketOrderId: 777, shiprocketShipmentId: 888 }),
}))
vi.mock("@/lib/shiprocket-webhooks", () => ({ notifyProductWebhook: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/components/clear-cart-on-success", () => ({ ClearCartOnSuccess: () => null }))
vi.mock("next-auth", () => ({ getServerSession: vi.fn().mockResolvedValue(null) }))

import { createShiprocketOrderForOrder } from "@/lib/shiprocket"
import { sendEmail } from "@/lib/email"
import {
  upsertShiprocketCheckoutOrder,
  syncShiprocketCheckoutOrderFromApi,
  isCheckoutOrderConfirmed,
  classifyCheckoutPayment,
} from "@/lib/shiprocket-checkout-order"

let webhookPOST: typeof import("@/app/api/shiprocket/order-webhook/[secret]/route").POST
let SuccessPage: typeof import("@/app/checkout/success/page").default

const NUMERIC_ID = 42
let productId: mongoose.Types.ObjectId

beforeAll(async () => {
  await connectTestDb()
  await Order.init() // build the unique indexes the upsert relies on
  ;({ POST: webhookPOST } = await import("@/app/api/shiprocket/order-webhook/[secret]/route"))
  ;({ default: SuccessPage } = await import("@/app/checkout/success/page"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Product.deleteMany({})])
  vi.mocked(createShiprocketOrderForOrder).mockClear()
  vi.mocked(sendEmail).mockClear()
  process.env.SHIPROCKET_ORDER_WEBHOOK_SECRET = "test-secret-value"
  process.env.SHIPROCKET_CHECKOUT_API_KEY = "k"
  process.env.SHIPROCKET_CHECKOUT_API_SECRET = "s"

  const product = await Product.create({
    name: "Neem Face Wash",
    slug: "neem-face-wash-sr",
    price: 300,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-NFW",
    stock: 0,
    numericId: NUMERIC_ID,
    sizes: [
      { size: "100", unit: "ml", price: 300, stock: 10, sku: "NFW-100" },
      { size: "200", unit: "ml", price: 500, stock: 10, sku: "NFW-200" },
    ],
  })
  productId = product._id
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function payload(overrides: Record<string, unknown> = {}) {
  return {
    order_id: "6abba47a1ce48d05366eee39",
    fastrr_order_id: 123456,
    payment_status: "Success",
    payment_type: "PREPAID",
    email: "guest@example.com",
    phone: "9876543210",
    total_amount_payable: 690,
    shipping_charges: 90,
    cart_data: { items: [{ variant_id: String(NUMERIC_ID * 1000 + 1), quantity: 2 }] },
    shipping_address: { first_name: "Asha", last_name: "K", line1: "1 Road", city: "Mumbai", state: "MH", pincode: "400001", country: "India", phone: "9876543210" },
    ...overrides,
  }
}

async function sizeStock(index: number) {
  const p: any = await Product.findById(productId).lean()
  return p.sizes[index].stock
}

describe("classifyCheckoutPayment", () => {
  it("is case-insensitive and treats COD as confirmed-but-unpaid", () => {
    expect(classifyCheckoutPayment({ payment_status: "SUCCESS" }).state).toBe("paid")
    expect(classifyCheckoutPayment({ payment_status: "success" }).state).toBe("paid")
    expect(classifyCheckoutPayment({ payment_status: "Pending", payment_type: "COD" }).state).toBe("cod")
    expect(classifyCheckoutPayment({ payment_status: "Pending", payment_type: "cash_on_delivery" }).state).toBe("cod")
    expect(classifyCheckoutPayment({ payment_status: "Pending", payment_type: "PREPAID" }).state).toBe("pending")
    expect(classifyCheckoutPayment({ payment_status: "FAILED", payment_type: "COD" }).state).toBe("failed")
  })
})

describe("upsertShiprocketCheckoutOrder", () => {
  it("creates a paid prepaid order and runs side effects once", async () => {
    const { order, created } = await upsertShiprocketCheckoutOrder(payload(), "webhook")

    expect(created).toBe(true)
    expect(order.paymentStatus).toBe("completed")
    expect(order.orderStatus).toBe("processing")
    expect(order.shiprocketPaymentType).toBe("prepaid")
    expect(order.shiprocketLogisticsOrderId).toBe(777)
    expect(order.checkoutFinalizedAt).toBeInstanceOf(Date)
    expect(isCheckoutOrderConfirmed(order)).toBe(true)
    expect(await sizeStock(1)).toBe(8)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
  })

  it("is idempotent across repeated deliveries", async () => {
    await upsertShiprocketCheckoutOrder(payload(), "webhook")
    const second = await upsertShiprocketCheckoutOrder(payload(), "success_page")

    expect(second.created).toBe(false)
    expect(await Order.countDocuments({})).toBe(1)
    expect(await sizeStock(1)).toBe(8)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
  })

  it("creates exactly one order when the webhook and success page race", async () => {
    const results = await Promise.all([
      upsertShiprocketCheckoutOrder(payload(), "webhook"),
      upsertShiprocketCheckoutOrder(payload(), "success_page"),
      upsertShiprocketCheckoutOrder(payload(), "webhook"),
    ])

    expect(results.filter((r) => r.created)).toHaveLength(1)
    expect(new Set(results.map((r) => r.order._id.toString())).size).toBe(1)
    expect(await Order.countDocuments({})).toBe(1)
    expect(await sizeStock(1)).toBe(8)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
  })

  it("confirms and fulfils a COD order even though payment is still pending", async () => {
    const { order } = await upsertShiprocketCheckoutOrder(
      payload({ payment_status: "Pending", payment_type: "COD", cod_charges: 50 }),
      "webhook"
    )

    expect(order.paymentStatus).toBe("pending")
    expect(order.orderStatus).toBe("processing")
    expect(order.shiprocketPaymentType).toBe("cod")
    expect(order.codCharge).toBe(50)
    expect(isCheckoutOrderConfirmed(order)).toBe(true)
    expect(await sizeStock(1)).toBe(8)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
  })

  it("holds a pending prepaid order, then finalizes it when SUCCESS arrives", async () => {
    const first = await upsertShiprocketCheckoutOrder(payload({ payment_status: "Pending" }), "webhook")
    expect(isCheckoutOrderConfirmed(first.order)).toBe(false)
    expect(await sizeStock(1)).toBe(10)
    expect(createShiprocketOrderForOrder).not.toHaveBeenCalled()

    const second = await upsertShiprocketCheckoutOrder(payload({ payment_status: "SUCCESS" }), "webhook")
    expect(second.created).toBe(false)
    expect(second.order.paymentStatus).toBe("completed")
    expect(isCheckoutOrderConfirmed(second.order)).toBe(true)
    expect(await sizeStock(1)).toBe(8)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
    expect(await Order.countDocuments({})).toBe(1)
  })

  it("never downgrades a paid order on a stale failed delivery", async () => {
    await upsertShiprocketCheckoutOrder(payload(), "webhook")
    const { order } = await upsertShiprocketCheckoutOrder(payload({ payment_status: "FAILED" }), "webhook")

    expect(order.paymentStatus).toBe("completed")
  })

  it("does not re-run side effects for a legacy order created before checkoutFinalizedAt existed", async () => {
    await Order.collection.insertOne({
      orderNumber: "ORD-LEGACY",
      totalAmount: 690,
      items: [],
      paymentMethod: "shiprocket_checkout",
      paymentStatus: "completed",
      orderStatus: "processing",
      shiprocketPlatformOrderId: "6abba47a1ce48d05366eee39",
      shiprocketOrderId: 123456,
    })

    const { created } = await upsertShiprocketCheckoutOrder(payload(), "webhook")

    expect(created).toBe(false)
    expect(createShiprocketOrderForOrder).not.toHaveBeenCalled()
    expect(await sizeStock(1)).toBe(10)
  })
})

describe("POST /api/shiprocket/order-webhook/[secret]", () => {
  function webhookRequest(body: unknown) {
    return new NextRequest("http://localhost/api/shiprocket/order-webhook/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("rejects a wrong secret", async () => {
    const res = await webhookPOST(webhookRequest(payload()), { params: Promise.resolve({ secret: "wrong" }) })
    expect(res.status).toBe(401)
    expect(await Order.countDocuments({})).toBe(0)
  })

  it("creates the order, and reports a later redelivery as a duplicate", async () => {
    const ctx = { params: Promise.resolve({ secret: "test-secret-value" }) }
    const first = await (await webhookPOST(webhookRequest(payload()), ctx)).json()
    const second = await (
      await webhookPOST(webhookRequest(payload()), { params: Promise.resolve({ secret: "test-secret-value" }) })
    ).json()

    expect(first).toMatchObject({ ok: true, duplicate: false, paymentState: "paid" })
    expect(second).toMatchObject({ ok: true, duplicate: true })
    expect(await Order.countDocuments({})).toBe(1)
  })

  it("returns 400 when the payload has no order id at all", async () => {
    const res = await webhookPOST(webhookRequest(payload({ order_id: undefined, fastrr_order_id: undefined })), {
      params: Promise.resolve({ secret: "test-secret-value" }),
    })
    expect(res.status).toBe(400)
  })
})

describe("syncShiprocketCheckoutOrderFromApi (success-page fallback)", () => {
  it("pulls the order when no webhook arrived, and a late webhook then dedupes against it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: payload({ order_id: "pull-oid-1" }) }), { status: 200 })
    )
    vi.stubGlobal("fetch", fetchMock)

    const order = await syncShiprocketCheckoutOrderFromApi("pull-oid-1")
    expect(order?.shiprocketPlatformOrderId).toBe("pull-oid-1")
    expect(isCheckoutOrderConfirmed(order)).toBe(true)

    const late = await upsertShiprocketCheckoutOrder(payload({ order_id: "pull-oid-1" }), "webhook")
    expect(late.created).toBe(false)
    expect(await Order.countDocuments({})).toBe(1)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
  })

  it("ignores a response for a different order and throttles repeat pulls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: payload({ order_id: "someone-else" }) }), { status: 200 })
    )
    vi.stubGlobal("fetch", fetchMock)

    expect(await syncShiprocketCheckoutOrderFromApi("pull-oid-2")).toBeNull()
    expect(await syncShiprocketCheckoutOrderFromApi("pull-oid-2")).toBeNull() // throttled
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await Order.countDocuments({})).toBe(0)
  })

  it("returns null (no order) when Shiprocket's API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "not found" }), { status: 404 })))

    expect(await syncShiprocketCheckoutOrderFromApi("pull-oid-3")).toBeNull()
    expect(await Order.countDocuments({})).toBe(0)
  })
})

describe("/checkout/success page state", () => {
  async function render(params: Record<string, string>) {
    const el: any = await SuccessPage({ searchParams: Promise.resolve(params) })
    return el.type.name as string
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    // Shiprocket's API has nothing for these oids.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })))
  })

  it("does not show success just because the URL says ost=SUCCESS", async () => {
    expect(await render({ oid: "page-oid-1", ost: "SUCCESS" })).toBe("Confirming")
  })

  it("stops polling after the attempt cap and hands off to email/support", async () => {
    expect(await render({ oid: "page-oid-2", ost: "SUCCESS", attempt: "10" })).toBe("ConfirmationDelayed")
  })

  it("shows the failure screen for a non-success ost with no order", async () => {
    expect(await render({ oid: "page-oid-3", ost: "FAILED" })).toBe("PaymentNotCompleted")
  })

  it("rejects a malformed oid without querying anything", async () => {
    expect(await render({ oid: "{$ne:1}", ost: "SUCCESS" })).toBe("PaymentNotCompleted")
  })

  it("shows the confirmed order once it exists, even with a missing ost", async () => {
    await upsertShiprocketCheckoutOrder(payload({ order_id: "page-oid-4" }), "webhook")
    expect(await render({ oid: "page-oid-4" })).toBe("OrderConfirmed")
  })

  it("keeps waiting on an order that exists but is still pending prepaid", async () => {
    await upsertShiprocketCheckoutOrder(payload({ order_id: "page-oid-5", payment_status: "Pending" }), "webhook")
    expect(await render({ oid: "page-oid-5", ost: "SUCCESS" })).toBe("Confirming")
  })
})
