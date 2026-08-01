"use client"

/**
 * RitualProductCard
 *
 * Display-only variant of ProductCard used exclusively on ritual pages.
 * Shows image, name, and price but deliberately has NO "Shop Now" or
 * "Add to Cart" buttons — on a ritual page, "Add Full Ritual to Cart"
 * is meant to be the single, unambiguous call-to-action. Individual
 * per-product buttons here would compete with it and confuse the
 * "buy the whole set" intent behind rituals.
 *
 * Clicking the card still navigates to the product detail page, so
 * users who want to inspect or buy just one item aren't blocked —
 * they just don't get a redundant button pushing them to do that.
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

export default function RitualProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  company,
  hasMultipleSizes = false,
  sizes = [],
  stock = 999,
}: RitualProductCardProps) {
  const router = useRouter()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const discount = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0

  const displayPrice =
    hasMultipleSizes && sizes.length > 0
      ? Math.min(...sizes.map((s) => s.discountPrice || s.price))
      : discountPrice || price

  const isOutOfStock = hasMultipleSizes
    ? sizes.every((s) => s.stock < 1)
    : stock < 1

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

        {isOutOfStock && (
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

      {/* CONTENT — no buttons, no size selector, just facts */}
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[36px] sm:min-h-[40px] text-xs sm:text-sm font-medium text-[var(--color-text-heading)] transition-colors group-hover:text-[var(--color-brand-primary)]">
          {name}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-[var(--color-text-heading)]">
            ₹{Math.round(displayPrice).toLocaleString()}
          </span>
          {(discountPrice || hasMultipleSizes) && (
            <span className="text-xs sm:text-sm text-neutral-400 line-through">
              ₹{price.toLocaleString()}
            </span>
          )}
        </div>

        {hasMultipleSizes && sizes.length > 0 && (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {sizes.length} size{sizes.length > 1 ? "s" : ""} available
          </p>
        )}
      </div>
    </div>
  )
}