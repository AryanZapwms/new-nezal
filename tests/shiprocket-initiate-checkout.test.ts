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
import { POST } from "@/app/api/shiprocket/initiate-checkout/route"
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
