"use client"

// hooks/use-shiprocket-checkout.ts
//
// Starts a Shiprocket Custom Checkout session in place of navigating to our
// own /checkout page. Calls our /api/shiprocket/initiate-checkout, then
// window.HeadlessCheckout.addToCart() (loaded on the cart and product routes
// by components/shiprocket-checkout-assets.tsx). Never lets checkout dead-end for the customer: any
// failure — our API erroring, or the widget script not being loaded yet —
// falls back to a plain router.push(fallbackPath) to our own checkout page.

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { CartItem } from "@/lib/store/cart-store"
import { trackInitiateCheckout, type PixelContent } from "@/lib/facebook-pixel"

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (
        event: unknown,
        token: string,
        options: { fallbackUrl: string; isInitiatedFromApp: boolean }
      ) => void
    }
  }
}

// Only what's needed to build a Shiprocket cart item — callers can pass
// either the full Zustand cart-store items or a synthesized one-off array
// (e.g. a "Buy Now" item added to the store immediately beforehand).
export type ShiprocketCheckoutInputItem = Pick<CartItem, "productId" | "quantity" | "selectedSize">

// Event id shared with the server-side InitiateCheckout so Meta can dedupe
// the two. randomUUID() needs a secure context and a 2022+ browser; without
// it only the browser event is sent.
function newMetaEventId(): string | undefined {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined
}

// Maps our cart-item shape to what /api/shiprocket/initiate-checkout
// expects — size label + sku, the SAME convention app/api/orders/route.ts
// and razorpay/verify-payment.ts use to resolve a selectedSize, since
// that's all the cart store actually carries (no size _id — see
// lib/shiprocket-checkout.ts for the full explanation).
function toShiprocketCartItems(items: ShiprocketCheckoutInputItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    selectedSize: item.selectedSize
      ? { size: item.selectedSize.size, sku: item.selectedSize.sku }
      : undefined,
  }))
}

export function useShiprocketCheckout() {
  const router = useRouter()
  const { toast } = useToast()
  // True while our initiate-checkout request is in flight, so the button can
  // show an inline spinner (the request doesn't put up the full-screen
  // overlay — see SILENT_REQUESTS in lib/fetch-interceptor.ts)
  const [starting, setStarting] = useState(false)

  // `event` is threaded straight through to HeadlessCheckout.addToCart(),
  // per Shiprocket's own integration example — first argument, same as
  // their vanilla-JS sample passes the click event.
  const initiateCheckout = useCallback(
    async (event: React.SyntheticEvent, cartItems: ShiprocketCheckoutInputItem[], fallbackPath: string) => {
      const fallbackToOwnCheckout = () => {
        router.push(fallbackPath)
      }

      if (typeof window === "undefined" || !window.HeadlessCheckout) {
        // Widget script hasn't loaded (slow network, blocked, still
        // fetching) — never let checkout dead-end for the customer.
        toast({
          title: "Express checkout unavailable",
          description: "Taking you to our regular checkout instead.",
        })
        fallbackToOwnCheckout()
        return
      }

      const metaEventId = newMetaEventId()
      setStarting(true)

      try {
        const res = await fetch("/api/shiprocket/initiate-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItems: toShiprocketCartItems(cartItems),
            // Where Shiprocket sends the customer after payment (appending
            // ?oid=...&ost=SUCCESS) — see app/checkout/success/page.tsx.
            redirectPath: "/checkout/success",
            metaEventId,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to start checkout")
        }

        const data = await res.json()
        if (!data?.token) {
          throw new Error("No checkout token returned")
        }

        // Only once checkout has really started: if it fails, the fallback
        // /checkout page fires its own InitiateCheckout. Value and contents
        // come from the server, the same numbers its copy of the event sends.
        if (data.tracking) {
          const tracking: { value: number; contents: PixelContent[] } = data.tracking
          trackInitiateCheckout(tracking.value, tracking.contents, metaEventId)
        }

        window.HeadlessCheckout.addToCart(event, data.token, {
          fallbackUrl: `${window.location.origin}${fallbackPath}`,
          isInitiatedFromApp: true,
        })
      } catch (error) {
        console.error("[useShiprocketCheckout] Failed to start Shiprocket checkout:", error)
        toast({
          title: "Express checkout unavailable",
          description: "We couldn't start express checkout — taking you to our regular checkout instead.",
          variant: "destructive",
        })
        fallbackToOwnCheckout()
      } finally {
        setStarting(false)
      }
    },
    [router, toast]
  )

  return { initiateCheckout, starting }
}
