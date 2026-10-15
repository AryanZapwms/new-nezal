// components/price-updated-note.tsx
//
// Shown on a cart/checkout line item whose price changed since it was added
// (see hooks/use-live-cart-prices.ts), so a price never changes silently.

import { Info } from "lucide-react"
import type { PriceChange } from "@/lib/cart-live-prices"

const formatPrice = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

export function PriceUpdatedNote({ change, className = "" }: { change?: PriceChange; className?: string }) {
  if (!change) return null
  return (
    <p role="status" className={`flex items-center gap-1 text-xs font-medium text-amber-700 ${className}`}>
      <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      Price updated: ₹{formatPrice(change.from)} → ₹{formatPrice(change.to)} each
    </p>
  )
}
