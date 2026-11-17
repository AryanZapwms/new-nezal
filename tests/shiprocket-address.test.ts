// Shiprocket allows 190 characters for address + address_2 COMBINED (400
// "Address 1 and Address 2 combined cannot be greater 190 than characters").
// fitShiprocketAddress keeps the whole address in *_address within that:
// repeated PIN code/state/country out first, then a cut at a word boundary
// only if it must. No database; fetch is stubbed, so nothing reaches
// Shiprocket.

import { describe, it, expect, afterEach, vi } from "vitest"
import {
  SHIPROCKET_ADDRESS_MAX,
  fitShiprocketAddress,
  normalizeShiprocketAddress,
  shortenedAddressNote,
} from "@/lib/shiprocket-address"
import { createShiprocketOrder } from "@/lib/shiprocket"

// "word0 word1 … word{n-1}": 20 words = 129 characters, 40 = 269
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ")

const MUMBAI = { pincode: "400001", state: "Maharashtra", country: "India" }

describe("normalizeShiprocketAddress", () => {
  it("collapses whitespace", () => {
    expect(normalizeShiprocketAddress("  12  Main\nRoad, Andheri ")).toBe("12 Main Road, Andheri")
  })

  it("drops a run of 100+ trailing commas", () => {
    expect(normalizeShiprocketAddress(`12 Main Road, Andheri${",".repeat(150)}`)).toBe("12 Main Road, Andheri")
  })

  it("collapses a run of commas in the middle to a single comma", () => {
    expect(normalizeShiprocketAddress("Flat 4, , , , Main Road, Andheri")).toBe("Flat 4, Main Road, Andheri")
  })

  it("drops leading and trailing hyphens, commas and spaces, but not hyphens inside", () => {
    expect(normalizeShiprocketAddress(" -, B-12 Main Road, Andheri - ")).toBe("B-12 Main Road, Andheri")
  })
})

describe("fitShiprocketAddress", () => {
  it("leaves an address that fits alone, even if it repeats the PIN code/state/country", () => {
    const address = "B-12 Main Road, Andheri East, Mumbai, Maharashtra 400001, India"
    expect(fitShiprocketAddress(address, MUMBAI)).toEqual({
      address,
      originalLength: address.length,
      removedRepeats: false,
      shortened: false,
    })
  })

  it("removes the repeated PIN code, state and country when that makes it fit", () => {
    const street = `B-12 Sunshine Apartments, ${words(20)}, Andheri East, Mumbai`
    const full = `${street}, Maharashtra 400001, India`
    expect(full.length).toBeGreaterThan(SHIPROCKET_ADDRESS_MAX)

    expect(fitShiprocketAddress(full, MUMBAI)).toEqual({
      address: street,
      originalLength: full.length,
      removedRepeats: true,
      shortened: false,
    })
  })

  it("matches whole tokens/parts only, in any case: B-110001 and New Delhi stay", () => {
    const kept = `Flat 7 Block B-110001, ${words(20)}, Connaught Place, New Delhi`
    const full = `${kept}, DELHI, 110001, india`
    expect(full.length).toBeGreaterThan(SHIPROCKET_ADDRESS_MAX)

    const fitted = fitShiprocketAddress(full, { pincode: "110001", state: "Delhi", country: "India" })
    expect(fitted.address).toBe(kept)
    expect(fitted.shortened).toBe(false)
  })

  it("cuts at a word boundary when it's still over 190 (the combined limit)", () => {
    const full = `${words(40)}, Mumbai, Maharashtra 400001, India`
    const fitted = fitShiprocketAddress(full, MUMBAI)

    expect(fitted.shortened).toBe(true)
    expect(fitted.removedRepeats).toBe(true)
    expect(fitted.address.length).toBeLessThanOrEqual(SHIPROCKET_ADDRESS_MAX)
    expect(words(40).startsWith(`${fitted.address} `)).toBe(true)
  })

  it("hard-cuts a long run with no spaces", () => {
    expect(fitShiprocketAddress("a".repeat(250), MUMBAI)).toEqual({
      address: "a".repeat(190),
      originalLength: 250,
      removedRepeats: false,
      shortened: true,
    })
  })

  it("explains a shortened address in the review note", () => {
    const note = shortenedAddressNote({ address: "Flat 4, Main Road", originalLength: 312, removedRepeats: true, shortened: true })
    expect(note).toContain("312 characters")
    expect(note).toContain("Shiprocket allows 190")
    expect(note).toContain("Check the shipment label before pickup")
    expect(note).toContain('Sent: "Flat 4, Main Road"')
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

  it("sends the whole address in *_address with *_address_2 empty, so the combined length stays within 190", async () => {
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

    const address = "x".repeat(SHIPROCKET_ADDRESS_MAX)
    await createShiprocketOrder(order(address))

    expect(bodies).toHaveLength(1)
    for (const prefix of ["billing", "shipping"]) {
      expect(bodies[0][`${prefix}_address`]).toBe(address)
      expect(bodies[0][`${prefix}_address_2`]).toBe("")
      expect(bodies[0][`${prefix}_address`].length + bodies[0][`${prefix}_address_2`].length).toBeLessThanOrEqual(
        SHIPROCKET_ADDRESS_MAX
      )
    }
  })

  it("refuses an address over 190 without contacting Shiprocket", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(createShiprocketOrder(order("x".repeat(SHIPROCKET_ADDRESS_MAX + 1)))).rejects.toThrow(/allows 190/)
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
