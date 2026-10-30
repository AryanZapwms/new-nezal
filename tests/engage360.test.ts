// Tests for lib/engage360.ts, the only place the app calls Engage 360's
// window.wigzo: the helpers must do nothing on the server or without the
// loader, never throw, and send productview / addtocart / categoryview /
// identify payloads in the agreed shape. Also checks that the cart store's
// addItem sends one addtocart, and updateQuantity none.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  engageCategory,
  engageIdentify,
  engageProduct,
  engageTrack,
  firstNameOf,
  isEngageEnabled,
  setEngageSignedInName,
  type EngageProduct,
} from "@/lib/engage360"
import { useCartStore } from "@/lib/store/cart-store"

const SITE = "https://nezalherbocare.com"

let wigzo: ReturnType<typeof vi.fn>

beforeEach(() => {
  wigzo = vi.fn()
  ;(globalThis as any).window = { wigzo }
})

afterEach(() => {
  delete (globalThis as any).window
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

const PRODUCT: EngageProduct = {
  productId: "p1",
  title: "Neem Face Wash",
  price: 299,
  language: "en",
}

describe("engageTrack", () => {
  it("sends the event and payload to wigzo('track', …)", () => {
    engageTrack("productview", PRODUCT)
    expect(wigzo).toHaveBeenCalledTimes(1)
    expect(wigzo).toHaveBeenCalledWith("track", "productview", PRODUCT)
  })

  it("does nothing on the server", () => {
    delete (globalThis as any).window
    expect(() => engageTrack("productview", PRODUCT)).not.toThrow()
  })

  it("does nothing when the loader isn't on the page (no key)", () => {
    ;(globalThis as any).window = {}
    expect(() => engageTrack("productview", PRODUCT)).not.toThrow()
  })

  it("never throws when wigzo itself throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    wigzo.mockImplementation(() => {
      throw new Error("tracker broke")
    })
    expect(() => engageTrack("productview", PRODUCT)).not.toThrow()
    expect(console.error).toHaveBeenCalled()
  })
})

describe("engageIdentify", () => {
  it("sends email, phone and fullName, trimmed", () => {
    engageIdentify({ email: " asha@example.com ", phone: "9876543210", fullName: " Asha Rao " })
    expect(wigzo).toHaveBeenCalledWith("identify", {
      email: "asha@example.com",
      phone: "9876543210",
      fullName: "Asha Rao",
    })
  })

  it("leaves out fields it doesn't have", () => {
    engageIdentify({ email: "asha@example.com", phone: null, fullName: "" })
    expect(wigzo).toHaveBeenCalledWith("identify", { email: "asha@example.com" })
  })

  it("never sends Shiprocket's <phone>@fastrr.com placeholder as an email", () => {
    engageIdentify({ email: "9876543210@fastrr.com", phone: "9876543210", fullName: "Asha" })
    expect(wigzo).toHaveBeenCalledWith("identify", { phone: "9876543210", fullName: "Asha" })
  })

  it("sends nothing without an email or a phone", () => {
    engageIdentify({ email: "9876543210@FASTRR.COM", fullName: "Asha" })
    engageIdentify({ fullName: "Asha" })
    expect(wigzo).not.toHaveBeenCalled()
  })
})

describe("engageProduct", () => {
  it("builds the full payload, with URLs on the canonical domain", () => {
    expect(
      engageProduct({
        productId: "p1",
        name: "Neem Face Wash, ",
        price: 249,
        fullPrice: 299,
        image: "/uploads/neem.jpg",
        companySlug: "nh",
        description: "Fresh skin\nA gentle daily wash",
        category: "Face Care",
        tags: ["acne", "oily", "acne", " ", null],
      })
    ).toEqual({
      productId: "p1",
      title: "Neem Face Wash",
      price: 249,
      previousPrice: 299,
      image: `${SITE}/uploads/neem.jpg`,
      productUrl: `${SITE}/shop/nh/product/p1`,
      canonicalURL: `${SITE}/shop/nh/product/p1`,
      description: "Fresh skin. A gentle daily wash",
      category: "Face Care",
      tags: ["acne", "oily"],
      language: "en",
    })
  })

  it("sends previousPrice only when the product is on sale", () => {
    expect(engageProduct({ productId: "p1", name: "A", price: 299, fullPrice: 299 })).not.toHaveProperty("previousPrice")
    expect(engageProduct({ productId: "p1", name: "A", price: 299 })).not.toHaveProperty("previousPrice")
  })

  it("keeps absolute image URLs and leaves out what it doesn't have", () => {
    const payload = engageProduct({
      productId: "p1",
      name: "A",
      price: 299,
      image: "https://nezal-cdn.b-cdn.net/uploads/a.jpg",
      tags: [],
    })
    expect(payload).toEqual({
      productId: "p1",
      title: "A",
      price: 299,
      image: "https://nezal-cdn.b-cdn.net/uploads/a.jpg",
      language: "en",
    })
  })
})

describe("firstname", () => {
  it("is the first word of the name", () => {
    expect(firstNameOf("  Asha   Rao ")).toBe("Asha")
    expect(firstNameOf("Asha")).toBe("Asha")
    expect(firstNameOf("   ")).toBeNull()
    expect(firstNameOf(null)).toBeNull()
    expect(firstNameOf(undefined)).toBeNull()
  })

  it("is sent only when given (signed-in customers), never empty", () => {
    expect(engageProduct({ productId: "p1", name: "A", price: 299, firstname: "Asha" })).toMatchObject({
      firstname: "Asha",
    })
    expect(engageProduct({ productId: "p1", name: "A", price: 299, firstname: null })).not.toHaveProperty("firstname")
    expect(engageProduct({ productId: "p1", name: "A", price: 299 })).not.toHaveProperty("firstname")
  })
})

describe("engageCategory", () => {
  it("builds both URLs from the page path, with an absolute image", () => {
    expect(engageCategory({ title: "Neem", path: "/collections/neem", image: "/uploads/neem-hero.jpg" })).toEqual({
      title: "Neem",
      canonicalURL: `${SITE}/collections/neem`,
      categoryUrl: `${SITE}/collections/neem`,
      image: `${SITE}/uploads/neem-hero.jpg`,
    })
    expect(engageCategory({ title: "Soaps", path: "/shop/nh/soaps", image: null })).not.toHaveProperty("image")
  })
})

describe("isEngageEnabled", () => {
  it("follows NEXT_PUBLIC_WIGZO_KEY", () => {
    vi.stubEnv("NEXT_PUBLIC_WIGZO_KEY", "")
    expect(isEngageEnabled()).toBe(false)
    vi.stubEnv("NEXT_PUBLIC_WIGZO_KEY", "org-token")
    expect(isEngageEnabled()).toBe(true)
  })
})

describe("cart store", () => {
  beforeEach(() => {
    // No localStorage in this environment; zustand's persist warns and carries on
    vi.spyOn(console, "warn").mockImplementation(() => {})
    useCartStore.setState({ items: [] })
    setEngageSignedInName(null)
  })

  it("addItem sends one addtocart, with the details its caller passes (guest: no firstname)", () => {
    useCartStore.getState().addItem(
      {
        productId: "p1",
        name: "Neem Face Wash",
        price: 299,
        discountPrice: 249,
        image: "https://nezal-cdn.b-cdn.net/uploads/neem.jpg",
        quantity: 2,
        company: { name: "nh", slug: "nh" },
      },
      { description: "A gentle daily wash", category: "Face Care", tags: ["acne"] }
    )

    expect(wigzo).toHaveBeenCalledTimes(1)
    expect(wigzo).toHaveBeenCalledWith("track", "addtocart", {
      productId: "p1",
      title: "Neem Face Wash",
      price: 249,
      previousPrice: 299,
      image: "https://nezal-cdn.b-cdn.net/uploads/neem.jpg",
      productUrl: `${SITE}/shop/nh/product/p1`,
      canonicalURL: `${SITE}/shop/nh/product/p1`,
      description: "A gentle daily wash",
      category: "Face Care",
      tags: ["acne"],
      language: "en",
    })
  })

  it("addItem adds the signed-in customer's first name, and drops it after sign-out", () => {
    const item = { productId: "p1", name: "Neem Face Wash", price: 299, image: "", quantity: 1 }

    setEngageSignedInName("Asha Rao")
    useCartStore.getState().addItem(item)
    expect(wigzo.mock.calls[0][2]).toMatchObject({ firstname: "Asha" })

    setEngageSignedInName(null)
    useCartStore.getState().addItem(item)
    expect(wigzo.mock.calls[1][2]).not.toHaveProperty("firstname")
  })

  it("updateQuantity sends nothing", () => {
    useCartStore.setState({
      items: [{ productId: "p1", name: "Neem Face Wash", price: 299, image: "", quantity: 1 }],
    })
    useCartStore.getState().updateQuantity("p1", 3)
    expect(useCartStore.getState().items[0].quantity).toBe(3)
    expect(wigzo).not.toHaveBeenCalled()
  })
})
