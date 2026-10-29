// Auth on app/api/cron/abandoned-payments/route.ts — specifically that an
// unset CRON_SECRET locks the route instead of accepting "Bearer undefined" —
// and that neither abandoned-payment reminder (the cron, and
// app/api/orders/[id]/check-abandonment/route.ts) goes to Shiprocket's
// <phone>@fastrr.com placeholder address.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { Order } from "@/lib/models/order"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true), getAbandonedPaymentEmail: vi.fn().mockReturnValue({}) }))
import { sendEmail } from "@/lib/email"

let GET: typeof import("@/app/api/cron/abandoned-payments/route").GET
let checkAbandonmentPOST: typeof import("@/app/api/orders/[id]/check-abandonment/route").POST

beforeAll(async () => {
  await connectTestDb()
  ;({ GET } = await import("@/app/api/cron/abandoned-payments/route"))
  ;({ POST: checkAbandonmentPOST } = await import("@/app/api/orders/[id]/check-abandonment/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Order.deleteMany({})
  vi.mocked(sendEmail).mockClear()
  process.env.CRON_SECRET = "test-cron-secret"
})

const call = (authorization?: string) =>
  GET(
    new NextRequest("http://localhost/api/cron/abandoned-payments", {
      headers: authorization ? { authorization } : {},
    }),
  )

describe("GET /api/cron/abandoned-payments — auth", () => {
  it("runs with the correct bearer secret", async () => {
    const res = await call("Bearer test-cron-secret")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ checked: 0, sent: 0 })
  })

  it("rejects a missing or wrong secret", async () => {
    expect((await call()).status).toBe(401)
    expect((await call("Bearer nope")).status).toBe(401)
  })

  it("rejects everything when CRON_SECRET is unset, including 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET
    expect((await call("Bearer undefined")).status).toBe(401)
    expect((await call()).status).toBe(401)
  })
})

describe("abandoned-payment reminders — Fastrr placeholder emails", () => {
  async function abandonedOrder(guestEmail: string) {
    const { insertedId } = await Order.collection.insertOne({
      orderNumber: `ORD-ABANDONED-${guestEmail}`,
      totalAmount: 500,
      paymentMethod: "ccavenue",
      paymentStatus: "pending",
      abandonedEmailSentAt: null,
      guestEmail,
      guestName: "Asha",
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    })
    return insertedId
  }

  const recipients = () => vi.mocked(sendEmail).mock.calls.map(([args]: any[]) => args.to)

  it("the cron skips a placeholder address and still emails a real one", async () => {
    await abandonedOrder("9065686331@fastrr.com")
    await abandonedOrder("asha@example.com")

    const res = await call("Bearer test-cron-secret")

    expect(await res.json()).toEqual({ checked: 2, sent: 1 })
    expect(recipients()).toEqual(["asha@example.com"])
  })

  it("check-abandonment skips a placeholder address and still emails a real one", async () => {
    for (const email of ["9065686331@fastrr.com", "asha@example.com"]) {
      const id = await abandonedOrder(email)
      await checkAbandonmentPOST(new NextRequest(`http://localhost/api/orders/${id}/check-abandonment`, { method: "POST" }), {
        params: { id: String(id) },
      })
    }

    expect(recipients()).toEqual(["asha@example.com"])
  })
})
