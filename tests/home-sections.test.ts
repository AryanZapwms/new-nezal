// Integration tests for lib/home-sections.ts — the reads behind the home page
// sections (app/page.tsx renders them on the server) and the public API routes
// that share them. Pins two things: each API route still returns what it did,
// and the home page's server data matches the API exactly, so a section looks
// the same whether it got its data from the server or its client fallback.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Company } from "@/lib/models/company"
import { Product } from "@/lib/models/product"
import { HeroProduct } from "@/lib/models/heroProduct"
import { Review } from "@/lib/models/review"
import { FlashSale } from "@/lib/models/flashsale"
import { Concern } from "@/lib/models/concern"
import { Ritual } from "@/lib/models/ritual"
import { getActiveFlashSaleMap } from "@/lib/flashSale"
import { getHeroProducts, getConcerns, getRituals, getShopByConcern } from "@/lib/home-sections"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const json = (value: unknown) => JSON.parse(JSON.stringify(value))

let company: any
let serum: any
let soap: any

beforeAll(async () => {
  await connectTestDb()

  company = await Company.create({ name: "Nezal", slug: "nezal" })
  serum = await Product.create({
    name: "Hair Serum", slug: "hair-serum", price: 400, company: company._id, sku: "SKU-HS", stock: 5,
    sizes: [{ size: "100", unit: "ml", quantity: 100, price: 400, stock: 5 }],
    keyIngredients: [{ name: "Rosemary", benefit: "Strength" }],
  })
  soap = await Product.create({
    name: "Rock Soap", slug: "rock-soap", price: 200, company: company._id, sku: "SKU-RS", stock: 9,
  })
  const deleted = await Product.create({
    name: "Gone", slug: "gone", price: 100, company: company._id, sku: "SKU-G", stock: 1,
  })

  await HeroProduct.create([
    { productId: soap._id, sortOrder: 2 },
    { productId: serum._id, sortOrder: 1, isBestSeller: true },
    { productId: deleted._id, sortOrder: 3 },
    { productId: new mongoose.Types.ObjectId(), sortOrder: 4, isActive: false },
  ])
  await Product.deleteOne({ _id: deleted._id }) // hero entry whose product was deleted

  await Review.create([
    { product: serum._id, company: company._id, user: new mongoose.Types.ObjectId(), rating: 5, comment: "Great", userName: "A", userEmail: "a@x.com", status: "approved" },
    { product: serum._id, company: company._id, user: new mongoose.Types.ObjectId(), rating: 4, comment: "Good", userName: "B", userEmail: "b@x.com", status: "approved" },
    { product: serum._id, company: company._id, user: new mongoose.Types.ObjectId(), rating: 1, comment: "Hidden", userName: "C", userEmail: "c@x.com", status: "pending" },
  ])

  const now = Date.now()
  await FlashSale.create({
    name: "Flash", discountPercent: 25, products: [serum._id],
    startsAt: new Date(now - 60_000), endsAt: new Date(now + 3_600_000),
  })

  await Concern.create([
    { label: "Acne", slug: "acne", sortOrder: 1 },
    { label: "Dryness", slug: "dryness", sortOrder: 2 },
    { label: "Hidden", slug: "hidden", isActive: false },
  ])
  await Ritual.create([
    { name: "Clear Skin", slug: "clear-skin", sortOrder: 1 },
    { name: "Hidden", slug: "hidden-ritual", isActive: false },
  ])

  company.shopByConcern = [
    { title: "Hair", image: "/hair.jpg", product: serum._id, priority: 2 },
    { title: "Body", image: "/body.jpg", product: soap._id, priority: 1 },
    { title: "Off", image: "/off.jpg", product: soap._id, priority: 0, isActive: false },
  ]
  await company.save()
})

afterAll(async () => {
  await disconnectTestDb()
})

describe("hero products", () => {
  it("API returns active entries in order, with flash price, rating and size label", async () => {
    const { GET } = await import("@/app/api/hero-products/route")
    const res = await GET(new NextRequest("http://localhost/api/hero-products"))
    const { heroProducts } = await res.json()

    expect(heroProducts.map((h: any) => h.productId.name)).toEqual(["Hair Serum", "Rock Soap"])
    const [first, second] = heroProducts
    expect(first.productId.discountPrice).toBe(300) // 25% flash sale off 400
    expect(first.productId.flashSale.discountPercent).toBe(25)
    expect(first.productId.rating).toBe(4.5) // pending review excluded
    expect(first.productId.reviewCount).toBe(2)
    expect(first.productId.sizeLabel).toBe("100ml")
    expect(first.productId.keyIngredients).toEqual(["Rosemary"])
    expect(first.productId.isBestSeller).toBe(true)
    expect(first.productId.company.slug).toBe("nezal")
    expect(second.productId.flashSale).toBeUndefined()
  })

  it("?all=true includes inactive entries (deleted products still dropped)", async () => {
    const { GET } = await import("@/app/api/hero-products/route")
    const res = await GET(new NextRequest("http://localhost/api/hero-products?all=true"))
    const { heroProducts } = await res.json()
    expect(heroProducts).toHaveLength(2) // inactive one points at a missing product too
  })

  it("home page read (shared flash-sale lookup) matches the API exactly", async () => {
    const { GET } = await import("@/app/api/hero-products/route")
    const api = await (await GET(new NextRequest("http://localhost/api/hero-products"))).json()
    const home = await getHeroProducts({ flashSaleMap: getActiveFlashSaleMap() })
    expect(json(home)).toEqual(api.heroProducts)
  })
})

describe("concerns and rituals", () => {
  it("APIs return active items sorted by sortOrder, matching the shared reads", async () => {
    const concernsRoute = await import("@/app/api/concerns/route")
    const ritualsRoute = await import("@/app/api/rituals/route")
    const concerns = (await (await concernsRoute.GET(new NextRequest("http://localhost/api/concerns"))).json()).concerns
    const rituals = (await (await ritualsRoute.GET(new NextRequest("http://localhost/api/rituals"))).json()).rituals

    expect(concerns.map((c: any) => c.slug)).toEqual(["acne", "dryness"])
    expect(rituals.map((r: any) => r.slug)).toEqual(["clear-skin"])
    expect(json(await getConcerns())).toEqual(concerns)
    expect(json(await getRituals())).toEqual(rituals)
  })
})

describe("shop by concern (home 'shop by category' section)", () => {
  it("API returns active items by priority with their products", async () => {
    const { GET } = await import("@/app/api/companies/[id]/shop-by-concern/route")
    const res = await GET(new Request(`http://localhost/api/companies/${company._id}/shop-by-concern`), {
      params: Promise.resolve({ id: company._id.toString() }),
    })
    const body = await res.json()

    expect(body.settings).toMatchObject({ isVisible: true, limit: 6 })
    expect(body.items.map((i: any) => i.title)).toEqual(["Body", "Hair"])
    expect(body.items[1].product).toMatchObject({ name: "Hair Serum", slug: "hair-serum" })
  })

  it("home page read from the plain (JSON) company matches the API exactly", async () => {
    const { GET } = await import("@/app/api/companies/[id]/shop-by-concern/route")
    const api = await (
      await GET(new Request(`http://localhost/api/companies/${company._id}/shop-by-concern`), {
        params: Promise.resolve({ id: company._id.toString() }),
      })
    ).json()

    // app/page.tsx loads companies with .lean() and JSON round-trips them
    const plainCompany = json(await Company.findById(company._id).lean())
    expect(json(await getShopByConcern(plainCompany))).toEqual(api)
  })

  it("returns no items when the section is hidden", async () => {
    const hidden = { ...json(company.toObject()), shopByConcernSettings: { isVisible: false, limit: 6 } }
    expect(json(await getShopByConcern(hidden))).toEqual({ items: [], settings: { isVisible: false, limit: 6 } })
  })
})
