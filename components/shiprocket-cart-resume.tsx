"use client"

// components/shiprocket-cart-resume.tsx
//
// Loads the Shiprocket checkout widget on any page opened from an
// abandoned-cart recovery link (?cart-resume-id=..., from the Fastrr
// dashboard), so the widget can reopen that customer's checkout. Every other
// page still goes without the widget (see components/shiprocket-checkout-assets.tsx).
// Mounted once in app/layout.tsx.
//
// Reads window.location rather than useSearchParams(), which in the root
// layout would need a Suspense boundary around the whole app.

import { useEffect, useState } from "react"
import { ShiprocketCheckoutScript } from "@/components/shiprocket-checkout-script"

export function ShiprocketCartResume({ src }: { src: string }) {
  const [isResumeLink, setIsResumeLink] = useState(false)

  useEffect(() => {
    setIsResumeLink(new URLSearchParams(window.location.search).has("cart-resume-id"))
  }, [])

  return isResumeLink ? <ShiprocketCheckoutScript src={src} /> : null
}
