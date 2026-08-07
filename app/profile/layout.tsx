// app/profile/layout.tsx
//
// Server wrapper so this segment can export noindex metadata — the actual
// session-gated layout logic lives in profile-layout-client.tsx since it
// needs useSession/useRouter (Client Component only).
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"
import ProfileLayoutClient from "./profile-layout-client"

export const metadata: Metadata = NOINDEX_METADATA

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileLayoutClient>{children}</ProfileLayoutClient>
}
