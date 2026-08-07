// app/shop/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Shop All Products",
  description:
    "Shop the full Nezal range — natural face care, body care, and hair care crafted with Ayurvedic wisdom and 100% natural extracts.",
  path: "/shop",
})

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
