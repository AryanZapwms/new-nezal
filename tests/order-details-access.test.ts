// Integration tests for the checkout → success page → order details flow.
//
// Regression: Shiprocket Custom Checkout orders are created by
// app/api/shiprocket/order-webhook/[secret]/route.ts with no session, so
// they used to be saved with only guestEmail and no `user`. The success
// page links to /profile/orders/<_id>, whose API
// (app/api/orders/[id]/route.ts) looked the order up with
// { _id, user: user._id } — which can never match an order with no user —
// so every Shiprocket order showed "Failed to fetch order details".
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { isValidElement, type ReactNode } from "react"
import { NextRequest } from "next/server"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { SHIPROCKET_VARIANT_ID_MULTIPLIER } from "@/lib/shiprocket-mapper"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue(""),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
  getOrderStatusUpdateEmail: vi.fn().mockReturnValue(""),
}))
vi.mock("@/lib/shiprocket", () => ({
  createShiprocketOrderForOrder: vi.fn().mockResolvedValue(null),
  autoCreateShiprocketOrder: vi.fn().mockResolvedValue(undefined),
  cancelShiprocketOrder: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/shiprocket-webhooks", () => ({ notifyProductWebhook: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/components/clear-cart-on-success", () => ({ ClearCartOnSuccess: () => null }))

import { getServerSession } from "next-auth"

const WEBHOOK_SECRET = "test-webhook-secret"

let webhookPOST: typeof import("@/app/api/shiprocket/order-webhook/[secret]/route").POST
let orderGET: typeof import("@/app/api/orders/[id]/route").GET
let ordersListGET: typeof import("@/app/api/orders/route").GET
let CheckoutSuccessPage: typeof import("@/app/checkout/success/page").default

beforeAll(async () => {
  process.env.SHIPROCKET_ORDER_WEBHOOK_SECRET = WEBHOOK_SECRET
  await connectTestDb()
  ;({ POST: webhookPOST } = await import("@/app/api/shiprocket/order-webhook/[secret]/route"))
  ;({ GET: orderGET } = await import("@/app/api/orders/[id]/route"))
  ;({ GET: ordersListGET } = await import("@/app/api/orders/route"))
  ;({ default: CheckoutSuccessPage } = await import("@/app/checkout/success/page"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getServerSession).mockResolvedValue(null)
})

function signInAs(email: string | null) {
  vi.mocked(getServerSession).mockResolvedValue(email ? ({ user: { email } } as any) : null)
}

async function makeProduct() {
  return Product.create({
    name: "Neem Face Wash",
    slug: "neem-face-wash-order-details",
    price: 300,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-NFW-OD",
    stock: 20,
    numericId: 4242,
  })
}

async function makeUser(email: string) {
  return User.create({ email, name: "Test Customer", isVerified: true })
}

async function deliverShiprocketWebhook(email: string, platformOrderId: string) {
  const res = await webhookPOST(
    new NextRequest(`http://localhost/api/shiprocket/order-webhook/${WEBHOOK_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: platformOrderId,
        fastrr_order_id: 987654,
        payment_status: "Success",
        email,
        total_amount_payable: 300,
        cart_data: { items: [{ variant_id: 4242 * SHIPROCKET_VARIANT_ID_MULTIPLIER, quantity: 1 }] },
        shipping_address: { first_name: "Test", last_name: "Customer", phone: "9876543210", pincode: "400001" },
      }),
    }),
    { params: Promise.resolve({ secret: WEBHOOK_SECRET }) }
  )
  expect(res.status).toBe(200)
  return res.json()
}

// Walks the success page's rendered element tree for the "View order
// details" link's href — the exact URL the customer clicks through to.
function findOrderDetailsHref(node: ReactNode): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findOrderDetailsHref(child)
      if (found) return found
    }
    return null
  }
  if (!isValidElement(node)) return null
  const props = node.props as any
  if (typeof props.href === "string" && props.href.startsWith("/profile/orders/")) return props.href
  return findOrderDetailsHref(props.children)
}

async function fetchOrderDetails(id: string) {
  const res = await orderGET(new NextRequest(`http://localhost/api/orders/${id}`), {
    params: Promise.resolve({ id }),
  })
  return { status: res.status, body: await res.json() }
}

describe("checkout → success page → order details", () => {
  it("loads a Shiprocket order for the logged-in customer who placed it", async () => {
    await makeProduct()
    const user = await makeUser("customer@test.com")

    // Checkout email casing differs from the stored (lowercased) account email.
    const webhook = await deliverShiprocketWebhook("Customer@Test.com", "SR-1001")
    const saved = await Order.findById(webhook.orderId).lean()
    expect(String((saved as any).user)).toBe(String(user._id))

    const page = await CheckoutSuccessPage({ searchParams: Promise.resolve({ oid: "SR-1001", ost: "SUCCESS" }) })
    const href = findOrderDetailsHref(page)
    expect(href).toBe(`/profile/orders/${webhook.orderId}`)

    signInAs("customer@test.com")
    const { status, body } = await fetchOrderDetails(href!.split("/").pop()!)
    expect(status).toBe(200)
    expect(body.orderNumber).toBe(webhook.orderNumber)
    expect(body.items[0].product.name).toBe("Neem Face Wash")
  })

  it("loads a guest-checkout order after the customer signs in with the same email", async () => {
    await makeProduct()
    const webhook = await deliverShiprocketWebhook("newbuyer@test.com", "SR-1002")
    const saved = await Order.findById(webhook.orderId).lean()
    expect((saved as any).user).toBeUndefined()

    // Customer registers/signs in afterwards with the checkout email.
    await makeUser("newbuyer@test.com")
    signInAs("newbuyer@test.com")

    const { status, body } = await fetchOrderDetails(String(webhook.orderId))
    expect(status).toBe(200)
    expect(body.orderNumber).toBe(webhook.orderNumber)

    const listRes = await ordersListGET(new NextRequest("http://localhost/api/orders"))
    const list = await listRes.json()
    expect(list.map((o: any) => o.orderNumber)).toContain(webhook.orderNumber)
  })
})

describe("GET /api/orders/[id] failure reasons", () => {
  it("returns 401 UNAUTHENTICATED without a session", async () => {
    const { status, body } = await fetchOrderDetails(new mongoose.Types.ObjectId().toString())
    expect(status).toBe(401)
    expect(body.code).toBe("UNAUTHENTICATED")
  })

  it("returns 400 INVALID_ORDER_ID for a malformed id instead of a 500 cast error", async () => {
    await makeUser("customer@test.com")
    signInAs("customer@test.com")
    const { status, body } = await fetchOrderDetails("ORD-12345")
    expect(status).toBe(400)
    expect(body.code).toBe("INVALID_ORDER_ID")
  })

  it("returns 404 ORDER_NOT_FOUND for an id that doesn't exist", async () => {
    await makeUser("customer@test.com")
    signInAs("customer@test.com")
    const { status, body } = await fetchOrderDetails(new mongoose.Types.ObjectId().toString())
    expect(status).toBe(404)
    expect(body.code).toBe("ORDER_NOT_FOUND")
  })

  it("returns 403 ORDER_FORBIDDEN when a different user requests the order", async () => {
    await makeProduct()
    await makeUser("customer@test.com")
    await makeUser("someone-else@test.com")
    const webhook = await deliverShiprocketWebhook("customer@test.com", "SR-1003")

    signInAs("someone-else@test.com")
    const { status, body } = await fetchOrderDetails(String(webhook.orderId))
    expect(status).toBe(403)
    expect(body.code).toBe("ORDER_FORBIDDEN")
  })

  it("does not grant access to an unlinked guest order from a different email", async () => {
    await makeProduct()
    const webhook = await deliverShiprocketWebhook("guest@test.com", "SR-1004")
    await makeUser("guest@test.com.evil.io")
    signInAs("guest@test.com.evil.io")

    const { status } = await fetchOrderDetails(String(webhook.orderId))
    expect(status).toBe(403)

    const list = await (await ordersListGET(new NextRequest("http://localhost/api/orders"))).json()
    expect(list).toHaveLength(0)
  })
})
