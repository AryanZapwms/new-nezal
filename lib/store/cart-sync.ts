// lib/store/cart-sync.ts
//
// Keeps the server-side Cart mirror (app/api/cart) up to date with the
// Zustand cart, without touching cart-store.ts's public API. Subscribes to
// the store externally so every existing addItem/removeItem/updateQuantity/
// clearCart/removeRitual call keeps working exactly as before, with sync
// happening as a side effect.
//
// This is fire-and-forget by design: the local Zustand/localStorage cart is
// the real cart. If the server is unreachable, the shopper never sees an
// error — we just log and move on. See components/cart-hydrator.tsx, which
// calls initCartSync() once, after it finishes reconciling on load.
import { useCartStore } from "./cart-store"

const SYNC_DEBOUNCE_MS = 500

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let started = false

function serializeItemsForSync() {
  return useCartStore.getState().items.map((item) => ({
    product: item.productId,
    quantity: item.quantity,
    selectedSize: item.selectedSize,
    flashSale: item.flashSale,
    ritual: item.ritual,
  }))
}

async function pushCartToServer(keepalive = false) {
  try {
    await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: serializeItemsForSync() }),
      // keepalive lets this last sync survive the page unloading — used for
      // the pagehide/visibilitychange flush below. fetch(keepalive) is used
      // instead of navigator.sendBeacon because sendBeacon can only send
      // same-origin POST and can't carry our PUT/JSON contract.
      keepalive,
    })
  } catch (err) {
    // Best-effort mirror — never let a sync failure affect the shopping cart.
    console.error("[cart-sync] failed to sync cart to server:", err)
  }
}

function flushNow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pushCartToServer(true)
}

/** Idempotent — safe to call more than once (components/cart-hydrator.tsx does). */
export function initCartSync() {
  if (started || typeof window === "undefined") return
  started = true

  useCartStore.subscribe((state, prevState) => {
    if (state.items === prevState.items) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => pushCartToServer(false), SYNC_DEBOUNCE_MS)
  })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow()
  })
  window.addEventListener("pagehide", flushNow)
}
