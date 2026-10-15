"use client"

// hooks/use-cart-hydrated.ts
//
// The cart lives in localStorage, so the server always renders it empty. Pages
// that show cart contents render a skeleton until this is true (after mount,
// once the persisted cart has been read) — instead of flashing "Your cart is
// empty", and without a server/client hydration mismatch.

import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store/cart-store"

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) setHydrated(true)
    return useCartStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
