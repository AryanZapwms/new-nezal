// app/collections/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Collections",
  description:
    "Browse Nezal's curated skincare and haircare collections — face care, body care, hair care, and gift kits built around natural, Ayurvedic ingredients.",
  path: "/collections",
})

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return children
}
