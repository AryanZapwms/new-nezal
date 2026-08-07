// app/concerns/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Shop by Skin & Hair Concern",
  description:
    "Find natural Nezal products tailored to your skin and hair concerns — acne, pigmentation, dryness, hair fall, and more.",
  path: "/concerns",
})

export default function ConcernsLayout({ children }: { children: React.ReactNode }) {
  return children
}
