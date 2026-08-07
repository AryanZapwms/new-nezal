// app/order-success/[id]/layout.tsx
//
// Order confirmation pages are unique per order and never meant to be
// discovered — should never be indexed by search engines.
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"

export const metadata: Metadata = NOINDEX_METADATA

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
