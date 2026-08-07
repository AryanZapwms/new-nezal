// app/reviews/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Customer Reviews",
  description:
    "Real reviews from Nezal customers on our natural skincare and haircare products.",
  path: "/reviews",
})

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
