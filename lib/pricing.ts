// lib/pricing.ts
//
// Server-side mirror of the pricing logic in components/product-card.tsx
// (sizeSalePrice/percentOff) and app/shop/[company]/product/[id]/page.tsx
// (currentDiscountPrice/percentOff) — the single place server routes should
// go through to decide what a product (or one of its size variants) costs
// right now, so checkout and the cart mirror always agree with what the
// storefront showed the customer.
//
// Precedence (highest wins):
//   1. an active flash sale (lib/flashSale.ts) — always wins outright while running
//   2. a manually-set per-size discountPrice (admin size-form override)
//   3. the product's active direct/collection sale (lib/sale.ts's
//      computeEffectiveSale, denormalized onto salePercentage/discountPrice),
//      applied as a percentage to the size's (or product's) own price
//   4. full price
//
// Does NOT read the DB itself — callers pass in the flash-sale map (from
// getActiveFlashSaleMap()) so they control when/how often it's fetched.

import type { FlashSaleInfo } from "@/lib/flashSale"

export interface PriceableProduct {
  _id: { toString(): string } | string
  price: number
  discountPrice?: number | null
  salePercentage?: number | null
}

export interface PriceableSize {
  price: number
  discountPrice?: number | null
}

export interface ResolvedPrice {
  /** Full/strikethrough price — the size's own price, or the product's base price when no size applies. */
  price: number
  /** Set only when a discount actually applies. `discountPrice ?? price` is what to charge/display. */
  discountPrice?: number
  flashSale: FlashSaleInfo | null
}

export function resolveCurrentPrice(
  product: PriceableProduct,
  flashSaleMap: Map<string, FlashSaleInfo>,
  size?: PriceableSize | null
): ResolvedPrice {
  const basePrice = size ? size.price : product.price
  const flashSale = flashSaleMap.get(product._id.toString()) ?? null

  if (flashSale) {
    const discountPrice = Math.round(basePrice - (basePrice * flashSale.discountPercent) / 100)
    return { price: basePrice, discountPrice, flashSale }
  }

  if (size && size.discountPrice != null) {
    return { price: basePrice, discountPrice: size.discountPrice, flashSale: null }
  }

  const percentOff =
    product.salePercentage != null && product.salePercentage > 0
      ? product.salePercentage / 100
      : product.discountPrice != null && product.discountPrice < product.price && product.price > 0
        ? (product.price - product.discountPrice) / product.price
        : 0

  if (percentOff > 0) {
    return { price: basePrice, discountPrice: Math.round(basePrice * (1 - percentOff)), flashSale: null }
  }

  return { price: basePrice, flashSale: null }
}
