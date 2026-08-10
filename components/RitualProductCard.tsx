"use client"

/**
 * RitualProductCard
 *
 * Display-only variant of ProductCard used exclusively on ritual pages.
 * Shows image, name, price, and (if applicable) a size selector — but
 * deliberately has NO "Shop Now" or "Add to Cart" buttons. On a ritual
 * page, "Add Full Ritual to Cart" is meant to be the single, unambiguous
 * call-to-action. Individual per-product buttons here would compete with
 * it and confuse the "buy the whole set" intent behind rituals.
 *
 * Selecting a size only updates the displayed price/stock on the card —
 * it does not add anything to the cart. Users who want to inspect or buy
 * just one item aren't blocked; clicking the card still navigates to the
 * product detail page.
 */

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
}

interface RitualProductCardProps {
  id: string
  name: string
  price: number
  discountPrice?: number
  image?: string
  company: { name: string; slug: string }
  hasMultipleSizes?: boolean
  sizes?: Size[]
  stock?: number
}

// A product's `size` field sometimes already includes the unit (e.g. "250ml"),
// sometimes doesn't (e.g. "250" with unit "ml" separately). Avoid "250mlml".
function formatSize(s: Size): string {
  return s.size.toLowerCase().includes(s.unit.toLowerCase()) ? s.size : `${s.size}${s.unit}`
}

export default function RitualProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  company,
  hasMultipleSizes = false,
  sizes = [],
  stock = 0,
}: RitualProductCardProps) {
  const router = useRouter()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)

  // Derives a per-size sale price from the product-level sale when the size
  // itself has no explicit discountPrice — mirrors sizeSalePrice() in
  // components/product-card.tsx, so a product-level sale actually shows up
  // per-variant instead of only on size-less products.
  const percentOff =
    discountPrice != null && discountPrice < price && price > 0
      ? (price - discountPrice) / price
      : 0
  const sizeSalePrice = (s: Size) =>
    s.discountPrice ?? (percentOff > 0 ? Math.round(s.price * (1 - percentOff)) : s.price)

  const cheapestSize =
    hasMultipleSizes && sizes.length > 0
      ? sizes.reduce((min, s) => (sizeSalePrice(s) < sizeSalePrice(min) ? s : min), sizes[0])
      : null

  // Price shown reflects the user's size pick once they've made one,
  // otherwise defaults to the cheapest available size (or the base price
  // for size-less products).
  const activeSize = selectedSize ?? cheapestSize
  const displayPrice = activeSize ? sizeSalePrice(activeSize) : discountPrice || price
  const originalPrice = activeSize ? activeSize.price : price

  const discount =
    originalPrice > displayPrice
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : 0

  const isOutOfStock = hasMultipleSizes
    ? sizes.every((s) => s.stock < 1)
    : stock < 1

  const selectedIsOutOfStock = activeSize ? activeSize.stock < 1 : isOutOfStock

  function handleSelectSize(e: React.MouseEvent<HTMLButtonElement>, s: Size) {
    e.preventDefault()
    e.stopPropagation()
    if (s.stock < 1) return
    setSelectedSize(s)
  }

  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: "var(--color-border)" }}
      onClick={() => router.push(`/shop/${company.slug}/product/${id}`)}
    >
      {/* IMAGE */}
      <div
        className="relative overflow-hidden rounded-t-2xl bg-[var(--color-bg-cream)]"
        style={{ aspectRatio: "4/3" }}
      >
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-black/5" />

        {discount > 0 && (
          <div className="absolute right-3 top-3 z-20 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
            {discount}% OFF
          </div>
        )}

        {selectedIsOutOfStock && (
          <div className="absolute left-3 top-3 z-20 rounded-full bg-neutral-800/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Out of Stock
          </div>
        )}

        {image && !imgError ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width:768px) 50vw, 25vw"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true)
              setImgLoaded(true)
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="relative h-16 w-16 opacity-70">
              <Image src="/nezallogo.jpg" alt="Logo" fill className="object-contain" />
            </div>
          </div>
        )}

        {!imgLoaded && image && !imgError && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-neutral-100 to-neutral-200" />
        )}
      </div>

      {/* CONTENT */}
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[36px] sm:min-h-[40px] text-xs sm:text-sm font-medium text-[var(--color-text-heading)] transition-colors group-hover:text-[var(--color-brand-primary)]">
          {name}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-[var(--color-text-heading)]">
            ₹{Math.round(displayPrice).toLocaleString()}
          </span>
          {discount > 0 && (
            <span className="text-xs sm:text-sm text-neutral-400 line-through">
              ₹{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* SIZE SELECTOR — pill buttons, selection-only (no cart action) */}
        {hasMultipleSizes && sizes.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5 pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {sizes.map((s, idx) => {
              const isSelected = activeSize
                ? activeSize.size === s.size &&
                  activeSize.unit === s.unit &&
                  activeSize.quantity === s.quantity
                : false
              const oos = s.stock < 1
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={oos}
                  onClick={(e) => handleSelectSize(e, s)}
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 sm:text-[11px]"
                  style={{
                    backgroundColor: isSelected ? "var(--color-brand-primary)" : "#ffffff",
                    borderColor: isSelected ? "var(--color-brand-primary)" : "var(--color-border)",
                    color: isSelected ? "#ffffff" : "var(--color-text-heading)",
                    textDecoration: oos ? "line-through" : "none",
                  }}
                >
                  {formatSize(s)} — ₹{sizeSalePrice(s)}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}