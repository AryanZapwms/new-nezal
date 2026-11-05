"use client"

// components/shiprocket-cart-resume.tsx
//
// Loads the Shiprocket checkout widget on any page opened from an
// abandoned-cart recovery link (?cart-resume-id=..., from the Fastrr
// dashboard), so the widget can reopen that customer's checkout. Every other
// page still goes without the widget (see components/shiprocket-checkout-assets.tsx).
// The stylesheet is needed too: without it the resumed checkout renders as an
// unstyled iframe at the bottom of the page instead of a full-screen overlay.
// Mounted once in app/layout.tsx.
//
// Reads window.location rather than useSearchParams(), which in the root
// layout would need a Suspense boundary around the whole app.

import { useEffect, useState } from "react"
import { DeferredStylesheet } from "@/components/deferred-stylesheet"
import { ShiprocketCheckoutScript } from "@/components/shiprocket-checkout-script"

export function ShiprocketCartResume({ src, cssHref }: { src: string; cssHref: string }) {
  const [isResumeLink, setIsResumeLink] = useState(false)

  useEffect(() => {
    setIsResumeLink(new URLSearchParams(window.location.search).has("cart-resume-id"))
  }, [])

  if (!isResumeLink) return null
  return (
    <>
      <ShiprocketCheckoutScript src={src} />
      <DeferredStylesheet href={cssHref} />
    </>
  )
}
