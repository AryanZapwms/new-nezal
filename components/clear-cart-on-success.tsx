"use client"

import { useEffect } from "react"
import { useCartStore } from "@/lib/store/cart-store"
import { useCheckoutStore } from "@/lib/store/checkout-store"

// Landing on this page at all means the order succeeded — clear
// unconditionally, same logic as app/order-success/[id]/page.tsx. A
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
