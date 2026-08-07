// app/about-us/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Discover the story behind Nezal — natural, Ayurveda-inspired skincare crafted with 100% natural extracts, cruelty-free and dermatologist tested.",
  path: "/about-us",
})

export default function AboutUsLayout({ children }: { children: React.ReactNode }) {
  return children
}
