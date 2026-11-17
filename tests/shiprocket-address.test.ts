// Shiprocket rejects a billing/shipping address longer than 190 characters
// (422 "may not be greater than 190 characters"). Shiprocket Checkout stores
// line1 + line2 as one string, so long addresses happen; they're now split
// across address / address_2 at a word boundary instead of failing. These
// tests need no database and never reach Shiprocket (fetch is stubbed).

import { describe, it, expect, afterEach, vi } from "vitest"
import { splitShiprocketAddress, createShiprocketOrder, SHIPROCKET_ADDRESS_MAX } from "@/lib/shiprocket"

// "word0 word1 … word{n-1}": 40 words ≈ 270 characters, 80 ≈ 550
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ")

describe("splitShiprocketAddress", () => {
  it("keeps an address within the limit on one line, whitespace collapsed", () => {
    expect(splitShiprocketAddress("  12  Main\nRoad, Andheri ")).toEqual({ address: "12 Main Road, Andheri", address2: "" })
  })

  it("drops a run of 100+ trailing commas", () => {
    // 171 characters in all: under the limit, so this is the clean-up, not the split
    expect(splitShiprocketAddress(`12 Main Road, Andheri${",".repeat(150)}`)).toEqual({
      address: "12 Main Road, Andheri",
      address2: "",
    })
  })

  it("collapses a run of commas in the middle to a single comma", () => {
    expect(splitShiprocketAddress("Flat 4, , , , Main Road, Andheri")).toEqual({
      address: "Flat 4, Main Road, Andheri",
      address2: "",
    })
  })

  it("drops leading and trailing hyphens, commas and spaces, but not hyphens inside", () => {
    expect(splitShiprocketAddress(" -, B-12 Main Road, Andheri - ")).toEqual({
      address: "B-12 Main Road, Andheri",
      address2: "",
    })
  })

  it("splits a long address at a word boundary without losing any of it", () => {
    const full = words(40)
    const { address, address2 } = splitShiprocketAddress(full)

    expect(address.length).toBeLessThanOrEqual(SHIPROCKET_ADDRESS_MAX)
    expect(address2.length).toBeGreaterThan(0)
    expect(address2.length).toBeLessThanOrEqual(SHIPROCKET_ADDRESS_MAX)
    expect(`${address} ${address2}`).toBe(full)
  })

  it("drops only the separator at the cut", () => {
    // The last space before character 190 is the one after the comma
    const full = `${"x".repeat(186)}, Near Station Road, Andheri East`
    expect(splitShiprocketAddress(full)).toEqual({
      address: "x".repeat(186),
      address2: "Near Station Road, Andheri East",
    })
  })

  it("hard-cuts a long run with no spaces", () => {
    expect(splitShiprocketAddress("a".repeat(250))).toEqual({ address: "a".repeat(190), address2: "a".repeat(60) })
  })

  it("throws instead of truncating when it won't fit in two lines", () => {
    expect(() => splitShiprocketAddress(words(80))).toThrow(/too long for Shiprocket/)
  })
})

describe("createShiprocketOrder address fields", () => {
  const order = (address: string) => {
    const party = {
      name: "Asha K",
      phone: "9876543210",
      email: "buyer@example.com",
      address,
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
      country: "India",
    }
    return {
      orderId: "test-order",
      orderDate: "2026-11-17",
      items: [{ name: "Gel", sku: "SKU-1", units: 1, selling_price: 200, weight: 0.3 }],
      shipping: party,
      billing: party,
      paymentMethod: "Prepaid" as const,
      subTotal: 200,
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends a long address as address + address_2, for billing and shipping", async () => {
    const bodies: any[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith("/auth/login")) {
          return new Response(JSON.stringify({ token: "test-token" }), { status: 200 })
        }
        if (String(url).endsWith("/orders/create/adhoc")) {
          bodies.push(JSON.parse(String(init?.body)))
          return new Response(JSON.stringify({ order_id: 1, shipment_id: 2, status: "NEW" }), { status: 200 })
        }
        return new Response("{}", { status: 404 })
      })
    )

    const address = words(40)
    await createShiprocketOrder(order(address))

    expect(bodies).toHaveLength(1)
    for (const prefix of ["billing", "shipping"]) {
      const line1: string = bodies[0][`${prefix}_address`]
      const line2: string = bodies[0][`${prefix}_address_2`]
      expect(line1.length).toBeLessThanOrEqual(SHIPROCKET_ADDRESS_MAX)
      expect(line2.length).toBeGreaterThan(0)
      expect(`${line1} ${line2}`).toBe(address)
    }
  })

  it("fails before contacting Shiprocket when the address can't fit", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(createShiprocketOrder(order(words(80)))).rejects.toThrow(/too long for Shiprocket/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("puts the HTTP status in the error Shiprocket's rejection is recorded with", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).endsWith("/auth/login")
          ? new Response(JSON.stringify({ token: "test-token" }), { status: 200 })
          : new Response(JSON.stringify({ message: "Oops! Invalid Data." }), { status: 422 })
      )
    )

    await expect(createShiprocketOrder(order("12 Main Road"))).rejects.toThrow(/HTTP 422/)
  })
})
