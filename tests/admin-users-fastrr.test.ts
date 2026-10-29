// Admin side of Fastrr customers (lib/fastrr-customers.ts): they're listed
// in /api/users with their source, left out of the analytics user count, and
// deleting any user unlinks their orders instead of leaving them pointing at
// a user that no longer exists.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { connectTestDb, disconnectTestDb } from "./setup-db"
import { ownedOrdersFilter } from "@/lib/order-access"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
import { getServerSession } from "next-auth"

let usersGET: typeof import("@/app/api/users/route").GET
let userDELETE: typeof import("@/app/api/users/[id]/route").DELETE
let analyticsGET: typeof import("@/app/api/admin/analytics/route").GET

beforeAll(async () => {
  await connectTestDb()
  ;({ GET: usersGET } = await import("@/app/api/users/route"))
  ;({ DELETE: userDELETE } = await import("@/app/api/users/[id]/route"))
  ;({ GET: analyticsGET } = await import("@/app/api/admin/analytics/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Order.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
})

async function seed() {
  const admin = await User.create({ email: "admin@nezal.com", name: "Admin", role: "admin" })
  // Created before User.source existed — no value stored.
  await User.collection.insertOne({ email: "priya@example.com", name: "Priya", role: "user", isVerified: true })
  const unclaimed = await User.create({ email: "9065686331@fastrr.com", name: "Ravi", phone: "9065686331", source: "fastrr" })
  const claimed = await User.create({ email: "asha@example.com", name: "Asha", source: "fastrr", isVerified: true })
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: String(admin._id), email: "admin@nezal.com", name: "Admin", role: "admin" },
  } as any)
  return { admin, unclaimed, claimed }
}

describe("GET /api/users", () => {
  it("lists Fastrr customers with their source, and older users as sign-ups", async () => {
    await seed()

    const users = await (await usersGET(new Request("http://localhost/api/users"))).json()
    const sourceByEmail = Object.fromEntries(users.map((u: any) => [u.email, u.source]))

    expect(sourceByEmail).toEqual({
      "admin@nezal.com": "signup",
      "priya@example.com": "signup",
      "9065686331@fastrr.com": "fastrr",
      "asha@example.com": "fastrr",
    })
  })
})

describe("GET /api/admin/analytics — totalUsers", () => {
  it("leaves out Fastrr customers, claimed or not", async () => {
    await seed()

    const body = await (await analyticsGET(new NextRequest("http://localhost/api/admin/analytics"))).json()

    // priya only: the admin isn't role "user", and both Fastrr customers are excluded.
    expect(body.overview.totalUsers).toBe(1)
  })
})

describe("DELETE /api/users/[id]", () => {
  const del = (id: any) => userDELETE(new Request(`http://localhost/api/users/${id}`), { params: Promise.resolve({ id: String(id) }) })

  const createOrder = (doc: Record<string, unknown>): Promise<any> => Order.create(doc)
  const findOrder = (id: unknown): Promise<any> => Order.findById(id).lean()

  it("unlinks the deleted user's orders, so the email's owner can still see them", async () => {
    const { claimed } = await seed()
    const priya: any = await User.findOne({ email: "priya@example.com" }).lean()
    const order = await createOrder({
      orderNumber: "ORD-FASTRR-1",
      totalAmount: 300,
      paymentMethod: "shiprocket_checkout",
      user: claimed._id,
      guestEmail: "asha@example.com",
    })
    const otherOrder = await createOrder({ orderNumber: "ORD-OTHER-1", totalAmount: 100, user: priya._id })

    expect((await del(claimed._id)).status).toBe(200)

    expect((await findOrder(order._id)).user).toBeUndefined()
    expect((await findOrder(otherOrder._id)).user).toBeTruthy()

    // The same person signs up again with that email: the order is theirs through guestEmail.
    const again = await User.create({ email: "asha@example.com", name: "Asha", isVerified: true })
    const owned = await Order.find(ownedOrdersFilter(again)).select("orderNumber").lean()
    expect(owned.map((o: any) => o.orderNumber)).toEqual(["ORD-FASTRR-1"])
  })
})
