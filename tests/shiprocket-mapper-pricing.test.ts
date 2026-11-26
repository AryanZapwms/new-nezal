// The Shiprocket catalog feed (lib/shiprocket-mapper.ts) must price every
// variant exactly the way lib/pricing.ts does. Shiprocket charges the feed's
// price (checkout only sends it variant ids), while the product page, cart,
// our own checkout, the saved order lines and the Meta InitiateCheckout value
// all come from resolveCurrentPrice — so any drift between the two shows the
// customer one price on the site and charges another at checkout.
//
// Checked against every size of every product in the 2026-10-15 catalog
// backup (tests/fixtures/catalog-pricing-2026-10-15.json, pricing fields only),
// with and without a flash sale.
import { describe, it, expect } from "vitest"
import catalog from "./fixtures/catalog-pricing-2026-10-15.json"
import { mapProductToShiprocket, computeVariantId } from "@/lib/shiprocket-mapper"
import { resolveCurrentPrice } from "@/lib/pricing"
import type { FlashSaleInfo } from "@/lib/flashSale"

const products: any[] = catalog.products

function flashSaleOn(productIds: string[], discountPercent: number): Map<string, FlashSaleInfo> {
  const info: FlashSaleInfo = {
    saleId: "test-flash-sale",
    saleName: "Test Flash Sale",
    discountPercent,
    endsAt: "2099-01-01T00:00:00.000Z",
  }
  return new Map(productIds.map((id) => [id, info]))
}

// Every variant whose feed price or compare-at price differs from lib/pricing.ts
function mismatches(flashSaleMap: Map<string, FlashSaleInfo>) {
  const found: string[] = []
  let checked = 0
  for (const product of products) {
    const variants = mapProductToShiprocket(product, flashSaleMap).variants
    const sizes: any[] = product.sizes
    const expectedVariants = sizes.length > 0 ? sizes : [null]
    if (variants.length !== expectedVariants.length) {
      found.push(`${product.name}: ${variants.length} variants for ${expectedVariants.length} sizes`)
      continue
    }
    expectedVariants.forEach((size, index) => {
      checked++
      const resolved = resolveCurrentPrice(product, flashSaleMap, size)
      const price = resolved.discountPrice ?? resolved.price
      const expected = {
        id: computeVariantId(product.numericId, size ? index : null),
        price: String(price),
        compare_at_price: price < resolved.price ? String(resolved.price) : null,
      }
      const { id, price: feedPrice, compare_at_price } = variants[index]
      const actual = { id, price: feedPrice, compare_at_price }
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        found.push(`${product.name} / ${size?.size ?? "default"}: feed ${JSON.stringify(actual)}, site ${JSON.stringify(expected)}`)
      }
    })
  }
  return { found, checked }
}

function variantOf(namePrefix: string, sizeLabel: string | null, flashSaleMap = new Map<string, FlashSaleInfo>()) {
  const product = products.find((p) => p.name.startsWith(namePrefix))
  if (!product) throw new Error(`No product named "${namePrefix}…" in the fixture`)
  const variants = mapProductToShiprocket(product, flashSaleMap).variants
  const variant = sizeLabel === null ? variants[0] : variants.find((v: any) => v.title === sizeLabel)
  if (!variant) throw new Error(`No size "${sizeLabel}" on ${product.name}`)
  return { price: variant.price, compare_at_price: variant.compare_at_price }
}

describe("Shiprocket feed prices match lib/pricing.ts for every size in the catalog backup", () => {
  it("covers the whole backup", () => {
    expect(products).toHaveLength(94)
    expect(products.reduce((n, p) => n + p.sizes.length, 0)).toBe(149)
  })

  it("with no flash sale running", () => {
    const { found, checked } = mismatches(new Map())
    expect(found).toEqual([])
    expect(checked).toBe(155) // 149 sizes + 6 products without sizes
  })

  it("with a flash sale on every product", () => {
    const { found } = mismatches(flashSaleOn(products.map((p) => p._id), 20))
    expect(found).toEqual([])
  })

  it("with a flash sale on some products only", () => {
    const { found } = mismatches(flashSaleOn(products.filter((_, i) => i % 3 === 0).map((p) => p._id), 35))
    expect(found).toEqual([])
  })
})

describe("Shiprocket feed prices for the sizes this fix changed", () => {
  it("sends a size's own sale price, with its full price as compare-at", () => {
    // 3+1 pack: its own ₹180, not the product's 8% sale on ₹240 (₹221)
    expect(variantOf("Passion Bathing Bar", "3+1 (100g x 4)")).toEqual({ price: "180", compare_at_price: "240" })
    expect(variantOf("Rakhi Glow & Care Gift Box", null)).toEqual({ price: "748", compare_at_price: "900" })
  })

  it("applies the product's sale % to sizes without a sale price of their own", () => {
    expect(variantOf("Passion Bathing Bar", "100g")).toEqual({ price: "55", compare_at_price: "60" })
  })

  it("sends full price with no compare-at when a size's sale price equals its full price", () => {
    expect(variantOf("Nezal Conditioning, Hydrating", "250ml")).toEqual({ price: "140", compare_at_price: null })
    expect(variantOf("Nezal Conditioning, Hydrating", "500ml")).toEqual({ price: "265", compare_at_price: null })
    expect(variantOf("Doobie French Rose Bath Soap", "75g")).toEqual({ price: "40", compare_at_price: null })
  })

  it("lets a running flash sale win over a size's own sale price, as the site does", () => {
    const passion = products.find((p) => p.name.startsWith("Passion Bathing Bar"))
    const flash = flashSaleOn([passion._id], 20)
    expect(variantOf("Passion Bathing Bar", "3+1 (100g x 4)", flash)).toEqual({ price: "192", compare_at_price: "240" })
    expect(variantOf("Passion Bathing Bar", "100g", flash)).toEqual({ price: "48", compare_at_price: "60" })
  })
})
