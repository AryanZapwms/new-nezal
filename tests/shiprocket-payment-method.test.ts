// The payment_method sent to Shiprocket's logistics API decides whether the
// courier collects cash on delivery. Shiprocket Custom Checkout orders are
// all stored as paymentMethod "shiprocket_checkout", so a plain
// `paymentMethod === "cod"` check sent every one of their COD orders as
// Prepaid. These tests pin the decision for every order type and check the
// actual request body createShiprocketOrderForOrder sends.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest"
import mongoose from "mongoose"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { connectTestDb, disconnectTestDb } from "./setup-db"
import { resolveShiprocketPaymentMethod, createShiprocketOrderForOrder } from "@/lib/shiprocket"

describe("resolveShiprocketPaymentMethod", () => {
  it("leaves the existing order types exactly as before", () => {
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "cod", paymentStatus: "pending", codCharge: 50 })).toBe("COD")
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "cod", paymentStatus: "pending", codCharge: 0 })).toBe("COD")
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "razorpay", paymentStatus: "completed" })).toBe("Prepaid")
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "ccavenue", paymentStatus: "completed" })).toBe("Prepaid")
    // Old check was `=== "cod" ? "COD" : "Prepaid"` regardless of status/fee.
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "razorpay", paymentStatus: "pending", codCharge: 50 })).toBe("Prepaid")
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "ccavenue", paymentStatus: "pending" })).toBe("Prepaid")
  })

  it("uses shiprocketPaymentType for Shiprocket Checkout orders that have it", () => {
    const base = { paymentMethod: "shiprocket_checkout" }
    expect(resolveShiprocketPaymentMethod({ ...base, shiprocketPaymentType: "cod", paymentStatus: "pending", codCharge: 50 })).toBe("COD")
    // COD with the fee waived is still COD.
    expect(resolveShiprocketPaymentMethod({ ...base, shiprocketPaymentType: "cod", paymentStatus: "pending", codCharge: 0 })).toBe("COD")
    expect(resolveShiprocketPaymentMethod({ ...base, shiprocketPaymentType: "prepaid", paymentStatus: "completed", codCharge: 0 })).toBe("Prepaid")
  })

  it("falls back to paymentStatus / codCharge for orders created before shiprocketPaymentType existed", () => {
    const legacy = { paymentMethod: "shiprocket_checkout", shiprocketPaymentType: null }
    expect(resolveShiprocketPaymentMethod({ ...legacy, paymentStatus: "pending", codCharge: 50 })).toBe("COD")
    expect(resolveShiprocketPaymentMethod({ ...legacy, paymentStatus: "completed", codCharge: 0 })).toBe("Prepaid")
    expect(resolveShiprocketPaymentMethod({ paymentMethod: "shiprocket_checkout", paymentStatus: "pending", codCharge: 50 })).toBe("COD")
  })

  it("refuses to guess when a Shiprocket Checkout order has no signal at all", () => {
    expect(
      resolveShiprocketPaymentMethod({ paymentMethod: "shiprocket_checkout", shiprocketPaymentType: null, paymentStatus: "pending", codCharge: 0 })
    ).toBeNull()
  })
})

describe("createShiprocketOrderForOrder → payment_method sent to Shiprocket", () => {
  let productId: mongoose.Types.ObjectId
  let adhocBodies: any[]

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  beforeEach(async () => {
    await Promise.all([Order.deleteMany({}), Product.deleteMany({})])
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    const product = await Product.create({
      name: "Aloe Vera Gel",
      slug: "aloe-vera-gel-pm",
      price: 200,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-AVG",
      stock: 10,
    })
    productId = product._id

    adhocBodies = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith("/auth/login")) {
          return new Response(JSON.stringify({ token: "test-token" }), { status: 200 })
        }
        if (String(url).endsWith("/orders/create/adhoc")) {
          adhocBodies.push(JSON.parse(String(init?.body)))
          return new Response(JSON.stringify({ order_id: 111, shipment_id: 222, status: "NEW" }), { status: 200 })
        }
        return new Response("{}", { status: 404 })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Inserted through the raw collection so "legacy" orders really lack the
  // shiprocketPaymentType field, like the ones in production.
  async function insertOrder(fields: Record<string, unknown>) {
    const { insertedId } = await Order.collection.insertOne({
      orderNumber: `ORD-TEST-${Math.random().toString(36).slice(2)}`,
      items: [{ product: productId, quantity: 1, price: 200 }],
      totalAmount: 310,
      shippingAmount: 60,
      codCharge: 50,
      discountAmount: 0,
      paymentStatus: "pending",
      orderStatus: "pending",
      guestEmail: "buyer@example.com",
      shippingAddress: { name: "Asha K", phone: "9876543210", address: "1 Road", city: "Mumbai", state: "MH", pincode: "400001", country: "India" },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...fields,
    })
    return insertedId.toString()
  }

  it("sends COD for a Shiprocket Checkout COD order", async () => {
    const id = await insertOrder({ paymentMethod: "shiprocket_checkout", shiprocketPaymentType: "cod" })
    const result = await createShiprocketOrderForOrder(id)

    expect(result?.shiprocketOrderId).toBe(111)
    expect(adhocBodies).toHaveLength(1)
    expect(adhocBodies[0].payment_method).toBe("COD")
    // Collectable amount = sub_total + shipping_charges (shipping + COD fee).
    expect(adhocBodies[0].sub_total).toBe(200)
    expect(adhocBodies[0].shipping_charges).toBe(110)
  })

  it("sends COD for a legacy Shiprocket Checkout order identified by its COD charge", async () => {
    const id = await insertOrder({ paymentMethod: "shiprocket_checkout" })
    await createShiprocketOrderForOrder(id)

    expect(adhocBodies[0].payment_method).toBe("COD")
  })

  it("sends Prepaid for a paid Shiprocket Checkout order", async () => {
    const id = await insertOrder({
      paymentMethod: "shiprocket_checkout",
      shiprocketPaymentType: "prepaid",
      paymentStatus: "completed",
      codCharge: 0,
    })
    await createShiprocketOrderForOrder(id)

    expect(adhocBodies[0].payment_method).toBe("Prepaid")
  })

  it("does not call Shiprocket, and flags the order, when COD vs Prepaid can't be determined", async () => {
    const id = await insertOrder({ paymentMethod: "shiprocket_checkout", codCharge: 0 })
    const result = await createShiprocketOrderForOrder(id)

    expect(result).toBeNull()
    expect(adhocBodies).toHaveLength(0)
    const stored: any = await Order.findById(id).lean()
    expect(stored.shippingStatus).toBe("needs_attention")
    expect(stored.shiprocketError).toMatch(/COD or Prepaid/)
  })

  it("keeps own-checkout orders unchanged: cod → COD, razorpay/ccavenue → Prepaid", async () => {
    const cod = await insertOrder({ paymentMethod: "cod" })
    const razorpay = await insertOrder({ paymentMethod: "razorpay", paymentStatus: "completed", codCharge: 0 })
    const ccavenue = await insertOrder({ paymentMethod: "ccavenue", paymentStatus: "completed", codCharge: 0 })

    await createShiprocketOrderForOrder(cod)
    await createShiprocketOrderForOrder(razorpay)
    await createShiprocketOrderForOrder(ccavenue)

    expect(adhocBodies.map((b) => b.payment_method)).toEqual(["COD", "Prepaid", "Prepaid"])
  })
})
