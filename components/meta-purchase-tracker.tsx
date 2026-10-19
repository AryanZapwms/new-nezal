"use client"

// components/meta-purchase-tracker.tsx
//
// Fires the browser Meta Purchase for a confirmed order, once per browser tab.
// Rendered by both confirmation pages with data from lib/meta-purchase.ts;
// eventId is the order _id, the same event_id the server-side Purchase sends,
// so Meta keeps one of the two.
//
// The pixel script loads after hydration (components/analytics.tsx), which
// can be later than this effect runs, so it waits for window.fbq before
// firing. The order is only marked as tracked once the event has gone out.

import { useEffect } from "react"
import { trackPurchase } from "@/lib/facebook-pixel"
import type { PurchaseTrackingData } from "@/lib/meta-purchase"

const PIXEL_WAIT_INTERVAL_MS = 200
const PIXEL_WAIT_ATTEMPTS = 50 // ~10 s, then give up (pixel blocked or not loaded)

function storageKey(eventId: string) {
  return `fb_purchase_tracked_${eventId}`
}

function alreadyTracked(eventId: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(eventId)) !== null
  } catch {
    return false
  }
}

function markTracked(eventId: string) {
  try {
    sessionStorage.setItem(storageKey(eventId), "1")
  } catch {}
}

export function MetaPurchaseTracker({ eventId, value, contents }: PurchaseTrackingData) {
  useEffect(() => {
    if (alreadyTracked(eventId)) return

    let attempts = 0
    const fireWhenReady = () => {
      if (typeof window.fbq !== "function") return attempts++ < PIXEL_WAIT_ATTEMPTS
      trackPurchase(eventId, value, contents)
      markTracked(eventId)
      return false
    }

    if (!fireWhenReady()) return
    const timer = setInterval(() => {
      if (!fireWhenReady()) clearInterval(timer)
    }, PIXEL_WAIT_INTERVAL_MS)
    return () => clearInterval(timer)
    // The props come from the server and don't change for a given order.
  }, [eventId])

  return null
}
