// Tests for the Meta Purchase data the two order confirmation pages give the
// browser (lib/meta-purchase.ts), and the exactly-once server-side Purchase
// for Shiprocket checkout orders (sendCheckoutPurchaseOnce in
// lib/shiprocket-checkout-order.ts).
import crypto from "crypto"
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest"
import mongoose from "mongoose"

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue(""),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
}))
vi.mock("@/lib/shiprocket", () => ({ createShiprocketOrderForOrder: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/shiprocket-webhooks", () => ({ notifyProductWebhook: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp-order", () => ({ sendOrderConfirmationWhatsApp: vi.fn().mockResolvedValue(undefined) }))

import { Order } from "@/lib/models/order"
import {
  isOwnCheckoutPurchase,
  isWithinPurchaseTrackingWindow,
  loadOrderSuccessTrackingData,
  purchaseTrackingData,
} from "@/lib/meta-purchase"
import { sendCheckoutPurchaseOnce } from "@/lib/shiprocket-checkout-order"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const HOUR = 3600_000
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex")

const productA = new mongoose.Types.ObjectId()
const productB = new mongoose.Types.ObjectId()
const lines = [
  { product: productA, quantity: 2, price: 133 },
  { product: productB, quantity: 1, price: 254 },
]
const expectedContents = [
  { id: String(productA), quantity: 2, item_price: 133 },
  { id: String(productB), quantity: 1, item_price: 254 },
]

async function createOrder(fields: Record<string, unknown>, ageMs = 0) {
  const order: any = await Order.create({
    orderNumber: `ORD-${new mongoose.Types.ObjectId()}`,
    totalAmount: 520,
    items: lines,
    ...fields,
  } as any)
  if (ageMs) {
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: new Date(Date.now() - ageMs) } })
  }
  return Order.findById(order._id).lean<any>()
}

function shiprocketOrder(fields: Record<string, unknown> = {}, ageMs = 0) {
  return createOrder(
    {
      paymentMethod: "shiprocket_checkout",
      shiprocketPlatformOrderId: `sr-${new mongoose.Types.ObjectId()}`,
      paymentStatus: "completed",
      orderStatus: "processing",
      shiprocketPaymentType: "prepaid",
      guestEmail: "Asha@Example.com",
      guestName: "Asha Rao",
      guestPhone: "9876543210",
      shippingAddress: { city: "Navi Mumbai", state: "Maharashtra", zipCode: "400703", country: "India" },
      ...fields,
    },
    ageMs
  )
}

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Order.deleteMany({})
})

describe("purchase tracking rules", () => {
  it.each([
    ["a COD order", { paymentMethod: "cod", paymentStatus: "pending", orderStatus: "pending" }, true],
    ["a paid Razorpay order", { paymentMethod: "razorpay", paymentStatus: "completed" }, true],
    ["a paid CCAvenue order", { paymentMethod: "ccavenue", paymentStatus: "completed" }, true],
    ["an unpaid Razorpay order", { paymentMethod: "razorpay", paymentStatus: "pending" }, false],
    ["a failed payment", { paymentMethod: "ccavenue", paymentStatus: "failed" }, false],
    ["a cancelled COD order", { paymentMethod: "cod", paymentStatus: "pending", orderStatus: "cancelled" }, false],
    ["a Shiprocket checkout order", { paymentMethod: "shiprocket_checkout", paymentStatus: "completed" }, false],
  ])("treats %s as an own-checkout purchase: %s", (_label, order, expected) => {
    expect(isOwnCheckoutPurchase(order)).toBe(expected)
  })

  it("only tracks orders placed in the last 24 hours", () => {
    const now = Date.now()
    expect(isWithinPurchaseTrackingWindow({ createdAt: new Date(now - 23 * HOUR) }, now)).toBe(true)
    expect(isWithinPurchaseTrackingWindow({ createdAt: new Date(now - 25 * HOUR) }, now)).toBe(false)
    expect(isWithinPurchaseTrackingWindow({}, now)).toBe(false)
  })

  it("gives the same data whether or not the order's products are populated", () => {
    const _id = new mongoose.Types.ObjectId()
    const populated = { _id, totalAmount: 520, items: lines.map((l) => ({ ...l, product: { _id: l.product, name: "x" } })) }
    const unpopulated = { _id, totalAmount: 520, items: [...lines, { product: null, quantity: 1, price: 99 }] }

    const expected = { eventId: String(_id), value: 520, contents: expectedContents }
    expect(purchaseTrackingData(populated)).toEqual(expected)
    expect(purchaseTrackingData(unpopulated)).toEqual(expected)
  })
})

describe("loadOrderSuccessTrackingData (/order-success/[id])", () => {
  it("returns only the event id, value and contents for a guest's COD order", async () => {
    const order = await createOrder({
      paymentMethod: "cod",
      guestEmail: "guest@example.com",
      shippingAddress: { name: "Guest", phone: "9876543210", city: "Pune" },
    })
    expect(await loadOrderSuccessTrackingData(String(order._id))).toEqual({
      eventId: String(order._id),
      value: 520,
      contents: expectedContents,
    })
  })

  it("returns data for a paid Razorpay order", async () => {
    const order = await createOrder({ paymentMethod: "razorpay", paymentStatus: "completed" })
    expect(await loadOrderSuccessTrackingData(String(order._id))).not.toBeNull()
  })

  it.each([
    ["an unpaid order", { paymentMethod: "razorpay", paymentStatus: "pending" }, 0],
    ["an order older than 24 hours", { paymentMethod: "cod" }, 25 * HOUR],
    ["a Shiprocket checkout order", { paymentMethod: "shiprocket_checkout", paymentStatus: "completed" }, 0],
  ])("returns null for %s", async (_label, fields, ageMs) => {
    const order = await createOrder(fields, ageMs)
    expect(await loadOrderSuccessTrackingData(String(order._id))).toBeNull()
  })

  it("returns null for an id that isn't an order", async () => {
    expect(await loadOrderSuccessTrackingData("not-an-order-id")).toBeNull()
    expect(await loadOrderSuccessTrackingData(String(new mongoose.Types.ObjectId()))).toBeNull()
  })
})

describe("sendCheckoutPurchaseOnce (/checkout/success)", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  const requestMeta = {
    clientIp: "203.0.113.7",
    userAgent: "Mozilla/5.0",
    fbp: "fb.1.1700000000000.123",
    eventSourceUrl: "https://nezalherbocare.com/checkout/success",
  }

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1546800325689461")
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "test-token")
    fetchMock = vi.fn().mockResolvedValue(new Response('{"events_received":1}', { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const sentAt = async (orderId: unknown) => (await Order.findById(orderId).lean<any>())?.metaPurchaseSentAt

  it("sends exactly once, however many requests race for it", async () => {
    const order = await shiprocketOrder()

    const results = await Promise.all(Array.from({ length: 5 }, () => sendCheckoutPurchaseOnce(order, requestMeta)))
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await sendCheckoutPurchaseOnce(order, requestMeta)).toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await sentAt(order._id)).toBeInstanceOf(Date)

    const event = JSON.parse(fetchMock.mock.calls[0][1].body).data[0]
    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: String(order._id),
      action_source: "website",
      event_source_url: "https://nezalherbocare.com/checkout/success",
      custom_data: { currency: "INR", value: 520, contents: expectedContents, num_items: 3 },
      user_data: {
        em: [sha256("asha@example.com")],
        ph: [sha256("919876543210")],
        fn: [sha256("asha")],
        ln: [sha256("rao")],
        ct: [sha256("navimumbai")],
        st: [sha256("maharashtra")],
        zp: [sha256("400703")],
        country: [sha256("in")],
        client_ip_address: "203.0.113.7",
        client_user_agent: "Mozilla/5.0",
        fbp: "fb.1.1700000000000.123",
      },
    })
  })

  it("sends for a confirmed COD order", async () => {
    const order = await shiprocketOrder({ paymentStatus: "pending", shiprocketPaymentType: "cod" })
    expect(await sendCheckoutPurchaseOnce(order, requestMeta)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("sends for an order created before metaPurchaseSentAt existed", async () => {
    const order = await shiprocketOrder()
    await Order.collection.updateOne({ _id: order._id }, { $unset: { metaPurchaseSentAt: "" } })
    expect(await sendCheckoutPurchaseOnce(order, requestMeta)).toBe(true)
  })

  it.each([
    ["a prepaid order still waiting for payment", { paymentStatus: "pending", orderStatus: "pending" }, 0],
    ["an order older than 24 hours", {}, 25 * HOUR],
  ])("neither sends nor claims %s", async (_label, fields, ageMs) => {
    const order = await shiprocketOrder(fields, ageMs)
    expect(await sendCheckoutPurchaseOnce(order, requestMeta)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await sentAt(order._id)).toBeNull()
  })

  it("never claims an order from our own checkout, which sends its Purchase elsewhere", async () => {
    const order = await createOrder({ paymentMethod: "razorpay", paymentStatus: "completed" })
    expect(await sendCheckoutPurchaseOnce(order, requestMeta)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await sentAt(order._id)).toBeNull()
  })
})
