"use client"

// hooks/use-shiprocket-checkout.ts
//
// Starts a Shiprocket Custom Checkout session in place of navigating to our
// own /checkout page. Calls our /api/shiprocket/initiate-checkout, then
// window.HeadlessCheckout.addToCart() (loaded on the cart and product routes
// by components/shiprocket-checkout-assets.tsx). Never lets checkout dead-end for the customer: any
// failure — our API erroring, or the widget script still not loaded after
// SCRIPT_WAIT_MS — falls back to a plain router.push(fallbackPath) to our own
// checkout page, and reports why to app/api/checkout-fallback.

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { CartItem } from "@/lib/store/cart-store"
import { trackInitiateCheckout, type PixelContent } from "@/lib/facebook-pixel"

type HeadlessCheckout = {
  addToCart: (
    event: unknown,
    token: string,
    options: { fallbackUrl: string; isInitiatedFromApp: boolean }
  ) => void
}

declare global {
  interface Window {
    HeadlessCheckout?: HeadlessCheckout
  }
}

// A tap can come before the widget script has run: React replays a tap made
// before hydration as soon as the page hydrates, and the afterInteractive
// script is often still downloading then. So wait for it (polling, since the
// script fires no event of its own) instead of falling back straight away.
const SCRIPT_POLL_MS = 250
const SCRIPT_WAIT_MS = 8000

// Resolves with window.HeadlessCheckout as soon as it exists, or null once
// timeoutMs has passed without it.
function waitForHeadlessCheckout(timeoutMs: number): Promise<HeadlessCheckout | null> {
  return new Promise((resolve) => {
    if (window.HeadlessCheckout) return resolve(window.HeadlessCheckout)
    const deadline = Date.now() + timeoutMs
    const timer = setInterval(() => {
      if (window.HeadlessCheckout || Date.now() >= deadline) {
        clearInterval(timer)
        resolve(window.HeadlessCheckout ?? null)
      }
    }, SCRIPT_POLL_MS)
  })
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

// Why a checkout fell back to our own page. api_<status> is the HTTP status
// /api/shiprocket/initiate-checkout answered with: api_400 = it rejected the
// cart, api_502 = Shiprocket's own API failed.
type FallbackReason = "script_not_loaded_timeout" | `api_${number}` | "network_error" | "exception"

class CheckoutFallbackError extends Error {
  reason: FallbackReason
  status?: number

  constructor(reason: FallbackReason, message: string, status?: number) {
    super(message)
    this.reason = reason
    this.status = status
  }
}

type NetworkInformation = { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }

// Tells app/api/checkout-fallback (which logs it) why this checkout fell
// back. sendBeacon still delivers after the navigation that follows, and it
// doesn't go through window.fetch, so lib/fetch-interceptor.ts never sees it.
function reportFallback(
  reason: FallbackReason,
  details: { status?: number; message?: string; waitedMs?: number },
  cartItems: ShiprocketCheckoutInputItem[]
) {
  try {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
    navigator.sendBeacon(
      "/api/checkout-fallback",
      JSON.stringify({
        reason,
        status: details.status ?? null,
        message: details.message ?? null,
        items: toShiprocketCartItems(cartItems),
        pageUrl: window.location.href,
        // Since this tab's first page load (client-side navigations don't reset it)
        msSinceLoad: Math.round(performance.now()),
        waitedMs: details.waitedMs ?? null,
        // Staging and production script URLs both end like this
        scriptTagPresent: !!document.querySelector('script[src*="/assets/js/channels/shopify.js"]'),
        userAgent: navigator.userAgent,
        connection: connection
          ? {
              effectiveType: connection.effectiveType,
              downlink: connection.downlink,
              rtt: connection.rtt,
              saveData: connection.saveData,
            }
          : null,
      })
    )
  } catch {
    // Reporting must never get in the way of the fallback itself
  }
}

export function useShiprocketCheckout() {
  const router = useRouter()
  const { toast } = useToast()
  // True while a checkout is starting (including waiting for the widget
  // script), so the button can show an inline spinner (the request doesn't
  // put up the full-screen overlay — see SILENT_REQUESTS in
  // lib/fetch-interceptor.ts)
  const [starting, setStarting] = useState(false)
  // True until the widget script has run, so buttons can show a spinner
  // from the server-rendered HTML onwards. Gives up after SCRIPT_WAIT_MS so a
  // blocked script doesn't leave them spinning forever. Buttons stay
  // clickable meanwhile: a tap just waits for the script (see above).
  const [scriptLoading, setScriptLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    waitForHeadlessCheckout(SCRIPT_WAIT_MS).then(() => {
      if (!cancelled) setScriptLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // `event` is threaded straight through to HeadlessCheckout.addToCart(),
  // per Shiprocket's own integration example — first argument, same as
  // their vanilla-JS sample passes the click event.
  const initiateCheckout = useCallback(
    async (event: React.SyntheticEvent, cartItems: ShiprocketCheckoutInputItem[], fallbackPath: string) => {
      setStarting(true)

      try {
        const waitStartedAt = Date.now()
        const widget = await waitForHeadlessCheckout(SCRIPT_WAIT_MS)
        if (!widget) {
          // Widget script still hasn't run (very slow network, blocked) —
          // never let checkout dead-end for the customer.
          reportFallback("script_not_loaded_timeout", { waitedMs: Date.now() - waitStartedAt }, cartItems)
          toast({
            title: "Express checkout unavailable",
            description: "Taking you to our regular checkout instead.",
          })
          router.push(fallbackPath)
          return
        }

        const metaEventId = newMetaEventId()

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
        }).catch((error) => {
          throw new CheckoutFallbackError("network_error", error instanceof Error ? error.message : String(error))
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new CheckoutFallbackError(`api_${res.status}`, data.error || "Failed to start checkout", res.status)
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

        widget.addToCart(event, data.token, {
          fallbackUrl: `${window.location.origin}${fallbackPath}`,
          isInitiatedFromApp: true,
        })
      } catch (error) {
        console.error("[useShiprocketCheckout] Failed to start Shiprocket checkout:", error)
        reportFallback(
          error instanceof CheckoutFallbackError ? error.reason : "exception",
          {
            status: error instanceof CheckoutFallbackError ? error.status : undefined,
            message: error instanceof Error ? error.message : String(error),
          },
          cartItems
        )
        toast({
          title: "Express checkout unavailable",
          description: "We couldn't start express checkout — taking you to our regular checkout instead.",
          variant: "destructive",
        })
        router.push(fallbackPath)
      } finally {
        setStarting(false)
      }
    },
    [router, toast]
  )

  return { initiateCheckout, starting, scriptLoading }
}
