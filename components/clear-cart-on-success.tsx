"use client"

import { useEffect } from "react"
import { useCartStore } from "@/lib/store/cart-store"
import { useCheckoutStore } from "@/lib/store/checkout-store"

// Only rendered once the page has a server-verified, confirmed order —
// app/checkout/success/page.tsx also converts the server-side cart mirror
// before rendering, so components/cart-hydrator.tsx can't restore it. A
// Shiprocket Custom Checkout purchase still adds to OUR local Zustand cart
// first (see hooks/use-shiprocket-checkout.ts's call sites, which addItem()
// before handing off to the widget) — it's just never cleared by the
// widget itself, since checkout happens entirely outside our own /checkout
// page. This client-side effect is what clears it. Rendered from a Server
// Component page, which is why this one small piece needs "use client".
export function ClearCartOnSuccess() {
  const clearCart = useCartStore((state) => state.clearCart)
  const clearPendingOrder = useCheckoutStore((state) => state.clearPendingOrder)

  useEffect(() => {
    clearCart()
    clearPendingOrder()
  }, [])

  return null
}
