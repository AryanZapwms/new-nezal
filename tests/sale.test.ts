// Pure-function tests for the direct-vs-collection "most recent wins" logic.
// No DB needed — computeEffectiveSale() only looks at the fields passed in.
import { describe, it, expect } from "vitest"
import { computeEffectiveSale, computeSalePrice } from "@/lib/sale"

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000)

describe("computeSalePrice", () => {
  it("rounds the discounted price", () => {
    expect(computeSalePrice(999, 20)).toBe(799) // 999 - 199.8 = 799.2 -> 799
    expect(computeSalePrice(100, 50)).toBe(50)
  })
})

describe("computeEffectiveSale", () => {
  it("returns 'none' when neither direct nor collection sale is set", () => {
    const eff = computeEffectiveSale({ price: 1000 })
    expect(eff.saleSource).toBe("none")
    expect(eff.salePercentage).toBeNull()
    expect(eff.discountPrice).toBeNull()
  })

  it("uses direct sale when it's the only one set", () => {
    const eff = computeEffectiveSale({
      price: 1000,
      directSalePercentage: 10,
      directSaleAppliedAt: hoursAgo(1),
    })
    expect(eff.saleSource).toBe("direct")
    expect(eff.salePercentage).toBe(10)
    expect(eff.discountPrice).toBe(900)
  })

  it("uses collection sale when it's the only one set", () => {
    const collectionId = "652f1a2b3c4d5e6f70718293" as any
    const eff = computeEffectiveSale({
      price: 1000,
      collectionSalePercentage: 25,
      collectionSaleAppliedAt: hoursAgo(1),
      collectionSaleId: collectionId,
    })
    expect(eff.saleSource).toBe("collection")
    expect(eff.salePercentage).toBe(25)
    expect(eff.saleSourceId?.toString()).toBe(collectionId)
    expect(eff.discountPrice).toBe(750)
  })

  it("direct sale wins when set more recently than collection sale", () => {
    const eff = computeEffectiveSale({
      price: 1000,
      directSalePercentage: 15,
      directSaleAppliedAt: hoursAgo(1), // newer
      collectionSalePercentage: 30,
      collectionSaleAppliedAt: hoursAgo(5), // older
    })
    expect(eff.saleSource).toBe("direct")
    expect(eff.salePercentage).toBe(15)
  })

  it("collection sale wins when set more recently than direct sale", () => {
    const eff = computeEffectiveSale({
      price: 1000,
      directSalePercentage: 15,
      directSaleAppliedAt: hoursAgo(5), // older
      collectionSalePercentage: 30,
      collectionSaleAppliedAt: hoursAgo(1), // newer
    })
    expect(eff.saleSource).toBe("collection")
    expect(eff.salePercentage).toBe(30)
  })

  it("ignores a zeroed-out or null sale record even if its timestamp is newest", () => {
    const eff = computeEffectiveSale({
      price: 1000,
      directSalePercentage: 0,
      directSaleAppliedAt: hoursAgo(0.1),
      collectionSalePercentage: 20,
      collectionSaleAppliedAt: hoursAgo(2),
    })
    expect(eff.saleSource).toBe("collection")
  })
})
