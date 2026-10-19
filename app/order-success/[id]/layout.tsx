// app/order-success/[id]/layout.tsx
//
// Order confirmation pages are unique per order and never meant to be
// discovered — should never be indexed by search engines.
//
// Also renders the browser Meta Purchase event. It's loaded here on the
// server, rather than by page.tsx through GET /api/orders/[id], because that
// API needs a session and guests would never be tracked. Only
// { eventId, value, contents } reaches the browser (lib/meta-purchase.ts).
import type { Metadata } from "next"
import type React from "react"
import { NOINDEX_METADATA } from "@/lib/seo"
import { loadOrderSuccessTrackingData } from "@/lib/meta-purchase"
import { MetaPurchaseTracker } from "@/components/meta-purchase-tracker"

export const metadata: Metadata = NOINDEX_METADATA

// The tracking data depends on the order's state and age, so this must never
// be served from a cached render.
export const dynamic = "force-dynamic"

export default async function OrderSuccessLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tracking = await loadOrderSuccessTrackingData(id).catch((err) => {
    console.error(`[order-success] Failed to load Meta Purchase data for order ${id}:`, err)
    return null
  })

  return (
    <>
      {tracking && <MetaPurchaseTracker {...tracking} />}
      {children}
    </>
  )
}
