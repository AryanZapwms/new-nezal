// Tests for lib/meta-capi.ts: Meta's normalisation of customer data, the
// request context helper, and the payloads the Conversions API receives.
import crypto from "crypto"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  buildCapiUserData,
  getRequestMetaFrom,
  normalizeCountry,
  normalizePhone,
  normalizePlace,
  sendCapiInitiateCheckoutEvent,
  sendCapiPurchaseEvent,
} from "@/lib/meta-capi"

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex")

describe("normalisation", () => {
  it.each([
    ["9876543210", "919876543210"],
    ["+91 98765 43210", "919876543210"],
    ["91-98765-43210", "919876543210"],
    ["09876543210", "919876543210"],
    ["12345", undefined],
  ])("phone %j becomes %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each([
    ["India", "in"],
    ["IN", "in"],
    [" in ", "in"],
    ["Narnia", undefined],
  ])("country %j becomes %j", (input, expected) => {
    expect(normalizeCountry(input)).toBe(expected)
  })

  it.each([
    ["Navi Mumbai", "navimumbai"],
    ["Tamil Nadu", "tamilnadu"],
    ["Jammu & Kashmir", "jammukashmir"],
    ["   ", undefined],
  ])("city or state %j becomes %j", (input, expected) => {
    expect(normalizePlace(input)).toBe(expected)
  })
})

describe("buildCapiUserData", () => {
  it("hashes the normalised customer fields and passes browser identifiers through", () => {
    expect(
      buildCapiUserData({
        email: " Asha@Example.com ",
        phone: "98765 43210",
        fullName: "Asha  Rao Kumar",
        city: "Navi Mumbai",
        state: "Maharashtra",
        zip: "400 703",
        country: "India",
        clientIp: "203.0.113.7",
        userAgent: "Mozilla/5.0",
        fbp: "fb.1.1700000000000.123",
        fbc: "fb.1.1700000000000.abc",
      })
    ).toEqual({
      em: [sha256("asha@example.com")],
      ph: [sha256("919876543210")],
      fn: [sha256("asha")],
      ln: [sha256("rao kumar")],
      ct: [sha256("navimumbai")],
      st: [sha256("maharashtra")],
      zp: [sha256("400703")],
      country: [sha256("in")],
      client_ip_address: "203.0.113.7",
      client_user_agent: "Mozilla/5.0",
      fbp: "fb.1.1700000000000.123",
      fbc: "fb.1.1700000000000.abc",
    })
  })

  it("leaves out fields that are missing or can't be normalised", () => {
    expect(buildCapiUserData({ phone: "123", country: "Narnia", fullName: "Asha", city: "" })).toEqual({
      fn: [sha256("asha")],
    })
  })
})

describe("getRequestMetaFrom", () => {
  it("reads the first forwarded IP, the user agent, the referer and Meta's cookies", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Mozilla/5.0",
      referer: "https://nezalherbocare.com/cart",
    })
    const cookies = new Map([
      ["_fbp", { value: "fb.1.1.123" }],
      ["_fbc", { value: "fb.1.1.abc" }],
    ])
    expect(getRequestMetaFrom(headers, cookies)).toEqual({
      clientIp: "203.0.113.7",
      userAgent: "Mozilla/5.0",
      fbp: "fb.1.1.123",
      fbc: "fb.1.1.abc",
      eventSourceUrl: "https://nezalherbocare.com/cart",
    })
  })

  it("falls back to x-real-ip and leaves missing values undefined", () => {
    const meta = getRequestMetaFrom(new Headers({ "x-real-ip": "198.51.100.2" }), new Map())
    expect(meta).toEqual({
      clientIp: "198.51.100.2",
      userAgent: undefined,
      fbp: undefined,
      fbc: undefined,
      eventSourceUrl: undefined,
    })
  })
})

describe("events sent to Meta", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1546800325689461")
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "test-token")
    fetchMock = vi.fn().mockResolvedValue(new Response('{"events_received":1}', { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function sentEvent() {
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    return { url, accessToken: body.access_token, event: body.data[0] }
  }

  const contents = [
    { id: "6a0d9d9edf37fac29c20d5d9", quantity: 2, item_price: 133 },
    { id: "6a0d9d9edf37fac29c20d5d9", quantity: 1, item_price: 252 },
    { id: "6a34ea4d2d10235bec79b41c", quantity: 1, item_price: 64.004 },
  ]

  it("sends a Purchase with contents, the dedup event_id and normalised customer data", async () => {
    await sendCapiPurchaseEvent({
      eventId: "6a5f00000000000000000001",
      value: 646.004,
      contents,
      eventSourceUrl: "https://nezalherbocare.com/checkout/success",
      user: { phone: "9876543210", country: "India", userAgent: "Mozilla/5.0" },
    })

    const { url, accessToken, event } = sentEvent()
    expect(url).toBe("https://graph.facebook.com/v21.0/1546800325689461/events")
    expect(accessToken).toBe("test-token")
    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: "6a5f00000000000000000001",
      action_source: "website",
      event_source_url: "https://nezalherbocare.com/checkout/success",
      user_data: { ph: [sha256("919876543210")], country: [sha256("in")], client_user_agent: "Mozilla/5.0" },
    })
    expect(event.custom_data).toEqual({
      currency: "INR",
      value: 646,
      content_type: "product",
      content_ids: ["6a0d9d9edf37fac29c20d5d9", "6a34ea4d2d10235bec79b41c"],
      contents: [
        { id: "6a0d9d9edf37fac29c20d5d9", quantity: 2, item_price: 133 },
        { id: "6a0d9d9edf37fac29c20d5d9", quantity: 1, item_price: 252 },
        { id: "6a34ea4d2d10235bec79b41c", quantity: 1, item_price: 64 },
      ],
      num_items: 4,
    })
  })

  it("sends an InitiateCheckout the same way", async () => {
    await sendCapiInitiateCheckoutEvent({
      eventId: "0b6f4f8e-2f1a-4c55-9d0e-3c1b6a7d9e21",
      value: 386,
      contents: contents.slice(0, 2),
      eventSourceUrl: "https://nezalherbocare.com/cart",
      user: { userAgent: "Mozilla/5.0", fbp: "fb.1.1.123" },
    })

    const { event } = sentEvent()
    expect(event).toMatchObject({
      event_name: "InitiateCheckout",
      event_id: "0b6f4f8e-2f1a-4c55-9d0e-3c1b6a7d9e21",
      action_source: "website",
      user_data: { client_user_agent: "Mozilla/5.0", fbp: "fb.1.1.123" },
      custom_data: { currency: "INR", value: 386, content_ids: ["6a0d9d9edf37fac29c20d5d9"], num_items: 3 },
    })
  })

  it("adds Meta's test event code only when META_CAPI_TEST_EVENT_CODE is set", async () => {
    await sendCapiPurchaseEvent({ eventId: "o1", value: 100, contents, user: {} })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("test_event_code")

    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "TEST12345")
    await sendCapiPurchaseEvent({ eventId: "o2", value: 100, contents, user: {} })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).test_event_code).toBe("TEST12345")
  })

  it("sends nothing when the access token isn't configured", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "")
    await sendCapiPurchaseEvent({ eventId: "o1", value: 100, contents, user: {} })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("never throws when Meta rejects the event or the request fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":{"message":"bad"}}', { status: 400 }))
    await expect(sendCapiPurchaseEvent({ eventId: "o1", value: 100, contents, user: {} })).resolves.toBeUndefined()

    fetchMock.mockRejectedValueOnce(new Error("network down"))
    await expect(sendCapiPurchaseEvent({ eventId: "o2", value: 100, contents, user: {} })).resolves.toBeUndefined()
  })
})
