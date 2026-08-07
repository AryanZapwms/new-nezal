// app/admin/layout.tsx
//
// Server wrapper so this segment can export noindex metadata — the actual
// sidebar/auth-gate logic lives in admin-layout-client.tsx since it needs
// useSession/useRouter/useState (Client Component only).
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"
import AdminLayoutClient from "./admin-layout-client"

export const metadata: Metadata = NOINDEX_METADATA

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
