// Regression: Shiprocket Custom Checkout orders are saved with no `user`
// (only guestEmail/guestName). /api/admin/analytics grouped customers by
// `$user`, so all guest orders collapsed into one `_id: null` group and
// `customer._id.toString()` threw — the admin dashboard showed
// "Unable to load analytics".
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
import { getServerSession } from "next-auth"

let GET: typeof import("@/app/api/admin/analytics/route").GET

beforeAll(async () => {
  await connectTestDb()
  ;({ GET } = await import("@/app/api/admin/analytics/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Order.deleteMany({})])
  await User.create({ email: "admin@nezal.com", name: "Admin", role: "admin" })
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue({ user: { email: "admin@nezal.com", role: "admin" } } as any)
})

function order(fields: Record<string, unknown>) {
  const doc: Record<string, unknown> = {
    orderNumber: `ORD-${new mongoose.Types.ObjectId()}`,
    items: [],
    paymentStatus: "completed",
    paymentMethod: "shiprocket_checkout",
    ...fields,
  }
  return Order.create(doc)
}

describe("GET /api/admin/analytics — guest orders", () => {
  it("loads, and lists each guest buyer separately in topCustomers", async () => {
    const member = await User.create({ email: "priya@example.com", name: "Priya", role: "user" })
    await order({ user: member._id, totalAmount: 300, paymentMethod: "razorpay" })
    await order({ guestEmail: "Guest.One@Example.com", guestName: "Guest One", totalAmount: 500 })
    await order({ guestEmail: " guest.one@example.com ", guestName: "Guest One", totalAmount: 200 })
    await order({ guestEmail: "guest.two@example.com", guestName: "Guest Two", totalAmount: 100 })

    const res = await GET(new NextRequest("http://localhost/api/admin/analytics"))
    expect(res.status).toBe(200)
    const { topCustomers } = await res.json()

    expect(topCustomers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "guest:guest.one@example.com", name: "Guest One", totalRevenue: 700, totalOrders: 2 }),
        expect.objectContaining({ userId: "guest:guest.two@example.com", name: "Guest Two", totalRevenue: 100 }),
        expect.objectContaining({ userId: String(member._id), name: "Priya", email: "priya@example.com", totalRevenue: 300 }),
      ]),
    )
    expect(topCustomers).toHaveLength(3)
  })
})
