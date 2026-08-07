// app/blog/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
// app/blog/[slug]/layout.tsx overrides this with per-post metadata.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description:
    "Skincare and haircare tips, ingredient deep-dives, and Ayurvedic wisdom from the Nezal team.",
  path: "/blog",
})

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
