// app/rituals/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Skincare & Haircare Rituals",
  description:
    "Explore Nezal's curated skincare and haircare rituals — step-by-step natural routines built around Ayurvedic ingredients for every concern.",
  path: "/rituals",
})

export default function RitualsLayout({ children }: { children: React.ReactNode }) {
  return children
}
