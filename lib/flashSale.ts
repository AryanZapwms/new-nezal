// lib/flashSale.ts
//
// Single source of truth for "is this product on flash sale right now, and
// what should it cost". Any route that returns product data should run its
// results through applyFlashSale() before responding, so the sale shows up
// everywhere the product is displayed — not just the FlashDeal banner.

import { FlashSale } from "@/lib/models/flashsale"

export interface FlashSaleInfo {
  saleId: string
  saleName: string
  discountPercent: number
  endsAt: string
}

export async function getActiveFlashSaleMap(): Promise<Map<string, FlashSaleInfo>> {
  const now = new Date()
  const sales = await FlashSale.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  })
    .select("name discountPercent endsAt products")
    .lean()

  const map = new Map<string, FlashSaleInfo>()
  for (const sale of sales as any[]) {
    for (const productId of sale.products || []) {
      const idStr = productId.toString()
      const existing = map.get(idStr)
      if (!existing || sale.discountPercent > existing.discountPercent) {
        map.set(idStr, {
          saleId: sale._id.toString(),
          saleName: sale.name,
          discountPercent: sale.discountPercent,
          endsAt: new Date(sale.endsAt).toISOString(),
        })
      }
    }
  }
  return map
}

export function applyFlashSale<T extends { _id: any; price: number; discountPrice?: number }>(
  product: T,
  flashSaleMap: Map<string, FlashSaleInfo>
): T & { flashSale?: FlashSaleInfo } {
  const info = flashSaleMap.get(product._id.toString())
  if (!info) return product
  const flashPrice = Math.round(product.price - (product.price * info.discountPercent) / 100)
  return { ...product, discountPrice: flashPrice, flashSale: info }
}

export function applyFlashSaleToList<T extends { _id: any; price: number; discountPrice?: number }>(
  products: T[],
  flashSaleMap: Map<string, FlashSaleInfo>
): (T & { flashSale?: FlashSaleInfo })[] {
  return products.map((p) => applyFlashSale(p, flashSaleMap))
}