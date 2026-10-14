"use client"

// components/deferred-stylesheet.tsx
//
// Adds a <link rel="stylesheet"> after hydration, so it never blocks first
// paint. Only for styles nothing needs on first render — e.g. a third-party
// widget that opens on click (see components/shiprocket-checkout-assets.tsx).

import { useEffect } from "react"

export function DeferredStylesheet({ href }: { href: string }) {
  useEffect(() => {
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    if (Array.from(links).some((link) => link.href === href)) return

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }, [href])

  return null
}
