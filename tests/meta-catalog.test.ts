// Tests for the Meta catalog feed: the row builder in lib/meta-catalog.ts
// (pricing, availability, exclusions, text clean-up, CSV escaping), the
// database query behind it, and GET /meta-catalog.csv.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

// The route caches through Redis; here it builds the feed on every call.
vi.mock("@/lib/cache", () => ({
  getOrSetCache: (_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher(),
}))

import { Company } from "@/lib/models/company"
import { Category } from "@/lib/models/category"
import { Product } from "@/lib/models/product"
import { FlashSale } from "@/lib/models/flashsale"
import type { FlashSaleInfo } from "@/lib/flashSale"
import {
  buildMetaCatalogCsv,
  buildMetaFeedRow,
  cleanDescription,
  cleanTitle,
  toMetaFeedCsv,
  META_FEED_COLUMNS,
  type FeedProduct,
  type MetaFeedRow,
} from "@/lib/meta-catalog"
import { GET } from "@/app/meta-catalog.csv/route"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const SITE = "https://nezalherbocare.com"
const CDN = "https://nezal-cdn.b-cdn.net/uploads"
const PRODUCT_ID = "6a0d9d9edf37fac29c20d5d9"
const noFlashSales = new Map<string, FlashSaleInfo>()

function feedProduct(overrides: Partial<FeedProduct> = {}): FeedProduct {
  return {
    _id: PRODUCT_ID,
    name: "Apricot Scrub",
    description: "Gentle Exfoliation\nA targeted exfoliating scrub.",
    price: 95,
    discountPrice: null,
    salePercentage: null,
    image: `${CDN}/main.png`,
    images: [`${CDN}/main.png`, `${CDN}/side.png`],
    stock: 10,
    sizes: [],
    isActive: true,
    company: { slug: "nh", isActive: true },
    category: { name: "Body Care", slug: "body-care" },
    ...overrides,
  }
}

function flashSale(productId: string, discountPercent: number): Map<string, FlashSaleInfo> {
  return new Map([
    [productId, { saleId: "s1", saleName: "Flash", discountPercent, endsAt: new Date(Date.now() + 3600_000).toISOString() }],
  ])
}

// Minimal RFC 4180 reader, enough to read the feed back
function parseCsv(text: string): Record<string, string>[] {
  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      record.push(field)
      field = ""
    } else if (char === "\n") {
      record.push(field)
      records.push(record)
      record = []
      field = ""
    } else {
      field += char
    }
  }
  const [header, ...rows] = records
  expect(header).toEqual([...META_FEED_COLUMNS])
  return rows.map((row) => Object.fromEntries(header.map((column, i) => [column, row[i]])))
}

describe("buildMetaFeedRow", () => {
  it("builds every column for a product without sizes", () => {
    expect(buildMetaFeedRow(feedProduct(), noFlashSales, SITE)).toEqual({
      id: PRODUCT_ID,
      title: "Apricot Scrub",
      description: "Gentle Exfoliation. A targeted exfoliating scrub.",
      availability: "in stock",
      condition: "new",
      price: "95.00 INR",
      sale_price: "",
      link: `${SITE}/shop/nh/product/${PRODUCT_ID}`,
      image_link: `${CDN}/main.png`,
      additional_image_link: `${CDN}/side.png`,
      brand: "Nezal Herbocare",
      google_product_category: "474",
      product_type: "Body Care",
    })
  })

  it("prices the first in-stock size, with the product's sale applied to it", () => {
    const row = buildMetaFeedRow(
      feedProduct({
        salePercentage: 10,
        sizes: [
          { price: 125, stock: 0 },
          { price: 225, stock: 4 },
          { price: 400, stock: 9 },
        ],
      }),
      noFlashSales,
      SITE
    )
    expect(row).toMatchObject({ availability: "in stock", price: "225.00 INR", sale_price: "203.00 INR" })
  })

  it("uses a size's own discount price ahead of the product's sale", () => {
    const row = buildMetaFeedRow(
      feedProduct({ salePercentage: 10, sizes: [{ price: 300, discountPrice: 250, stock: 3 }] }),
      noFlashSales,
      SITE
    )
    expect(row).toMatchObject({ price: "300.00 INR", sale_price: "250.00 INR" })
  })

  it("lets a running flash sale win over every other discount", () => {
    const row = buildMetaFeedRow(
      feedProduct({ salePercentage: 10, sizes: [{ price: 200, discountPrice: 150, stock: 2 }] }),
      flashSale(PRODUCT_ID, 20),
      SITE
    )
    expect(row).toMatchObject({ price: "200.00 INR", sale_price: "160.00 INR" })
  })

  it("lists a product with no size in stock as out of stock, at the price the page shows", () => {
    const row = buildMetaFeedRow(
      feedProduct({
        price: 300,
        salePercentage: 10,
        sizes: [
          { price: 125, stock: 0 },
          { price: 225, stock: 0 },
        ],
      }),
      noFlashSales,
      SITE
    )
    expect(row).toMatchObject({ availability: "out of stock", price: "300.00 INR", sale_price: "270.00 INR" })

    const noSizes = buildMetaFeedRow(feedProduct({ stock: 0 }), noFlashSales, SITE)
    expect(noSizes?.availability).toBe("out of stock")
  })

  it("only sends sale_price when it is strictly lower than the price", () => {
    const higher = buildMetaFeedRow(
      feedProduct({ sizes: [{ price: 100, discountPrice: 120, stock: 1 }] }),
      noFlashSales,
      SITE
    )
    // The cart charges discountPrice || price, so that is the feed price
    expect(higher).toMatchObject({ price: "120.00 INR", sale_price: "" })

    const equal = buildMetaFeedRow(
      feedProduct({ sizes: [{ price: 100, discountPrice: 100, stock: 1 }] }),
      noFlashSales,
      SITE
    )
    expect(equal).toMatchObject({ price: "100.00 INR", sale_price: "" })
  })

  it.each([
    ["an inactive product", { isActive: false }],
    ["a product of an inactive brand", { company: { slug: "nh", isActive: false } }],
    ["a product with no brand", { company: null }],
    ["a product whose brand has no slug", { company: { slug: "", isActive: true } }],
    ["a product with no image", { image: "", images: [] }],
    ["a product with a zero price", { price: 0 }],
  ] as [string, Partial<FeedProduct>][])("leaves out %s", (_label, overrides) => {
    expect(buildMetaFeedRow(feedProduct(overrides), noFlashSales, SITE)).toBeNull()
  })

  it("falls back to the first gallery image and makes image URLs safe to list", () => {
    const row = buildMetaFeedRow(
      feedProduct({
        image: "",
        images: ["/uploads/front view.jpg", `${CDN}/a,b.jpg`, "/uploads/front view.jpg"],
      }),
      noFlashSales,
      SITE
    )
    expect(row?.image_link).toBe(`${SITE}/uploads/front%20view.jpg`)
    expect(row?.additional_image_link).toBe(`${CDN}/a%2Cb.jpg`)
  })

  it("maps categories to Google product categories and leaves unknown ones blank", () => {
    const soap = buildMetaFeedRow(feedProduct({ category: { name: "Soaps", slug: "soaps" } }), noFlashSales, SITE)
    expect(soap).toMatchObject({ google_product_category: "2503", product_type: "Soaps" })

    const unknown = buildMetaFeedRow(feedProduct({ category: { name: "Candles", slug: "candles" } }), noFlashSales, SITE)
    expect(unknown).toMatchObject({ google_product_category: "", product_type: "Candles" })
  })
})

describe("feed text clean-up", () => {
  it("collapses double spaces and drops a trailing comma from titles", () => {
    expect(cleanTitle("Nezal  Amla Shampoo for Men & Women, with Aloe vera, ")).toBe(
      "Nezal Amla Shampoo for Men & Women, with Aloe vera"
    )
  })

  it("joins description lines into one paragraph", () => {
    expect(cleanDescription("Smooth & Shiny Hair\nEnriched with  seaweed extract.")).toBe(
      "Smooth & Shiny Hair. Enriched with seaweed extract."
    )
    expect(cleanDescription("First paragraph.\n\nSecond paragraph.")).toBe("First paragraph. Second paragraph.")
  })

  it("drops quote marks wrapping the whole description but keeps quotes inside it", () => {
    expect(cleanDescription('"Give your hair a fresh start."')).toBe("Give your hair a fresh start.")
    expect(cleanDescription('Called "the queen of oils" by many.')).toBe('Called "the queen of oils" by many.')
  })
})

describe("toMetaFeedCsv", () => {
  it("writes a header row and escapes commas and quotes", () => {
    const row = buildMetaFeedRow(
      feedProduct({ name: 'Rose, "Royal" Soap', description: "Rich lather, soft skin." }),
      noFlashSales,
      SITE
    ) as MetaFeedRow
    const csv = toMetaFeedCsv([row])

    expect(csv.split("\n")[0]).toBe(META_FEED_COLUMNS.join(","))
    expect(csv).toContain(`${PRODUCT_ID},"Rose, ""Royal"" Soap","Rich lather, soft skin.",in stock,new,95.00 INR,,`)
    expect(parseCsv(csv)).toEqual([row])
  })
})

describe("buildMetaCatalogCsv and GET /meta-catalog.csv", () => {
  let roseSoapId: string
  let lemonSoapId: string

  beforeAll(async () => {
    await connectTestDb()

    const nh = await Company.create({ name: "nh", slug: "nh" })
    const hidden = await Company.create({ name: "Hidden", slug: "hidden", isActive: false })
    const soaps = await Category.create({ name: "Soaps", slug: "soaps", company: nh._id })

    const base = { company: nh._id, category: soaps._id, image: `${CDN}/soap.jpg`, images: [`${CDN}/soap.jpg`] }
    const [roseSoap, lemonSoap] = await Product.create([
      {
        ...base,
        name: "Rose Soap",
        slug: "rose-soap",
        sku: "R1",
        price: 100,
        stock: 5,
        sortOrder: 1,
        sizes: [
          { size: "100g", unit: "g", quantity: 100, price: 100, stock: 5 },
          { size: "3+1 (100g x 4)", unit: "g", quantity: 400, price: 300, stock: 5 },
        ],
      },
      { ...base, name: "Lemon Soap", slug: "lemon-soap", sku: "L1", price: 150, stock: 0, sortOrder: 2 },
      { ...base, name: "Hidden Brand Soap", slug: "hidden-soap", sku: "H1", price: 120, stock: 5, company: hidden._id },
      { ...base, name: "Retired Soap", slug: "retired-soap", sku: "X1", price: 120, stock: 5, isActive: false },
      { ...base, name: "Imageless Soap", slug: "imageless-soap", sku: "I1", price: 120, stock: 5, image: "", images: [] },
    ])
    roseSoapId = roseSoap._id.toString()
    lemonSoapId = lemonSoap._id.toString()

    await FlashSale.create({
      name: "Lemon Flash",
      discountPercent: 20,
      startsAt: new Date(Date.now() - 3600_000),
      endsAt: new Date(Date.now() + 3600_000),
      products: [lemonSoap._id],
    })
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it("lists only listable products, in the shop's order, priced live", async () => {
    const rows = parseCsv(await buildMetaCatalogCsv())

    expect(rows.map((row) => row.id)).toEqual([roseSoapId, lemonSoapId])
    expect(rows[0]).toMatchObject({
      title: "Rose Soap",
      availability: "in stock",
      price: "100.00 INR",
      sale_price: "",
      link: `${SITE}/shop/nh/product/${roseSoapId}`,
      brand: "Nezal Herbocare",
      google_product_category: "2503",
      product_type: "Soaps",
    })
    expect(rows[1]).toMatchObject({
      title: "Lemon Soap",
      availability: "out of stock",
      price: "150.00 INR",
      sale_price: "120.00 INR",
    })
  })

  it("serves the feed as CSV", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8")
    expect(await res.text()).toBe(await buildMetaCatalogCsv())
  })

  it("refuses to serve an empty feed, which would wipe the catalog", async () => {
    await Product.deleteMany({})
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(buildMetaCatalogCsv()).rejects.toThrow("no products")
    const res = await GET()
    expect(res.status).toBe(500)

    consoleError.mockRestore()
  })
})
