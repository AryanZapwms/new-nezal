// app/ingredients/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Discover Our Ingredients",
  description:
    "Explore the natural and Ayurvedic ingredients behind every Nezal formulation — from Aloe Vera and Niacinamide to Neem, Tulsi, and Redensyl.",
  path: "/ingredients",
})

export default function IngredientsLayout({ children }: { children: React.ReactNode }) {
  return children
}
