"use client"

// components/shiprocket-checkout-script.tsx
//
// The one <Script> tag for the Shiprocket Custom Checkout widget, rendered by
// both components/shiprocket-checkout-assets.tsx and
// components/shiprocket-cart-resume.tsx. next/script loads a given id/src only
// once, so a recovery link opened on /cart or a product page (where both
// render) still fetches the widget once.
//
// Abandoned-cart recovery links (Fastrr dashboard → ?cart-resume-id=...) are
// handled by the widget itself, but only from a window "load" listener it adds
// when it runs. Loaded afterInteractive, it can run after "load" has already
// fired, and then that listener never runs — so onLoad opens the resumed
// checkout itself in that case.

import Script from "next/script"

declare global {
  interface Window {
    shiprocketCheckoutAbandonedCartHandler?: () => void
  }
}

// next/script runs onLoad for every instance that mounted while the script
// was still loading, so this keeps the handler to one call per page load.
let resumeHandled = false

// True once the window "load" event has started dispatching — listeners added
// from then on never run. Navigation Timing is exact here; readyState becomes
// "complete" slightly before "load" is dispatched, so it's only the fallback.
function windowLoadAlreadyFired(): boolean {
  const [nav] = performance.getEntriesByType?.("navigation") ?? []
  if (nav) return (nav as PerformanceNavigationTiming).loadEventStart > 0
  return document.readyState === "complete"
}

function resumeAbandonedCartIfMissed() {
  if (resumeHandled) return
  if (!new URLSearchParams(window.location.search).has("cart-resume-id")) return
  resumeHandled = true
  if (windowLoadAlreadyFired()) {
    window.shiprocketCheckoutAbandonedCartHandler?.()
  }
}

export function ShiprocketCheckoutScript({ src }: { src: string }) {
  // afterInteractive so it never blocks initial page load/hydration
  return <Script id="shiprocket-checkout" src={src} strategy="afterInteractive" onLoad={resumeAbandonedCartIfMissed} />
}
