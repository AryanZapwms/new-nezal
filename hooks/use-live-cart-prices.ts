"use client"

// hooks/use-live-cart-prices.ts
//
// The cart remembers each item's price from when it was added (localStorage),
// so it can go stale. This re-reads every cart product from the database
// (GET /api/products?ids= — never cached) and reprices items the way the order
// API charges them (lib/cart-live-prices.ts). Items whose payable price changed
// are updated in the cart store and returned in `priceChanges`, so the page can
// tell the shopper — prices never change silently. Also returns each product's
// GST rate, which the cart and checkout summaries read from the same request.

import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store/cart-store"
import { cartItemKey, payablePrice, repriceCartItems, type PriceChange } from "@/lib/cart-live-prices"

export { cartItemKey, type PriceChange }

export function useLiveCartPrices() {
  // Re-check whenever the set of items or any displayed price changes — that
  // includes the cart being replaced after mount (e.g. the login cart merge).
  // After an update this runs once more, finds nothing to change, and stops.
  const priceKey = useCartStore((state) =>
    state.items.map((item) => `${cartItemKey(item)}:${payablePrice(item)}`).sort().join("|")
  )
  const [gstMap, setGstMap] = useState<Record<string, number>>({})
  const [priceChanges, setPriceChanges] = useState<Record<string, PriceChange>>({})

  useEffect(() => {
    const ids = Array.from(new Set(useCartStore.getState().items.map((item) => item.productId)))
    if (ids.length === 0) {
      setGstMap({})
      return
    }

    const controller = new AbortController()
    fetch(`/api/products?ids=${ids.join(",")}`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => {
        const products: any[] = data.products || []

        const gst: Record<string, number> = {}
        products.forEach((p) => {
          if (typeof p.gstPercent === "number") gst[String(p._id)] = p.gstPercent
        })
        setGstMap(gst)

        const { items, changes } = repriceCartItems(useCartStore.getState().items, products)
        if (Object.keys(changes).length > 0) {
          useCartStore.setState({ items })
          setPriceChanges((prev) => ({ ...prev, ...changes }))
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [priceKey])

  return { gstMap, priceChanges }
}
