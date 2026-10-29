// Fastrr customers (lib/fastrr-customers.ts): a confirmed Shiprocket checkout
// order saves its customer as a User and links the order to it, and that
// customer can later claim the record — by signing up, Google sign-in or a
// password reset — without losing it or the orders linked to it.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { Otp } from "@/lib/models/otp"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOrderConfirmationEmail: vi.fn().mockReturnValue({}),
  getAdminOrderNotificationEmail: vi.fn().mockReturnValue(""),
  getWelcomeEmail: vi.fn().mockReturnValue({}),
}))
vi.mock("@/lib/shiprocket", () => ({
  createShiprocketOrderForOrder: vi.fn().mockResolvedValue({ shiprocketOrderId: 777, shiprocketShipmentId: 888 }),
  cancelShiprocketOrder: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/shiprocket-webhooks", () => ({ notifyProductWebhook: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp-order", () => ({ sendOrderConfirmationWhatsApp: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/EmailOtp", () => ({ sendOtpEmail: vi.fn().mockResolvedValue(undefined) }))

import { sendEmail } from "@/lib/email"
import { sendOtpEmail } from "@/lib/EmailOtp"
import { createShiprocketOrderForOrder } from "@/lib/shiprocket"
import { upsertShiprocketCheckoutOrder } from "@/lib/shiprocket-checkout-order"
import { isFastrrPlaceholderEmail } from "@/lib/fastrr-customers"
import { ownedOrdersFilter } from "@/lib/order-access"
import { finalizeOrderCancellation } from "@/lib/orderCancellation"

let registerPOST: typeof import("@/app/api/auth/register/route").POST
let verifyOtpPOST: typeof import("@/app/api/auth/verify-otp/route").POST
let forgotPasswordPOST: typeof import("@/app/api/auth/forgot-password/route").POST
let resetPasswordPOST: typeof import("@/app/api/auth/reset-password/route").POST
let authOptions: typeof import("@/app/api/auth/[...nextauth]/route").authOptions

const NUMERIC_ID = 42
const EMAIL = "asha@example.com"

beforeAll(async () => {
  await connectTestDb()
  await Promise.all([Order.init(), User.init()]) // unique indexes the upserts rely on
  ;({ POST: registerPOST } = await import("@/app/api/auth/register/route"))
  ;({ POST: verifyOtpPOST } = await import("@/app/api/auth/verify-otp/route"))
  ;({ POST: forgotPasswordPOST } = await import("@/app/api/auth/forgot-password/route"))
  ;({ POST: resetPasswordPOST } = await import("@/app/api/auth/reset-password/route"))
  ;({ authOptions } = await import("@/app/api/auth/[...nextauth]/route"))
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Product.deleteMany({}), User.deleteMany({}), Otp.deleteMany({})])
  vi.mocked(sendEmail).mockClear()
  vi.mocked(sendOtpEmail).mockClear()
  vi.mocked(createShiprocketOrderForOrder).mockClear()
  // Cloudflare Turnstile always passes in tests.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }))

  await Product.create({
    name: "Neem Face Wash",
    slug: "neem-face-wash-fastrr",
    price: 300,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-NFW",
    stock: 0,
    numericId: NUMERIC_ID,
    sizes: [{ size: "100", unit: "ml", price: 300, stock: 50, sku: "NFW-100" }],
  })
})

let orderSeq = 0
function payload(overrides: Record<string, unknown> = {}) {
  orderSeq += 1
  return {
    order_id: `fastrr-oid-${orderSeq}`,
    fastrr_order_id: 900000 + orderSeq,
    payment_status: "Success",
    payment_type: "PREPAID",
    email: EMAIL,
    phone: "9876543210",
    total_amount_payable: 300,
    cart_data: { items: [{ variant_id: String(NUMERIC_ID * 1000), quantity: 1 }] },
    shipping_address: { first_name: "Asha", last_name: "K", line1: "1 Road", line2: "Andheri", city: "Mumbai", state: "MH", pincode: "400001", country: "India", phone: "9876543210" },
    ...overrides,
  }
}

function post(path: string, body: unknown) {
  // A fresh IP per request keeps register's per-IP rate limit out of the way.
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${++orderSeq % 250}` },
    body: JSON.stringify(body),
  })
}

const lastOtpSent = () => vi.mocked(sendOtpEmail).mock.calls.at(-1)?.[2] as string

describe("isFastrrPlaceholderEmail", () => {
  it("matches only the @fastrr.com placeholder", () => {
    expect(isFastrrPlaceholderEmail("9065686331@fastrr.com")).toBe(true)
    expect(isFastrrPlaceholderEmail(" 9065686331@FASTRR.COM ")).toBe(true)
    expect(isFastrrPlaceholderEmail("asha@fastrr.com.in")).toBe(false)
    expect(isFastrrPlaceholderEmail("asha@example.com")).toBe(false)
    expect(isFastrrPlaceholderEmail(undefined)).toBe(false)
  })
})

describe("saving the customer of a Shiprocket checkout order", () => {
  it("creates an unclaimed customer for a paid order and links the order", async () => {
    const { order } = await upsertShiprocketCheckoutOrder(payload(), "webhook")

    const user: any = await User.findOne({ email: EMAIL }).lean()
    expect(user).toMatchObject({
      name: "Asha K",
      phone: "9876543210",
      address: { street: "1 Road, Andheri", city: "Mumbai", state: "MH", zipCode: "400001", country: "India" },
      source: "fastrr",
      isVerified: false,
      role: "user",
      marketingConsent: false,
    })
    expect(user.password).toBeUndefined()
    expect(String(order.user)).toBe(String(user._id))
  })

  it("creates a customer for a COD order", async () => {
    const { order } = await upsertShiprocketCheckoutOrder(payload({ payment_status: "Pending", payment_type: "COD" }), "webhook")

    const user: any = await User.findOne({ email: EMAIL })
    expect(user?.source).toBe("fastrr")
    expect(String(order.user)).toBe(String(user._id))
  })

  it("creates no customer for a pending or failed prepaid order, then does once it's paid", async () => {
    await upsertShiprocketCheckoutOrder(payload({ order_id: "later-paid", payment_status: "Pending" }), "webhook")
    await upsertShiprocketCheckoutOrder(payload({ payment_status: "FAILED" }), "webhook")
    expect(await User.countDocuments({})).toBe(0)

    const { order } = await upsertShiprocketCheckoutOrder(payload({ order_id: "later-paid", payment_status: "SUCCESS" }), "webhook")
    expect(await User.countDocuments({})).toBe(1)
    expect(order.user).toBeTruthy()
  })

  it("links a repeat order from the same email to the same customer", async () => {
    const first = await upsertShiprocketCheckoutOrder(payload(), "webhook")
    const second = await upsertShiprocketCheckoutOrder(payload(), "webhook")

    expect(await User.countDocuments({})).toBe(1)
    expect(String(second.order.user)).toBe(String(first.order.user))
  })

  it("creates one customer when two of their orders are confirmed at once", async () => {
    const results = await Promise.all([
      upsertShiprocketCheckoutOrder(payload(), "webhook"),
      upsertShiprocketCheckoutOrder(payload(), "webhook"),
      upsertShiprocketCheckoutOrder(payload(), "webhook"),
    ])

    expect(await User.countDocuments({})).toBe(1)
    expect(new Set(results.map((r) => String(r.order.user))).size).toBe(1)
  })

  it("links an existing registered account without changing it", async () => {
    const registered = await User.create({ email: EMAIL, name: "Asha Kapoor", password: "hash", isVerified: true })

    const { order } = await upsertShiprocketCheckoutOrder(payload({ email: "  Asha@Example.com " }), "webhook")

    expect(await User.countDocuments({})).toBe(1)
    expect(String(order.user)).toBe(String(registered._id))
    const after: any = await User.findById(registered._id).lean()
    expect(after).toMatchObject({ name: "Asha Kapoor", password: "hash", isVerified: true, source: "signup" })
  })

  it("only fills in a phone or address an existing customer is missing", async () => {
    await User.collection.insertOne({ email: EMAIL, name: "Asha Old", phone: "9000000001", source: "fastrr", isVerified: false })

    await upsertShiprocketCheckoutOrder(payload(), "webhook")

    const user: any = await User.findOne({ email: EMAIL }).lean()
    expect(user.name).toBe("Asha Old")
    expect(user.phone).toBe("9000000001")
    expect(user.address).toMatchObject({ street: "1 Road, Andheri", city: "Mumbai" })
  })

  it("saves a placeholder-email customer but sends them no confirmation email", async () => {
    const placeholder = "9065686331@fastrr.com"
    const { order } = await upsertShiprocketCheckoutOrder(
      payload({ email: placeholder, phone: "9065686331", shipping_address: { ...payload().shipping_address, phone: "9065686331" } }),
      "webhook"
    )

    const user: any = await User.findOne({ email: placeholder }).lean()
    expect(user).toMatchObject({ phone: "9065686331", source: "fastrr" })
    expect(String(order.user)).toBe(String(user._id))

    const recipients = vi.mocked(sendEmail).mock.calls.map(([args]: any[]) => args.to)
    expect(recipients).not.toContain(placeholder)
    expect(recipients).toHaveLength(1) // the admin notification still goes out
  })

  it("still sends the confirmation email to a real address", async () => {
    await upsertShiprocketCheckoutOrder(payload(), "webhook")

    const recipients = vi.mocked(sendEmail).mock.calls.map(([args]: any[]) => args.to)
    expect(recipients).toContain(EMAIL)
  })

  it("sends no cancellation email to a placeholder address, but does to a real one", async () => {
    const placeholder = "9065686331@fastrr.com"
    const { order: placeholderOrder } = await upsertShiprocketCheckoutOrder(payload({ email: placeholder }), "webhook")
    const { order: realOrder } = await upsertShiprocketCheckoutOrder(payload(), "webhook")
    vi.mocked(sendEmail).mockClear()

    await finalizeOrderCancellation(placeholderOrder, { reason: "Customer asked" })
    await finalizeOrderCancellation(realOrder, { reason: "Customer asked" })

    const recipients = vi.mocked(sendEmail).mock.calls.map(([args]: any[]) => args.to)
    expect(recipients).toEqual([EMAIL])
    const cancelled: any = await Order.findById(placeholderOrder._id).lean()
    expect(cancelled.orderStatus).toBe("cancelled")
  })

  it("doesn't hold up the order when saving the customer fails", async () => {
    const spy = vi.spyOn(User, "findOneAndUpdate").mockRejectedValueOnce(new Error("db hiccup"))
    vi.spyOn(console, "error").mockImplementationOnce(() => {})

    const { order } = await upsertShiprocketCheckoutOrder(payload(), "webhook")
    spy.mockRestore()

    expect(order.checkoutFinalizedAt).toBeInstanceOf(Date)
    expect(createShiprocketOrderForOrder).toHaveBeenCalledTimes(1)
    expect(order.user).toBeFalsy()
    expect(await User.countDocuments({})).toBe(0)
  })
})

describe("claiming a Fastrr customer record", () => {
  async function fastrrCustomer() {
    const { order } = await upsertShiprocketCheckoutOrder(payload(), "webhook")
    const user: any = await User.findOne({ email: EMAIL }).lean()
    expect(user.source).toBe("fastrr")
    return { order, user }
  }

  it("signing up with the same email keeps the record and its orders", async () => {
    const { order, user } = await fastrrCustomer()

    const res = await registerPOST(
      post("/api/auth/register", { name: "Asha Kapoor", email: EMAIL, password: "secret123", confirmPassword: "secret123", turnstileToken: "t" })
    )
    expect(res.status).toBe(201)
    expect(await User.exists({ _id: user._id })).toBeTruthy() // not deleted as an "abandoned sign-up"

    const verify = await verifyOtpPOST(post("/api/auth/verify-otp", { email: EMAIL, otp: lastOtpSent() }))
    expect(verify.status).toBe(200)

    const claimed: any = await User.findOne({ email: EMAIL }).lean()
    expect(String(claimed._id)).toBe(String(user._id))
    expect(claimed).toMatchObject({ name: "Asha Kapoor", isVerified: true, source: "fastrr" })
    expect(claimed.password).toBeTruthy()

    const owned = await Order.find(ownedOrdersFilter(claimed)).select("_id").lean()
    expect(owned.map((o: any) => String(o._id))).toEqual([String(order._id)])
  })

  it("register still clears an abandoned unverified sign-up that isn't a Fastrr customer", async () => {
    await User.collection.insertOne({ email: "abandoned@example.com", name: "Old", isVerified: false })

    await registerPOST(
      post("/api/auth/register", { name: "New", email: "abandoned@example.com", password: "secret123", confirmPassword: "secret123", turnstileToken: "t" })
    )

    expect(await User.countDocuments({ email: "abandoned@example.com" })).toBe(0)
  })

  it("Google sign-in verifies the record in place", async () => {
    const { user } = await fastrrCustomer()

    const allowed = await authOptions.callbacks!.signIn!({
      user: { id: "google-id", email: EMAIL, name: "Asha K" },
      account: { provider: "google", type: "oauth", providerAccountId: "google-id" },
    } as any)

    expect(allowed).toBe(true)
    expect(await User.countDocuments({})).toBe(1)
    const claimed: any = await User.findById(user._id).lean()
    expect(claimed).toMatchObject({ isVerified: true, provider: "google", source: "fastrr" })
  })

  it("Google sign-in drops a password that was never verified", async () => {
    const { insertedId } = await User.collection.insertOne({ email: EMAIL, name: "Asha", password: "unverified-hash", isVerified: false })

    await authOptions.callbacks!.signIn!({
      user: { id: "google-id", email: EMAIL, name: "Asha" },
      account: { provider: "google", type: "oauth", providerAccountId: "google-id" },
    } as any)

    const claimed: any = await User.findById(insertedId).lean()
    expect(claimed.isVerified).toBe(true)
    expect(claimed.password).toBeUndefined()
  })

  it("a password reset verifies the record", async () => {
    const { user } = await fastrrCustomer()

    expect((await forgotPasswordPOST(post("/api/auth/forgot-password", { email: EMAIL }))).status).toBe(200)
    const reset = await resetPasswordPOST(post("/api/auth/reset-password", { email: EMAIL, otp: lastOtpSent(), newPassword: "secret123" }))
    expect(reset.status).toBe(200)

    const claimed: any = await User.findById(user._id).lean()
    expect(claimed.isVerified).toBe(true)
    expect(claimed.password).toBeTruthy()
  })
})
