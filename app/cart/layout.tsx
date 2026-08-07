// app/cart/layout.tsx
//
// A shopping cart is per-user, session-bound state — nothing here should
// ever be indexed by search engines.
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"

export const metadata: Metadata = NOINDEX_METADATA

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
