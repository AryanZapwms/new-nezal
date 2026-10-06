// POST /api/email/send must only ever email the signed-in account, and order
// confirmations must come from an order that account owns.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn(({ orderId }: { orderId: string }) => ({
    subject: `confirmation subject for ${orderId}`,
    html: "<order-confirmation/>",
    text: "order confirmation",
    category: "transactional",
  })),
  getPaymentFailedEmail: vi.fn(() => ({
    subject: "payment failed subject",
    html: "<payment-failed/>",
    text: "payment failed",
    category: "transactional",
  })),
}))
import { getServerSession } from "next-auth"
import { sendEmail, getOrderConfirmationEmail, getPaymentFailedEmail } from "@/lib/email"

let POST: typeof import("@/app/api/email/send/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ POST } = await import("@/app/api/email/send/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

const ME = { id: new mongoose.Types.ObjectId().toString(), email: "me@example.com", name: "Me" }

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Product.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue({ user: { ...ME, role: "user" } } as any)
  vi.mocked(sendEmail).mockClear()
  vi.mocked(getOrderConfirmationEmail).mockClear()
  vi.mocked(getPaymentFailedEmail).mockClear()
})

const send = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/email/send", { method: "POST", body: JSON.stringify(body) }))

async function makeOrder(overrides: Record<string, unknown> = {}): Promise<any> {
  const product = await Product.create({
    name: "Rose Soap",
    slug: `rose-soap-${new mongoose.Types.ObjectId()}`,
    price: 100,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-RS",
  })
  const doc: Record<string, unknown> = {
    orderNumber: `ORD-${new mongoose.Types.ObjectId()}`,
    items: [{ product: product._id, quantity: 2, price: 100 }],
    totalAmount: 200,
    shippingAddress: { name: "Me Myself" },
    ...overrides,
  }
  return Order.create(doc)
}

describe("POST /api/email/send — recipient", () => {
  it("rejects anonymous callers", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await send({ type: "payment-failed", data: { totalAmount: 10 } })
    expect(res.status).toBe(401)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("rejects an arbitrary recipient address", async () => {
    const res = await send({ type: "payment-failed", to: "victim@example.org", data: { totalAmount: 10 } })
    expect(res.status).toBe(403)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("sends to the account email when `to` is omitted", async () => {
    const res = await send({ type: "payment-failed", subject: "Payment Cancelled - Nezal", data: { customerName: "Me", totalAmount: 10 } })
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ME.email, subject: "Payment Cancelled - Nezal" }))
  })

  it("accepts `to` when it is the account email (any case / whitespace)", async () => {
    const res = await send({ type: "payment-failed", to: "  ME@Example.com ", data: { totalAmount: 10 } })
    expect(res.status).toBe(200)
    // No subject in the request, so the template's own subject is used.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ME.email, subject: "payment failed subject", text: "payment failed" }),
    )
  })

  it("rejects unknown email types", async () => {
    const res = await send({ type: "welcome" })
    expect(res.status).toBe(400)
  })
})

describe("POST /api/email/send — order-confirmation", () => {
  it("requires an orderId", async () => {
    const res = await send({ type: "order-confirmation", data: { orderId: "x", items: [], total: 1 } })
    expect(res.status).toBe(400)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("refuses an order the caller does not own", async () => {
    const order = await makeOrder({ user: new mongoose.Types.ObjectId() })
    const res = await send({ type: "order-confirmation", orderId: String(order._id) })
    expect(res.status).toBe(404)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("sends for the caller's own order, built from the stored order (not client data)", async () => {
    const order = await makeOrder({ user: new mongoose.Types.ObjectId(ME.id) })
    const res = await send({
      type: "order-confirmation",
      orderId: String(order._id),
      data: { total: 1, items: [{ name: "Injected", quantity: 99, price: 0 }] },
    })
    expect(res.status).toBe(200)
    expect(getOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.orderNumber,
        total: 200,
        items: [expect.objectContaining({ name: "Rose Soap", quantity: 2, price: 100 })],
      }),
    )
    // Subject, HTML and the plain-text part all come from the template, never the request.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ME.email,
        subject: `confirmation subject for ${order.orderNumber}`,
        html: "<order-confirmation/>",
        text: "order confirmation",
      }),
    )
  })

  it("accepts a guest order whose guestEmail matches the account (lib/order-access.ts)", async () => {
    const order = await makeOrder({ guestEmail: "Me@Example.com" })
    const res = await send({ type: "order-confirmation", orderId: order.orderNumber })
    expect(res.status).toBe(200)
  })
})
