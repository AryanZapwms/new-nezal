// Integration tests for app/api/cron/abandoned-cart-whatsapp/route.ts,
// against a real in-memory MongoDB with only the ScaleChat call mocked.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { WhatsAppMessageLog } from "@/lib/models/whatsapp-message-log"
import { connectTestDb, disconnectTestDb } from "./setup-db"

// Only the network call is replaced — the route also needs the real
// ScaleChatError and toWhatsAppPhone.
vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  sendWhatsAppTemplate: vi.fn(),
}))
import { sendWhatsAppTemplate, ScaleChatError } from "@/lib/whatsapp"

let GET: typeof import("@/app/api/cron/abandoned-cart-whatsapp/route").GET

const TEST_PHONE = "919000000099" // as it would be set in WHATSAPP_TEST_PHONE
const TEST_PHONE_10 = "9000000099"

beforeAll(async () => {
  await connectTestDb()
  ;({ GET } = await import("@/app/api/cron/abandoned-cart-whatsapp/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    WhatsAppOptOut.deleteMany({}),
    WhatsAppMessageLog.deleteMany({}),
  ])
  vi.mocked(sendWhatsAppTemplate).mockReset().mockResolvedValue({ id: "msg_1" })

  process.env.CRON_SECRET = "test-cron-secret"
  process.env.SCALECHAT_API_KEY = "test-api-key"
  // Most tests exercise the real audience; the test-mode block opts back in.
  process.env.WHATSAPP_REMINDER_MODE = "live"
  delete process.env.WHATSAPP_TEST_PHONE
})

function request(query = "") {
  return new NextRequest(`http://localhost/api/cron/abandoned-cart-whatsapp${query}`, {
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

async function run(query = "") {
  const res = await GET(request(query))
  return { status: res.status, data: await res.json() }
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000)
const STALE = minutesAgo(60) // past the 45-minute reminder delay

async function makeProduct(name = "Face Wash") {
  return Product.create({
    name,
    slug: `product-${new mongoose.Types.ObjectId()}`,
    price: 200,
    company: new mongoose.Types.ObjectId(),
    sku: `SKU-${new mongoose.Types.ObjectId()}`,
    stock: 10,
  })
}

// A consented guest cart with one item, idle long enough to be reminded.
async function makeCart(overrides: Record<string, any> = {}) {
  const product = await makeProduct()
  return Cart.create({
    guestPhone: "9876543210",
    whatsappConsent: true,
    status: "active",
    lastActivityAt: STALE,
    items: [{ product: product._id, quantity: 1 }],
    ...overrides,
  })
}

async function makeOrder(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    orderNumber: `T-${new mongoose.Types.ObjectId()}`,
    totalAmount: 500,
    paymentMethod: "cod",
    ...overrides,
  }
  return Order.create(doc)
}

const sendCalls = () => vi.mocked(sendWhatsAppTemplate).mock.calls.map(([params]) => params)

describe("auth", () => {
  it("rejects requests without the correct bearer secret", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/abandoned-cart-whatsapp"))
    expect(res.status).toBe(401)
  })

  it("rejects everything when CRON_SECRET is unset, including 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET
    const res = await GET(
      new NextRequest("http://localhost/api/cron/abandoned-cart-whatsapp", {
        headers: { authorization: "Bearer undefined" },
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe("the message", () => {
  it("sends ecommerce_abandoned_cart in 'en' with exactly name, items, discount and no buttons", async () => {
    const product = await makeProduct("Vitamin C Serum")
    await makeCart({ items: [{ product: product._id, quantity: 2 }] })

    const { data } = await run()
    expect(data.sent).toBe(1)

    expect(sendCalls()).toEqual([
      {
        phone: "9876543210",
        templateName: "ecommerce_abandoned_cart",
        language: "en",
        variables: ["there", "Vitamin C Serum", "10% (code CART10)"],
      },
    ])
  })

  it("names the first product and counts the rest", async () => {
    const [serum, balm, wash] = await Promise.all([
      makeProduct("Vitamin C Serum"),
      makeProduct("Lip Balm"),
      makeProduct("Face Wash"),
    ])
    await makeCart({
      items: [
        { product: serum._id, quantity: 1 },
        { product: balm._id, quantity: 1 },
        { product: wash._id, quantity: 3 },
      ],
    })

    await run()
    expect(sendCalls()[0].variables).toEqual(["there", "Vitamin C Serum + 2 more", "10% (code CART10)"])
  })

  it("greets a logged-in customer by first name and falls back to the account phone", async () => {
    const user = await User.create({ email: "raj@example.com", name: "Raj  Sharma", phone: "9123456780" })
    await makeCart({ user: user._id, guestPhone: null })

    await run()
    expect(sendCalls()[0].phone).toBe("9123456780")
    expect(sendCalls()[0].variables?.[0]).toBe("Raj")
  })
})

describe("which carts are picked", () => {
  it("waits 45 minutes", async () => {
    await makeCart({ lastActivityAt: minutesAgo(40) })
    expect((await run()).data.processed).toBe(0)

    await Cart.updateMany({}, { lastActivityAt: minutesAgo(46) })
    expect((await run()).data.sent).toBe(1)
  })

  it("leaves carts idle for more than 24 hours alone", async () => {
    await makeCart({ lastActivityAt: minutesAgo(25 * 60) })
    expect((await run()).data.processed).toBe(0)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("needs consent, items and an active cart", async () => {
    await makeCart({ whatsappConsent: false })
    await makeCart({ guestPhone: "9876543211", items: [] })
    await makeCart({ guestPhone: "9876543212", status: "converted" })

    expect((await run()).data.processed).toBe(0)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("skips a phone that has opted out", async () => {
    await makeCart()
    await WhatsAppOptOut.create({ phone: "9876543210" })

    const { data } = await run()
    expect(data.skipped.optedOut).toBe(1)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("skips a consented cart with no phone anywhere", async () => {
    await makeCart({ guestPhone: null })

    const { data } = await run()
    expect(data.skipped.noPhone).toBe(1)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe("never twice", () => {
  it("sends once across repeated runs", async () => {
    await makeCart()

    expect((await run()).data.sent).toBe(1)
    expect((await run()).data.processed).toBe(0)
    expect((await run()).data.processed).toBe(0)
    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
  })

  it("sends once when two runs overlap", async () => {
    await makeCart()
    // Hold the send open so both runs have loaded the cart before either finishes.
    vi.mocked(sendWhatsAppTemplate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "msg_1" }), 100)),
    )

    const [a, b] = await Promise.all([run(), run()])

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
    expect(a.data.sent + b.data.sent).toBe(1)
    expect(a.data.skipped.claimed + b.data.skipped.claimed).toBe(1)
  })

  it("does not send to a customer who came back or checked out after the run loaded their cart", async () => {
    await makeCart({ guestPhone: "9000000001", lastActivityAt: minutesAgo(120) }) // stalest, so sent first
    const cameBack = await makeCart({ guestPhone: "9000000002", lastActivityAt: minutesAgo(90) })
    const checkedOut = await makeCart({ guestPhone: "9000000003", lastActivityAt: minutesAgo(60) })
    // Both changes land mid-run: while the first cart's message is going out.
    vi.mocked(sendWhatsAppTemplate).mockImplementationOnce(async () => {
      await Cart.updateOne({ _id: cameBack._id }, { lastActivityAt: new Date() })
      await Cart.updateOne({ _id: checkedOut._id }, { status: "converted" })
      return { id: "msg_1" }
    })

    const { data } = await run()

    expect(data.sent).toBe(1)
    expect(data.skipped.claimed).toBe(2)
    expect(sendCalls().map((call) => call.phone)).toEqual(["9000000001"])
  })
})

describe("customer ordered first", () => {
  it("skips when the same phone placed an order after the cart was created", async () => {
    const cart = await makeCart()
    await makeOrder({ guestPhone: "9876543210" })

    const { data } = await run()
    expect(data.skipped.ordered).toBe(1)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
    // Not claimed either — nothing was attempted.
    expect((await Cart.findById(cart._id)).whatsappReminderSentAt).toBeNull()
  })

  it("matches the order by shipping phone, by account and by cart id too", async () => {
    const user = await User.create({ email: "a@example.com", name: "Asha", phone: "9000000001" })
    await makeCart({ guestPhone: "9000000002" })
    await makeOrder({ shippingAddress: { phone: "9000000002" } })
    await makeCart({ guestPhone: "9000000003", user: user._id })
    await makeOrder({ user: user._id })
    const byCartId = await makeCart({ guestPhone: "9000000004" })
    await makeOrder({ cartId: byCartId._id })

    const { data } = await run()
    expect(data.skipped.ordered).toBe(3)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("still reminds when the only order is older than the cart", async () => {
    await makeOrder({ guestPhone: "9876543210", createdAt: minutesAgo(3 * 24 * 60) })
    await makeCart()

    expect((await run()).data.sent).toBe(1)
  })

  it("still reminds when the order is only an unfinished or failed payment", async () => {
    await makeCart()
    await makeOrder({ guestPhone: "9876543210", paymentMethod: "ccavenue", paymentStatus: "pending" })
    await makeOrder({ guestPhone: "9876543210", paymentMethod: "shiprocket_checkout", paymentStatus: "failed" })
    await makeOrder({
      guestPhone: "9876543210",
      paymentMethod: "shiprocket_checkout",
      paymentStatus: "pending",
      shiprocketPaymentType: "prepaid",
    })

    expect((await run()).data.sent).toBe(1)
  })

  it("skips for a Shiprocket cash-on-delivery order, which stays 'pending' until delivered", async () => {
    await makeCart()
    await makeOrder({
      guestPhone: "9876543210",
      paymentMethod: "shiprocket_checkout",
      paymentStatus: "pending",
      shiprocketPaymentType: "cod",
    })

    expect((await run()).data.skipped.ordered).toBe(1)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe("test mode", () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_REMINDER_MODE // unset means test mode
    process.env.WHATSAPP_TEST_PHONE = TEST_PHONE
  })

  it("is the default, and only messages the test number", async () => {
    const mine = await makeCart({ guestPhone: TEST_PHONE_10 })
    const theirs = await makeCart({ guestPhone: "9876543210" })

    const { data } = await run()
    expect(data.mode).toBe("test")
    expect(data.sent).toBe(1)
    expect(sendCalls().map((call) => call.phone)).toEqual([TEST_PHONE_10])

    expect((await Cart.findById(mine._id)).whatsappReminderSentAt).not.toBeNull()
    // The customer's cart is untouched, so it is still reminded once live.
    expect((await Cart.findById(theirs._id)).whatsappReminderSentAt).toBeNull()
  })

  it("stays in test mode for any value other than exactly 'live'", async () => {
    process.env.WHATSAPP_REMINDER_MODE = "LIVE "
    await makeCart({ guestPhone: "9876543210" })

    const { data } = await run()
    expect(data.mode).toBe("test")
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("refuses to run without a test number rather than messaging anyone", async () => {
    delete process.env.WHATSAPP_TEST_PHONE
    await makeCart()

    const { status, data } = await run()
    expect(status).toBe(500)
    expect(data.error).toMatch(/WHATSAPP_TEST_PHONE/)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("does not message a customer whose account phone is not the test number", async () => {
    const user = await User.create({ email: "c@example.com", name: "Chitra", phone: "9876543210" })
    await makeCart({ guestPhone: null, user: user._id })

    expect((await run()).data.sent).toBe(0)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it("lets ?delayMinutes shorten the wait, in test mode only", async () => {
    await makeCart({ guestPhone: TEST_PHONE_10, lastActivityAt: minutesAgo(5) })

    expect((await run()).data.processed).toBe(0)
    expect((await run("?delayMinutes=1")).data.sent).toBe(1)

    process.env.WHATSAPP_REMINDER_MODE = "live"
    await makeCart({ guestPhone: "9876543210", lastActivityAt: minutesAgo(5) })
    expect((await run("?delayMinutes=1")).data.processed).toBe(0)
  })
})

describe("dry run", () => {
  it("sends nothing and writes nothing", async () => {
    const cart = await makeCart()

    const { data } = await run("?dryRun=1")
    expect(data.dryRun).toBe(true)
    expect(data.sent).toBe(0)
    expect(data.results).toEqual([
      { cartId: String(cart._id), phone: "******3210", status: "would_send", variables: ["there", "Face Wash", "10% (code CART10)"] },
    ])

    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
    expect(await WhatsAppMessageLog.countDocuments()).toBe(0)
    const after = await Cart.findById(cart._id)
    expect(after.whatsappReminderSentAt).toBeNull()
    expect(after.whatsappReminderAttempts).toBe(0)
  })

  it("previews the live audience from test mode, without needing the API key", async () => {
    delete process.env.WHATSAPP_REMINDER_MODE
    delete process.env.SCALECHAT_API_KEY
    process.env.WHATSAPP_TEST_PHONE = TEST_PHONE
    await makeCart({ guestPhone: TEST_PHONE_10 })
    await makeCart({ guestPhone: "9876543210" })

    const { status, data } = await run("?dryRun=1")
    expect(status).toBe(200)
    expect(data.results.map((r: any) => [r.phone, r.status, r.reason])).toEqual(
      expect.arrayContaining([
        ["******0099", "would_send", undefined],
        ["******3210", "skipped", "test mode — not the test number"],
      ]),
    )
    // The skipped cart still shows the message it would get once live.
    expect(data.results.find((r: any) => r.status === "skipped").variables).toEqual(["there", "Face Wash", "10% (code CART10)"])
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe("logging and failures", () => {
  it("logs a successful send with what was sent and ScaleChat's response", async () => {
    const cart = await makeCart()
    await run()

    const logs = await WhatsAppMessageLog.find().lean()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      cart: cart._id,
      phone: "919876543210",
      templateName: "ecommerce_abandoned_cart",
      variables: ["there", "Face Wash", "10% (code CART10)"],
      mode: "live",
      status: "sent",
      attempt: 1,
      error: null,
      response: { id: "msg_1" },
    })
  })

  it("logs a refused send and retries it on later runs, three tries at most", async () => {
    await makeCart()
    vi.mocked(sendWhatsAppTemplate).mockRejectedValue(new ScaleChatError("template paused", true))

    for (let i = 0; i < 5; i++) await run()

    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(3)
    const logs = await WhatsAppMessageLog.find().sort({ attempt: 1 }).lean()
    expect(logs.map((log: any) => [log.status, log.attempt, log.error])).toEqual([
      ["failed", 1, "template paused"],
      ["failed", 2, "template paused"],
      ["failed", 3, "template paused"],
    ])
  })

  it("sends on the retry once ScaleChat accepts", async () => {
    await makeCart()
    vi.mocked(sendWhatsAppTemplate).mockRejectedValueOnce(new ScaleChatError("rate limited", true))

    expect((await run()).data.failed).toBe(1)
    expect((await run()).data.sent).toBe(1)
    expect((await run()).data.processed).toBe(0)
    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(2)
  })

  it("never retries a send with no clear answer, since it may have gone out", async () => {
    await makeCart()
    vi.mocked(sendWhatsAppTemplate).mockRejectedValue(new ScaleChatError("timed out", false))

    expect((await run()).data.failed).toBe(1)
    expect((await run()).data.processed).toBe(0)
    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(1)
    expect(await WhatsAppMessageLog.countDocuments({ status: "failed" })).toBe(1)
  })

  it("stops the run after three failures in a row and leaves the rest for later", async () => {
    for (let i = 0; i < 5; i++) await makeCart({ guestPhone: `987654321${i}` })
    vi.mocked(sendWhatsAppTemplate).mockRejectedValue(new ScaleChatError("timed out", false))

    const { data } = await run()
    expect(data.stoppedEarly).toBe(true)
    expect(data.failed).toBe(3)
    expect(sendWhatsAppTemplate).toHaveBeenCalledTimes(3)
    expect(await Cart.countDocuments({ whatsappReminderSentAt: null })).toBe(2)
  })

  it("refuses to run without the API key", async () => {
    delete process.env.SCALECHAT_API_KEY
    await makeCart()

    const { status, data } = await run()
    expect(status).toBe(500)
    expect(data.error).toMatch(/SCALECHAT_API_KEY/)
    expect((await Cart.findOne()).whatsappReminderSentAt).toBeNull()
  })
})
