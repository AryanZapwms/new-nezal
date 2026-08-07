// app/contact-us/layout.tsx
//
// page.tsx here is a Client Component, which can't export `metadata`
// itself — this sibling server layout supplies it instead. See lib/seo.ts.
import type { Metadata } from "next"
import type React from "react"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Nezal team — questions about orders, products, or partnerships. We're here to help.",
  path: "/contact-us",
})

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children
}
