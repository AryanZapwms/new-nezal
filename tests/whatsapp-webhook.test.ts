// Integration tests for app/api/webhooks/whatsapp/[secret]/route.ts —
// STOP/START opt-outs and the "Complete order" cart-link reply. Real
// in-memory MongoDB; only the outbound ScaleChat text is mocked.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { User } from "@/lib/models/user"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  sendWhatsAppText: vi.fn(),
}))
import { sendWhatsAppText } from "@/lib/whatsapp"

let POST: typeof import("@/app/api/webhooks/whatsapp/[secret]/route").POST

const SECRET = "test-webhook-secret"
const GUEST_TOKEN = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b"

beforeAll(async () => {
  await connectTestDb()
  ;({ POST } = await import("@/app/api/webhooks/whatsapp/[secret]/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Cart.deleteMany({}), User.deleteMany({}), WhatsAppOptOut.deleteMany({})])
  vi.mocked(sendWhatsAppText).mockReset().mockResolvedValue({})

  process.env.WHATSAPP_WEBHOOK_SECRET = SECRET
  process.env.WHATSAPP_REMINDER_MODE = "live"
  delete process.env.WHATSAPP_TEST_PHONE
})

async function deliver(payload: unknown, secret = SECRET) {
  const res = await POST(
    new NextRequest("http://localhost/api/webhooks/whatsapp/x", { method: "POST", body: JSON.stringify(payload) }),
    { params: Promise.resolve({ secret }) },
  )
  return res.status
}

const inbound = (message: string, phone = "919876543210") => ({ event: "message.received", data: { phone, message } })

describe("auth", () => {
  it("rejects a wrong secret", async () => {
    expect(await deliver(inbound("STOP"), "nope")).toBe(401)
    expect(await WhatsAppOptOut.countDocuments()).toBe(0)
  })

  it("rejects everything when WHATSAPP_WEBHOOK_SECRET is unset", async () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET
    expect(await deliver(inbound("STOP"), "undefined")).toBe(401)
    expect(await WhatsAppOptOut.countDocuments()).toBe(0)
  })
})

describe("opt-out", () => {
  it("records STOP against the bare 10-digit number", async () => {
    expect(await deliver(inbound("STOP"))).toBe(200)
    expect((await WhatsAppOptOut.find().lean()).map((doc: any) => doc.phone)).toEqual(["9876543210"])
  })

  it("accepts unsubscribe, any casing and stray punctuation", async () => {
    await deliver(inbound("Stop.", "919000000001"))
    await deliver(inbound("  unsubscribe!", "+91 90000 00002"))
    expect(await WhatsAppOptOut.countDocuments()).toBe(2)
  })

  it("finds the sender and text in a nested payload shape", async () => {
    await deliver({ type: "message.received", data: { from: "919876543210", text: { body: "stop" } } })
    expect(await WhatsAppOptOut.countDocuments({ phone: "9876543210" })).toBe(1)
  })

  it("does not opt out on a message that merely contains the word", async () => {
    await deliver(inbound("please don't stop my order"))
    expect(await WhatsAppOptOut.countDocuments()).toBe(0)
  })

  it("keeps one row when STOP arrives twice", async () => {
    await deliver(inbound("STOP"))
    await deliver(inbound("STOP"))
    expect(await WhatsAppOptOut.countDocuments()).toBe(1)
  })

  it("START opts the phone back in", async () => {
    await deliver(inbound("STOP"))
    await deliver(inbound("Start"))
    expect(await WhatsAppOptOut.countDocuments()).toBe(0)
  })

  it("ignores a message with no usable phone number", async () => {
    expect(await deliver({ event: "message.received", data: { message: "STOP" } })).toBe(200)
    expect(await WhatsAppOptOut.countDocuments()).toBe(0)
  })
})

describe("'Complete order' button", () => {
  const sentTo = () => vi.mocked(sendWhatsAppText).mock.calls.map(([phone]) => phone)
  const sentMessage = () => vi.mocked(sendWhatsAppText).mock.calls[0][1]

  it("replies with a link that carries the guest cart to any browser", async () => {
    await Cart.create({ guestToken: GUEST_TOKEN, guestPhone: "9876543210", whatsappReminderSentAt: new Date() })

    expect(await deliver(inbound("Complete order"))).toBe(200)

    expect(sentTo()).toEqual(["9876543210"])
    expect(sentMessage()).toContain(`https://nezalherbocare.com/api/cart/recover?token=${GUEST_TOKEN}`)
  })

  it("recognises the tap when it arrives as a button object", async () => {
    await deliver({ event: "message.received", data: { phone: "919876543210", button: { text: "Complete order" } } })
    expect(sendWhatsAppText).toHaveBeenCalledTimes(1)
  })

  it("links the cart that was reminded, not another open cart on the same phone", async () => {
    await Cart.create({
      guestToken: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      guestPhone: "9876543210",
      lastActivityAt: new Date(),
    })
    await Cart.create({
      guestToken: GUEST_TOKEN,
      guestPhone: "9876543210",
      lastActivityAt: new Date(Date.now() - 60 * 60 * 1000),
      whatsappReminderSentAt: new Date(),
    })

    await deliver(inbound("Complete order"))
    expect(sentMessage()).toContain(GUEST_TOKEN)
  })

  it("sends the plain cart page for an account's cart, or when no open cart is found", async () => {
    const user = await User.create({ email: "raj@example.com", name: "Raj" })
    await Cart.create({ user: user._id, guestPhone: "9876543210", whatsappReminderSentAt: new Date() })
    await Cart.create({ guestToken: GUEST_TOKEN, guestPhone: "9000000001", status: "converted" })

    await deliver(inbound("Complete order"))
    await deliver(inbound("Complete order", "919000000001"))

    const messages = vi.mocked(sendWhatsAppText).mock.calls.map(([, message]) => message)
    expect(messages).toHaveLength(2)
    for (const message of messages) {
      expect(message).toContain("https://nezalherbocare.com/cart")
      expect(message).not.toContain("recover")
    }
  })

  it("in test mode, only ever replies to the test number", async () => {
    delete process.env.WHATSAPP_REMINDER_MODE
    process.env.WHATSAPP_TEST_PHONE = "919000000099"

    await deliver(inbound("Complete order", "919876543210"))
    expect(sendWhatsAppText).not.toHaveBeenCalled()

    await deliver(inbound("Complete order", "919000000099"))
    expect(sentTo()).toEqual(["9000000099"])
  })

  it("replies to no one in test mode without a test number", async () => {
    delete process.env.WHATSAPP_REMINDER_MODE
    await deliver(inbound("Complete order"))
    expect(sendWhatsAppText).not.toHaveBeenCalled()
  })

  it("still answers 200 when the reply fails, so the tap isn't redelivered", async () => {
    vi.mocked(sendWhatsAppText).mockRejectedValue(new Error("ScaleChat down"))
    expect(await deliver(inbound("Complete order"))).toBe(200)
  })

  it("does not reply to any other message", async () => {
    await deliver(inbound("when will my order arrive?"))
    await deliver(inbound("STOP"))
    expect(sendWhatsAppText).not.toHaveBeenCalled()
  })
})
