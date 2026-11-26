// Tests for POST /api/shiprocket/initiate-checkout's Meta InitiateCheckout:
// once Shiprocket returns a token, the server sends the event with the
// browser's event id, and returns the same value and contents for the
// browser's copy (hooks/use-shiprocket-checkout.ts).
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest"
import mongoose from "mongoose"

// after() needs a real request; run scheduled callbacks when the test says so.
const { afterCallbacks } = vi.hoisted(() => ({ afterCallbacks: [] as (() => unknown)[] }))
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => unknown) => {
    afterCallbacks.push(callback)
  },
}))

import { NextRequest } from "next/server"
import { Product } from "@/lib/models/product"
import { FlashSale } from "@/lib/models/flashsale"
import { POST } from "@/app/api/shiprocket/initiate-checkout/route"
import { getActiveFlashSaleMap } from "@/lib/flashSale"
import { mapProductToShiprocket } from "@/lib/shiprocket-mapper"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const EVENT_ID = "0b6f4f8e-2f1a-4c55-9d0e-3c1b6a7d9e21"
let productId: string

beforeAll(async () => {
  await connectTestDb()
  const product = await Product.create({
    name: "Neem Face Wash",
    slug: "neem-face-wash-ic",
    price: 300,
    salePercentage: 10,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-NFW-IC",
    numericId: 77,
    sizes: [
      { size: "100", unit: "ml", price: 300, stock: 10, sku: "NFW-100" },
      { size: "200", unit: "ml", price: 500, stock: 10, sku: "NFW-200" },
    ],
  })
  productId = String(product._id)
})

afterAll(async () => {
  await disconnectTestDb()
})

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubEnv("SHIPROCKET_CHECKOUT_API_KEY", "k")
  vi.stubEnv("SHIPROCKET_CHECKOUT_API_SECRET", "s")
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1546800325689461")
  vi.stubEnv("META_CAPI_ACCESS_TOKEN", "test-token")
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
  fetchMock = vi.fn(async (url: string) =>
    url.startsWith("https://checkout-api.shiprocket.com/")
      ? new Response(JSON.stringify({ ok: true, result: { token: "sr-token", data: { order_id: "sr-order-1" } } }))
      : new Response('{"events_received":1}')
  )
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  afterCallbacks.length = 0
})

function initiate(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/shiprocket/initiate-checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        "x-forwarded-for": "203.0.113.7",
        referer: "https://nezalherbocare.com/cart",
        cookie: "_fbp=fb.1.1700000000000.123",
      },
    })
  )
}

const cartItems = () => [
  { productId, quantity: 2, selectedSize: { size: "100", sku: "NFW-100" } },
  { productId, quantity: 1, selectedSize: { size: "200", sku: "NFW-200" } },
]

const metaCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).startsWith("https://graph.facebook.com/"))

describe("POST /api/shiprocket/initiate-checkout and Meta InitiateCheckout", () => {
  it("returns the event's value and contents and sends the server copy with the browser's event id", async () => {
    const res = await initiate({ cartItems: cartItems(), redirectPath: "/checkout/success", metaEventId: EVENT_ID })
    expect(res.status).toBe(200)

    // Priced like the order will be: the product's 10% sale on each size
    const contents = [
      { id: productId, quantity: 2, item_price: 270 },
      { id: productId, quantity: 1, item_price: 450 },
    ]
    expect(await res.json()).toEqual({ token: "sr-token", orderId: "sr-order-1", tracking: { value: 990, contents } })

    expect(metaCalls()).toHaveLength(0) // only once the response is sent
    await Promise.all(afterCallbacks.map((callback) => callback()))
    expect(metaCalls()).toHaveLength(1)

    const event = JSON.parse(metaCalls()[0][1].body).data[0]
    expect(event).toMatchObject({
      event_name: "InitiateCheckout",
      event_id: EVENT_ID,
      action_source: "website",
      event_source_url: "https://nezalherbocare.com/cart",
      user_data: {
        client_user_agent: "Mozilla/5.0",
        client_ip_address: "203.0.113.7",
        fbp: "fb.1.1700000000000.123",
      },
      custom_data: { currency: "INR", value: 990, contents, content_ids: [productId], num_items: 3 },
    })
  })

  it("sends no server event without a valid event id, since the browser couldn't match it", async () => {
    for (const metaEventId of [undefined, "{$ne:1}"]) {
      const res = await initiate({ cartItems: cartItems(), metaEventId })
      expect(res.status).toBe(200)
    }
    expect(afterCallbacks).toHaveLength(0)
  })

  it("sends nothing when Shiprocket doesn't start the checkout", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ok: false }), { status: 500 }))
    const res = await initiate({ cartItems: cartItems(), metaEventId: EVENT_ID })
    expect(res.status).toBe(502)
    expect(afterCallbacks).toHaveLength(0)
  })
})

// Shiprocket charges the price its catalog copy has for each variant id we
// send (lib/shiprocket-mapper.ts), so the InitiateCheckout value must equal
// the catalog feed's price for exactly those variants.
describe("InitiateCheckout value matches the price Shiprocket charges", () => {
  let packProductId: string

  beforeAll(async () => {
    // Shaped like the 3+1 soaps: an 8% collection sale, and a 3+1 pack with
    // its own sale price (₹180, not 8% off ₹240)
    const product = await Product.create({
      name: "Passion Bathing Bar",
      slug: "passion-bathing-bar-ic",
      price: 60,
      discountPrice: 55,
      salePercentage: 8,
      saleSource: "collection",
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-PBB-IC",
      numericId: 78,
      sizes: [
        { size: "100g", unit: "g", price: 60, stock: 10, sku: "PBB-100" },
        { size: "3+1 (100g x 4)", unit: "g", price: 240, discountPrice: 180, stock: 10, sku: "PBB-31" },
      ],
    })
    packProductId = String(product._id)
  })

  afterEach(async () => {
    await FlashSale.deleteMany({})
  })

  // Each variant id sent to Shiprocket, with the price the catalog feed gives it right now
  async function feedPricesSent() {
    const call = fetchMock.mock.calls.find(([url]) => String(url).startsWith("https://checkout-api.shiprocket.com/"))
    const items: { variant_id: string; quantity: number }[] = JSON.parse(call![1].body).cart_data.items
    const product = await Product.findById(packProductId).lean()
    const variants = mapProductToShiprocket(product, await getActiveFlashSaleMap()).variants
    return items.map(({ variant_id, quantity }) => ({
      quantity,
      price: Number(variants.find((v: any) => String(v.id) === variant_id)!.price),
    }))
  }

  async function checkout() {
    const res = await initiate({
      cartItems: [
        { productId: packProductId, quantity: 1, selectedSize: { size: "3+1 (100g x 4)", sku: "PBB-31" } },
        { productId: packProductId, quantity: 2, selectedSize: { size: "100g", sku: "PBB-100" } },
      ],
      metaEventId: EVENT_ID,
    })
    expect(res.status).toBe(200)
    return (await res.json()).tracking as { value: number; contents: { item_price: number; quantity: number }[] }
  }

  it("uses the 3+1 pack's own sale price on both sides", async () => {
    const tracking = await checkout()
    const charged = await feedPricesSent()

    expect(charged).toEqual([
      { quantity: 1, price: 180 },
      { quantity: 2, price: 55 },
    ])
    expect(tracking.contents.map(({ item_price, quantity }) => ({ quantity, price: item_price }))).toEqual(charged)
    expect(tracking.value).toBe(180 + 2 * 55)
  })

  it("uses the flash-sale price on both sides while one runs", async () => {
    await FlashSale.create({
      name: "Test Flash Sale",
      discountPercent: 20,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 60 * 60_000),
      products: [packProductId],
    })

    const tracking = await checkout()
    const charged = await feedPricesSent()

    expect(charged).toEqual([
      { quantity: 1, price: 192 },
      { quantity: 2, price: 48 },
    ])
    expect(tracking.contents.map(({ item_price, quantity }) => ({ quantity, price: item_price }))).toEqual(charged)
    expect(tracking.value).toBe(192 + 2 * 48)
  })
})
