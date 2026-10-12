// Auth on app/api/cron/abandoned-payments/route.ts — specifically that an
// unset CRON_SECRET locks the route instead of accepting "Bearer undefined".
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { Order } from "@/lib/models/order"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(), getAbandonedPaymentEmail: vi.fn() }))

let GET: typeof import("@/app/api/cron/abandoned-payments/route").GET

beforeAll(async () => {
  await connectTestDb()
  ;({ GET } = await import("@/app/api/cron/abandoned-payments/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Order.deleteMany({})
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
