// app/checkout/layout.tsx
//
// Checkout is a private, session-bound flow — nothing here should ever be
// indexed by search engines.
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"

export const metadata: Metadata = NOINDEX_METADATA

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
