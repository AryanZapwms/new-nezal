// app/orders-and-returns/layout.tsx
//
// Private account area (a signed-in user's own orders/returns) — distinct
// from the public policy page at app/orders-returns. Should never be
// indexed by search engines.
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"

export const metadata: Metadata = NOINDEX_METADATA

export default function OrdersAndReturnsLayout({ children }: { children: React.ReactNode }) {
  return children
}
