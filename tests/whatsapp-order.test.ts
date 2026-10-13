// Integration tests for lib/whatsapp-order.ts — the WhatsApp order
// confirmation. Real in-memory MongoDB; only the ScaleChat call is mocked.
// That the four order routes actually call it is asserted in their own test
// files (checkout-conversion-orders, checkout-conversion-razorpay,
// shiprocket-checkout-order).
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { Order } from "@/lib/models/order"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { WhatsAppMessageLog } from "@/lib/models/whatsapp-message-log"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  sendWhatsAppTemplate: vi.fn(),
}))
import { sendWhatsAppTemplate, ScaleChatError } from "@/lib/whatsapp"
import { sendOrderConfirmationWhatsApp, formatOrderTotal } from "@/lib/whatsapp-order"

const TEST_PHONE = "919000000099" // as it would be set in WHATSAPP_TEST_PHONE
const TEST_PHONE_10 = "9000000099"

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), WhatsAppOptOut.deleteMany({}), WhatsAppMessageLog.deleteMany({})])
  vi.mocked(sendWhatsAppTemplate).mockReset().mockResolvedValue({ id: "msg_1" })

  process.env.SCALECHAT_API_KEY = "test-api-key"
  // Most tests exercise real customers; the test-mode block opts back in.
  process.env.WHATSAPP_ORDER_MODE = "live"
  delete process.env.WHATSAPP_REMINDER_MODE
  delete process.env.WHATSAPP_TEST_PHONE
})

// A confirmed order for a customer with a phone number.
async function makeOrder(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    orderNumber: `ORD-${new mongoose.Types.ObjectId()}`,
    totalAmount: 1249,
    paymentMethod: "cod",
    shippingAddress: { name: "Asha Kulkarni", phone: "9876543210" },
    ...overrides,
  }
  return Order.create(doc) as Promise<any>
}

const sendCalls = () => vi.mocked(sendWhatsAppTemplate).mock.calls.map(([params]) => params)
const sentAt = async (order: any) => ((await Order.findById(order._id).lean()) as any).whatsappConfirmationSentAt

describe("the message", () => {
  it("sends order_confirmation in 'en' with exactly name, order number, total and no buttons", async () => {
    const order = await makeOrder({ orderNumber: "ORD-1001" })

    await sendOrderConfirmationWhatsApp(order._id)

    expect(sendCalls()).toEqual([
      {
        phone: "9876543210",
        templateName: "order_confirmation",
        language: "en",
        variables: ["Asha", "ORD-1001", "1,249"],
      },
    ])
  })

  it("accepts the order id as a string too", async () => {
    const order = await makeOrder()
    await sendOrderConfirmationWhatsApp(order._id.toString())
    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
  })

  it("formats the total as digits only, with Indian grouping and paise only when present", () => {
    expect(formatOrderTotal(499)).toBe("499")
    expect(formatOrderTotal(1249)).toBe("1,249")
    expect(formatOrderTotal(125000)).toBe("1,25,000")
    expect(formatOrderTotal(1249.5)).toBe("1,249.50")
    expect(formatOrderTotal(1249.004)).toBe("1,249")
    for (const total of [499, 1249, 125000, 1249.5]) expect(formatOrderTotal(total)).not.toMatch(/[₹Rs]/)
  })

  it("falls back to the guest name, then to 'Customer'", async () => {
    const guest = await makeOrder({ shippingAddress: { phone: "9876543210" }, guestName: "Ravi Menon" })
    const nameless = await makeOrder({ shippingAddress: { phone: "9876543211" } })

    await sendOrderConfirmationWhatsApp(guest._id)
    await sendOrderConfirmationWhatsApp(nameless._id)

    expect(sendCalls().map((call) => call.variables?.[0])).toEqual(["Ravi", "Customer"])
  })

  it("uses the guest phone when the address has none, and normalises a country-coded one", async () => {
    const order = await makeOrder({ shippingAddress: { name: "Asha" }, guestPhone: "+91 98765 43210" })

    await sendOrderConfirmationWhatsApp(order._id)
    expect(sendCalls()[0].phone).toBe("9876543210")
  })
})

describe("one send per order", () => {
  it("sends once across repeated calls", async () => {
    const order = await makeOrder()

    await sendOrderConfirmationWhatsApp(order._id)
    await sendOrderConfirmationWhatsApp(order._id)
    await sendOrderConfirmationWhatsApp(order._id)

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
    expect(await sentAt(order)).toBeInstanceOf(Date)
  })

  it("sends once when callers overlap", async () => {
    const order = await makeOrder()
    // Hold the send open so every caller has loaded the order before any finishes.
    vi.mocked(sendWhatsAppTemplate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "msg_1" }), 100)),
    )

    await Promise.all([
      sendOrderConfirmationWhatsApp(order._id),
      sendOrderConfirmationWhatsApp(order._id),
      sendOrderConfirmationWhatsApp(order._id),
    ])

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
    expect(await WhatsAppMessageLog.countDocuments()).toBe(1)
  })

  it("does not retry a failed send, and never throws", async () => {
    const order = await makeOrder()
    vi.mocked(sendWhatsAppTemplate).mockRejectedValue(new ScaleChatError("template paused", true))

    await expect(sendOrderConfirmationWhatsApp(order._id)).resolves.toBeUndefined()
    await expect(sendOrderConfirmationWhatsApp(order._id)).resolves.toBeUndefined()

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
  })
})

describe("who is skipped", () => {
  it("skips a phone that has opted out, without marking the order", async () => {
    const order = await makeOrder()
    await WhatsAppOptOut.create({ phone: "9876543210" })

    await sendOrderConfirmationWhatsApp(order._id)

    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
    expect(await sentAt(order)).toBeNull()
  })

  it("skips an order with no usable phone number", async () => {
    const order = await makeOrder({ shippingAddress: { name: "Asha", phone: "12345" } })

    await sendOrderConfirmationWhatsApp(order._id)

    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
    expect(await sentAt(order)).toBeNull()
  })

  it("does nothing without the API key", async () => {
    delete process.env.SCALECHAT_API_KEY
    const order = await makeOrder()

    await sendOrderConfirmationWhatsApp(order._id)

    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
    expect(await sentAt(order)).toBeNull()
  })

  it("does not throw for an order that doesn't exist or a malformed id", async () => {
    await expect(sendOrderConfirmationWhatsApp(new mongoose.Types.ObjectId())).resolves.toBeUndefined()
    await expect(sendOrderConfirmationWhatsApp("not-an-id")).resolves.toBeUndefined()
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe("test mode", () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_ORDER_MODE // unset means test mode
    process.env.WHATSAPP_TEST_PHONE = TEST_PHONE
  })

  it("is the default, and only messages the test number", async () => {
    const mine = await makeOrder({ shippingAddress: { name: "Me", phone: TEST_PHONE_10 } })
    const theirs = await makeOrder()

    await sendOrderConfirmationWhatsApp(mine._id)
    await sendOrderConfirmationWhatsApp(theirs._id)

    expect(sendCalls().map((call) => call.phone)).toEqual([TEST_PHONE_10])
    expect(await sentAt(mine)).toBeInstanceOf(Date)
    expect(await sentAt(theirs)).toBeNull()
    expect((await WhatsAppMessageLog.find().lean()).map((log: any) => log.mode)).toEqual(["test"])
  })

  it("stays in test mode for any value other than exactly 'live'", async () => {
    process.env.WHATSAPP_ORDER_MODE = "Live"
    const order = await makeOrder()

    await sendOrderConfirmationWhatsApp(order._id)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("has its own switch — the cart reminder going live does not take orders live", async () => {
    process.env.WHATSAPP_REMINDER_MODE = "live"
    const order = await makeOrder()

    await sendOrderConfirmationWhatsApp(order._id)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("messages no one when no test number is set", async () => {
    delete process.env.WHATSAPP_TEST_PHONE
    const order = await makeOrder()

    await sendOrderConfirmationWhatsApp(order._id)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe("logging", () => {
  it("logs a successful send with what was sent and ScaleChat's response", async () => {
    const order = await makeOrder({ orderNumber: "ORD-1001" })
    await sendOrderConfirmationWhatsApp(order._id)

    const logs = await WhatsAppMessageLog.find().lean()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      order: order._id,
      cart: null,
      phone: "919876543210",
      templateName: "order_confirmation",
      variables: ["Asha", "ORD-1001", "1,249"],
      mode: "live",
      status: "sent",
      attempt: 1,
      error: null,
      response: { id: "msg_1" },
    })
  })

  it("logs a failed send with the error", async () => {
    const order = await makeOrder()
    vi.mocked(sendWhatsAppTemplate).mockRejectedValue(new ScaleChatError("timed out", false))

    await sendOrderConfirmationWhatsApp(order._id)

    const logs = await WhatsAppMessageLog.find().lean()
    expect(logs.map((log: any) => [String(log.order), log.status, log.error])).toEqual([
      [String(order._id), "failed", "timed out"],
    ])
  })
})
