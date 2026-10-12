// Unit tests for lib/whatsapp.ts — the request ScaleChat actually receives,
// and how its failures are classified (which decides whether the reminder
// cron may retry). fetch is stubbed; nothing leaves the machine.
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest"

let whatsapp: typeof import("@/lib/whatsapp")
const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

beforeAll(async () => {
  // Read once at module load, so it must be set before the import.
  process.env.SCALECHAT_API_KEY = "test-api-key"
  vi.stubGlobal("fetch", fetchMock)
  whatsapp = await import("@/lib/whatsapp")
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  fetchMock.mockReset()
})

const send = () =>
  whatsapp.sendWhatsAppTemplate({
    phone: "9876543210",
    templateName: "ecommerce_abandoned_cart",
    language: "en",
    variables: ["Raj", "Vitamin C Serum + 2 more", "10%"],
  })

describe("sendWhatsAppTemplate", () => {
  it("posts exactly the documented request", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { id: "msg_1" } }))

    await expect(send()).resolves.toEqual({ id: "msg_1" })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://scalechat.in/api/v1/messages/template")
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({ "X-API-Key": "test-api-key", "Content-Type": "application/json" })
    expect(JSON.parse(init.body)).toEqual({
      phone: "919876543210",
      template_name: "ecommerce_abandoned_cart",
      language: "en",
      variables: ["Raj", "Vitamin C Serum + 2 more", "10%"],
    })
  })

  it("leaves an already country-coded number alone", () => {
    expect(whatsapp.toWhatsAppPhone("919000000099")).toBe("919000000099")
    expect(whatsapp.toWhatsAppPhone("+91 90000 00099")).toBe("919000000099")
  })

  it("accepts a 2xx whose body isn't the {success, data} shape", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message_id: "wamid.1" }))
    await expect(send()).resolves.toEqual({ message_id: "wamid.1" })
  })
})

describe("failures", () => {
  const failure = () => send().then(() => null, (err) => err)

  it("marks a 4xx as rejected — nothing was sent", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { success: false, message: "Template not found" }))

    const err = await failure()
    expect(err).toBeInstanceOf(whatsapp.ScaleChatError)
    expect(err.rejected).toBe(true)
    expect(err.message).toContain("Template not found")
  })

  it("marks a 200 with success: false as rejected", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: false, message: "Invalid phone" }))
    expect((await failure()).rejected).toBe(true)
  })

  it("does not mark a 5xx as rejected, even when it isn't JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 }))

    const err = await failure()
    expect(err).toBeInstanceOf(whatsapp.ScaleChatError)
    expect(err.rejected).toBe(false)
    expect(err.message).toContain("HTTP 502")
  })

  it("does not mark a network error or timeout as rejected", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    const err = await failure()
    expect(err).toBeInstanceOf(whatsapp.ScaleChatError)
    expect(err.rejected).toBe(false)
  })
})
