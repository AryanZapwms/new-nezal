// Integration tests for lib/product-listing.ts — the listing query behind
// GET /api/products and the category lookup behind GET /api/categories, which
// the shop pages (/shop, /shop/[company], /shop/[company]/[category]) now also
// call on the server for their first page. Pins the API responses and that the
// server-rendered first page is exactly what the client would have fetched.
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { NextRequest } from "next/server"
import { Company } from "@/lib/models/company"
import { Category } from "@/lib/models/category"
import { Product } from "@/lib/models/product"
import { FlashSale } from "@/lib/models/flashsale"
import { listProducts, findCategories, toCategoryTree, findCompanyCategory, getActiveCompanies } from "@/lib/product-listing"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const json = (value: unknown) => JSON.parse(JSON.stringify(value))

let nezal: any
let other: any
let hairCare: any
let serums: any

beforeAll(async () => {
  await connectTestDb()

  nezal = await Company.create({ name: "Nezal", slug: "nezal", position: 1 })
  other = await Company.create({ name: "Other", slug: "other", position: 0 })
  await Company.create({ name: "Hidden Brand", slug: "hidden-brand", isActive: false })

  hairCare = await Category.create({ name: "Hair Care", slug: "hair-care", company: nezal._id })
  serums = await Category.create({ name: "Serums", slug: "serums", company: nezal._id, parent: hairCare._id })
  await Category.create({ name: "Soaps", slug: "soaps", company: nezal._id })

  const base = { company: nezal._id, stock: 5 }
  const products = await Product.create([
    { ...base, name: "Aloe Vera Gel", slug: "aloe", sku: "S1", price: 300, category: hairCare._id, sortOrder: 2 },
    { ...base, name: "Hair Serum", slug: "serum", sku: "S2", price: 500, category: serums._id, sortOrder: 1 },
    { ...base, name: "Rock Soap", slug: "soap", sku: "S3", price: 150, sortOrder: 3 },
    { ...base, name: "Inactive Oil", slug: "oil", sku: "S4", price: 200, isActive: false },
    { name: "Other Cream", slug: "cream", sku: "S5", price: 250, company: other._id, stock: 2 },
  ])
  // 14 more so pagination has a second page
  await Product.create(
    Array.from({ length: 14 }, (_, i) => ({ ...base, name: `Filler ${i}`, slug: `filler-${i}`, sku: `F${i}`, price: 100 + i, sortOrder: 10 + i }))
  )

  const now = Date.now()
  await FlashSale.create({
    name: "Flash", discountPercent: 20, products: [products[1]._id],
    startsAt: new Date(now - 60_000), endsAt: new Date(now + 3_600_000),
  })
})

afterAll(async () => {
  await disconnectTestDb()
})

async function apiProducts(query: string) {
  const { GET } = await import("@/app/api/products/route")
  return (await GET(new NextRequest(`http://localhost/api/products?${query}`))).json()
}

async function apiCategories(query: string) {
  const { GET } = await import("@/app/api/categories/route")
  return (await GET(new NextRequest(`http://localhost/api/categories?${query}`))).json()
}

describe("GET /api/products listing", () => {
  it("brand page 1: active products of the brand, manual sort, flash price, pagination", async () => {
    const body = await apiProducts("page=1&limit=12&company=nezal")
    expect(body.pagination).toEqual({ total: 17, page: 1, limit: 12, pages: 2 })
    expect(body.products.slice(0, 3).map((p: any) => p.name)).toEqual(["Hair Serum", "Aloe Vera Gel", "Rock Soap"])
    expect(body.products.find((p: any) => p.name === "Hair Serum").discountPrice).toBe(400)
    expect(body.products.some((p: any) => p.name === "Inactive Oil")).toBe(false)
  })

  it("page 2 holds the rest", async () => {
    const body = await apiProducts("page=2&limit=12&company=nezal")
    expect(body.products).toHaveLength(5)
  })

  it("a main category includes its subcategories", async () => {
    const body = await apiProducts("page=1&limit=12&company=nezal&category=hair-care")
    expect(body.products.map((p: any) => p.name).sort()).toEqual(["Aloe Vera Gel", "Hair Serum"])
  })

  it("typo-tolerant search with price sort", async () => {
    const body = await apiProducts("page=1&limit=12&search=aloe%20vra&sort=price_asc")
    expect(body.products[0].name).toBe("Aloe Vera Gel")
  })

  it("featured sort and exclude", async () => {
    const serum = await Product.findOne({ slug: "serum" })
    const body = await apiProducts(`page=1&limit=12&sort=featured&exclude=${serum!._id}`)
    expect(body.products.some((p: any) => p.name === "Hair Serum")).toBe(false)
    expect(body.pagination.total).toBe(17) // 18 active minus the excluded one
  })

  it("the shop pages' server-side first page equals the API response", async () => {
    const cases: [string, Parameters<typeof listProducts>[0]][] = [
      ["page=1&limit=12&company=nezal", { company: "nezal", page: 1, limit: 12 }],
      ["page=1&limit=12&company=nezal&category=serums", { company: "nezal", category: "serums", page: 1, limit: 12 }],
      ["page=1&limit=12&sort=featured", { page: 1, limit: 12, sort: "featured" }],
      ["page=1&limit=12&search=soap&sort=featured", { page: 1, limit: 12, search: "soap", sort: "featured" }],
    ]
    for (const [query, params] of cases) {
      expect(json(await listProducts(params))).toEqual(await apiProducts(query))
    }
  })
})

describe("GET /api/categories", () => {
  it("returns the company's tree (by slug or id), flat list, or everything", async () => {
    const tree = await apiCategories("company=nezal")
    expect(tree.map((c: any) => c.slug).sort()).toEqual(["hair-care", "soaps"])
    expect(tree.find((c: any) => c.slug === "hair-care").subCategories.map((s: any) => s.slug)).toEqual(["serums"])

    expect(await apiCategories(`company=${nezal._id}`)).toEqual(tree)
    expect((await apiCategories("company=nezal&flat=true")).length).toBe(3)

    expect(json(toCategoryTree(await findCategories({ company: "nezal" })))).toEqual(tree)
  })

  it("the category page's server lookup finds main and sub categories", async () => {
    expect((await findCompanyCategory("nezal", "hair-care"))?.name).toBe("Hair Care")
    const sub = json(await findCompanyCategory("nezal", "serums"))
    expect(sub.name).toBe("Serums")
    expect(sub.parent.slug).toBe("hair-care")
    expect(await findCompanyCategory("nezal", "nope")).toBeNull()
  })
})

describe("brand list for the /shop Brand filter", () => {
  it("returns active brands in the same order as GET /api/companies", async () => {
    const { GET } = await import("@/app/api/companies/route")
    const api = await (await GET(new NextRequest("http://localhost/api/companies"))).json()
    const brands = json(await getActiveCompanies())
    expect(brands.map((c: any) => c.slug)).toEqual(api.map((c: any) => c.slug))
    expect(brands.map((c: any) => c.slug)).toEqual(["other", "nezal"])
  })
})
