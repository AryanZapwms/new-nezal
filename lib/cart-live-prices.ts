// lib/cart-live-prices.ts
//
// Reprices the cart's stored items (remembered in localStorage from when they
// were added) against products as they are now — exactly the way
// app/api/orders/route.ts charges them: the size matched on the product as it
// is now, then lib/pricing.ts's resolveCurrentPrice (flash sale, size price,
// direct/collection sale). Pure, so hooks/use-live-cart-prices.ts can run it in
// the browser and tests/cart-live-prices.test.ts can pin it to the order API.

import type { CartItem } from "@/lib/store/cart-store"
import { resolveCurrentPrice } from "@/lib/pricing"
import type { FlashSaleInfo } from "@/lib/flashSale"

export interface PriceChange {
  /** Unit price the cart showed. */
  from: number
  /** Unit price now (what the order will charge). */
  to: number
}

/** The key the cart and checkout use to tell line items apart. */
export function cartItemKey(item: CartItem) {
  return `${item.productId}-${item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}${item.selectedSize.unit}` : "default"}`
}

/** What the cart displays and totals per unit (cart-store's getTotalPrice rule). */
export function payablePrice(item: Pick<CartItem, "price" | "discountPrice">) {
  return item.discountPrice || item.price
}

/** One cart item repriced like the order API; null when its size no longer exists. */
function repriceItem(item: CartItem, product: any, flashSaleMap: Map<string, FlashSaleInfo>): CartItem | null {
  if (item.selectedSize?.size) {
    const selected = item.selectedSize
    const size = product.sizes?.find(
      (s: any) => s.size === selected.size && (selected.sku ? s.sku === selected.sku : true)
    )
    if (!size) return null // the order API reports a missing size itself; leave the item alone

    const resolved = resolveCurrentPrice(product, flashSaleMap, size)
    return {
      ...item,
      price: resolved.price,
      discountPrice: resolved.discountPrice,
      flashSale: resolved.flashSale,
      // Same shape the product page stores: the size's price + the effective discount price
      selectedSize: { ...selected, price: size.price, discountPrice: resolved.discountPrice },
    }
  }

  const resolved = resolveCurrentPrice(product, flashSaleMap, null)
  return { ...item, price: resolved.price, discountPrice: resolved.discountPrice, flashSale: resolved.flashSale }
}

/**
 * Reprices `items` against `products` — the JSON from GET /api/products?ids=
 * (flash-sale info already merged in). Items whose payable price changed come
 * back updated and listed in `changes`; every other item is returned untouched,
 * including ones whose product or size no longer exists.
 */
export function repriceCartItems(items: CartItem[], products: any[]) {
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const flashSaleMap = new Map<string, FlashSaleInfo>(
    products.filter((p) => p.flashSale).map((p) => [String(p._id), p.flashSale])
  )

  const changes: Record<string, PriceChange> = {}
  const repriced = items.map((item) => {
    const product = byId.get(item.productId)
    if (!product) return item // deleted product — the order API reports it
    const next = repriceItem(item, product, flashSaleMap)
    if (!next) return item
    const from = payablePrice(item)
    const to = payablePrice(next)
    if (from === to) return item
    changes[cartItemKey(item)] = { from, to }
    return next
  })

  return { items: repriced, changes }
}
