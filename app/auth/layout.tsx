// app/auth/layout.tsx
//
// Covers login/register/forgot-password/reset-password/verify-otp — none of
// these should ever be indexed or show up in search results.
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"

export const metadata: Metadata = NOINDEX_METADATA

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
