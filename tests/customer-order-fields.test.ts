// Customer-facing order routes must never send admin-only fields — reviewNotes
// (they can hold addresses and the editing admin's email), needsReview and
// shiprocketError. No database: each Mongoose query is a stand-in that records
// its select() and resolves to a stored order with that projection applied,
// the way MongoDB would, and rejects an inclusive or mixed projection.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"

const db = vi.hoisted(() => ({
  orderFindById: vi.fn(),
  orderFind: vi.fn(),
  userFindOne: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { email: "buyer@example.com" } })) }))
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => {}) }))
vi.mock("@/lib/models/order", () => ({ Order: { findById: db.orderFindById, find: db.orderFind } }))
vi.mock("@/lib/models/user", () => ({ User: { findOne: db.userFindOne } }))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  getOrderConfirmationEmail: vi.fn(),
  getAdminOrderNotificationEmail: vi.fn(),
  getOrderStatusUpdateEmail: vi.fn(),
}))
vi.mock("@/lib/shiprocket", () => ({
  createShiprocketOrderForOrder: vi.fn(),
  autoCreateShiprocketOrder: vi.fn(),
  cancelShiprocketOrder: vi.fn(),
}))

import { GET as orderGET } from "@/app/api/orders/[id]/route"
import { GET as ordersListGET } from "@/app/api/orders/route"
import { POST as cancelPOST } from "@/app/api/orders/[id]/cancel/route"
import { CUSTOMER_HIDDEN_ORDER_FIELDS, CUSTOMER_ORDER_PROJECTION, withoutInternalOrderFields } from "@/lib/order-access"

const USER_ID = "64b000000000000000000001"
const ORDER_ID = "64b0000000000000000000aa"

// As stored: the customer's fields plus the three internal ones
function storedOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: ORDER_ID,
    orderNumber: "ORD-TEST-1",
    user: USER_ID,
    orderStatus: "pending",
    shippingStatus: "processing",
    paymentMethod: "cod",
    totalAmount: 310,
    shippingAddress: { name: "Asha K", address: "Flat 4, Main Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    cancellation: { status: "none" },
    reviewNotes: ["Shipping address edited in admin by admin@example.com on 2026-11-17T00:00:00.000Z. Previous: …"],
    needsReview: true,
    shiprocketError: "Shiprocket order creation failed (HTTP 422): {}",
    ...overrides,
  }
}

function fakeQuery(data: object | object[]) {
  const selects: string[] = []
  const query: any = {
    selects,
    select: vi.fn((projection: string) => {
      selects.push(projection)
      return query
    }),
    populate: vi.fn(() => query),
    sort: vi.fn(() => query),
    lean: vi.fn(() => query),
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      const tokens = selects.flatMap((s) => s.trim().split(/\s+/)).filter(Boolean)
      if (tokens.some((token) => !token.startsWith("-"))) {
        return Promise.reject(new Error(`inclusive or mixed projection: ${selects.join(" | ")}`)).then(resolve, reject)
      }
      const excluded = new Set(tokens.map((token) => token.slice(1)))
      const project = (doc: object) => Object.fromEntries(Object.entries(doc).filter(([key]) => !excluded.has(key)))
      return Promise.resolve(Array.isArray(data) ? data.map(project) : project(data)).then(resolve, reject)
    },
  }
  return query
}

function expectNoInternalFields(order: Record<string, unknown>) {
  for (const field of CUSTOMER_HIDDEN_ORDER_FIELDS) expect(order).not.toHaveProperty(field)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.userFindOne.mockResolvedValue({ _id: USER_ID, email: "buyer@example.com" })
})

describe("customer order responses leave out admin-only fields", () => {
  it("hides exactly reviewNotes, needsReview and shiprocketError", () => {
    expect(CUSTOMER_ORDER_PROJECTION).toBe("-reviewNotes -needsReview -shiprocketError")

    const copy = withoutInternalOrderFields(storedOrder())
    expectNoInternalFields(copy)
    expect(copy).toMatchObject({ orderNumber: "ORD-TEST-1", shippingAddress: { city: "Mumbai" } })
  })

  it("GET /api/orders/[id]", async () => {
    const query = fakeQuery(storedOrder())
    db.orderFindById.mockReturnValue(query)

    const res = await orderGET(new NextRequest(`http://localhost/api/orders/${ORDER_ID}`), {
      params: Promise.resolve({ id: ORDER_ID }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expectNoInternalFields(body)
    // Still the customer's order: the ownership check read `user` and passed
    expect(body.orderNumber).toBe("ORD-TEST-1")
    expect(query.selects).toEqual([CUSTOMER_ORDER_PROJECTION])
  })

  it("GET /api/orders (order history)", async () => {
    const query = fakeQuery([storedOrder(), storedOrder({ _id: "64b0000000000000000000ab", orderNumber: "ORD-TEST-2" })])
    db.orderFind.mockReturnValue(query)

    const res = await ordersListGET(new NextRequest("http://localhost/api/orders"))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.map((order: any) => order.orderNumber)).toEqual(["ORD-TEST-1", "ORD-TEST-2"])
    body.forEach(expectNoInternalFields)
    expect(query.selects).toEqual([CUSTOMER_ORDER_PROJECTION])
  })

  it.each([
    ["a cancellation (not shipped yet)", {}, "cancel"],
    ["a return request (already shipped)", { awbCode: "AWB123", shippingStatus: "shipped" }, "return"],
  ])("POST /api/orders/[id]/cancel, %s", async (_label, overrides, type) => {
    const stored = storedOrder(overrides)
    // A Mongoose document stand-in: the route changes it, save()s it and
    // serializes it with toJSON()
    const doc: any = {
      ...stored,
      save: vi.fn(async () => {}),
      toJSON() {
        const { save: _save, toJSON: _toJSON, ...fields } = this
        return fields
      },
    }
    db.orderFindById.mockResolvedValue(doc)

    const res = await cancelPOST(
      new NextRequest(`http://localhost/api/orders/${ORDER_ID}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Changed my mind" }),
      }),
      { params: Promise.resolve({ id: ORDER_ID }) }
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe(type)
    expect(body.order.cancellation.reason).toBe("Changed my mind")
    expectNoInternalFields(body.order)
    // Only the response is stripped: the saved document keeps them
    expect(doc.save).toHaveBeenCalledOnce()
    expect(doc.reviewNotes).toEqual(stored.reviewNotes)
    expect(doc.shiprocketError).toBe(stored.shiprocketError)
  })
})
