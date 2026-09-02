"use client"

// components/cart-hydrator.tsx
//
// Mounted once in app/layout.tsx. Reconciles the local Zustand cart with the
// server-side Cart mirror, then starts the sync subscription. Renders
// nothing.
//
// Reconciliation rules (deliberately conservative — see the "Do not
// unexpectedly overwrite a customer's existing local cart" requirement):
//   - Logged in: always call /api/cart/merge and adopt its result. This is
//     a one-time, purposeful reconciliation triggered by the act of logging
//     in — the merge endpoint already unions the guest cart (if any) with
//     the account's existing cart and stock-caps quantities, so its result
//     is authoritative for that moment, even if the local cart is non-empty
//     (it's usually the same items the merge just folded in).
//   - Not logged in: fetch /api/cart read-only, and only adopt it when the
//     local cart is currently EMPTY (recovering a cart after localStorage
//     was cleared). A non-empty local cart is never overwritten by a guest
//     GET — that's the exact "empty server wipes a real cart" case this
//     component must avoid.
// initCartSync() only starts running after this first pass completes (success
// or failure), so the very first debounced sync reflects post-reconciliation
// state rather than racing it.
import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"
import { initCartSync } from "@/lib/store/cart-sync"

async function waitForPersistHydration() {
  if (useCartStore.persist.hasHydrated()) return
  await new Promise<void>((resolve) => {
    const unsub = useCartStore.persist.onFinishHydration(() => {
      unsub()
      resolve()
    })
  })
}

export function CartHydrator() {
  const { status } = useSession()
  const hasMergedRef = useRef(false)
  const hasCheckedGuestCartRef = useRef(false)

  useEffect(() => {
    if (status === "loading") return

    let cancelled = false

    ;(async () => {
      await waitForPersistHydration()
      if (cancelled) return

      try {
        if (status === "authenticated" && !hasMergedRef.current) {
          hasMergedRef.current = true
          const res = await fetch("/api/cart/merge", { method: "POST" })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.items)) {
              useCartStore.setState({ items: data.items })
            }
          }
        } else if (status === "unauthenticated") {
          hasMergedRef.current = false // allow a future login (same tab) to merge again
          if (!hasCheckedGuestCartRef.current) {
            hasCheckedGuestCartRef.current = true
            const res = await fetch("/api/cart")
            if (res.ok) {
              const data = await res.json()
              const localItems = useCartStore.getState().items
              if (localItems.length === 0 && Array.isArray(data.items) && data.items.length > 0) {
                useCartStore.setState({ items: data.items })
              }
            }
          }
        }
      } catch (err) {
        console.error("[cart-hydrator] reconciliation failed:", err)
      } finally {
        if (!cancelled) initCartSync()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status])

  return null
}
