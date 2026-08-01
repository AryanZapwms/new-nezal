// app/reviews/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Star, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react"

/* ─── Types ─────────────────────────────────────────────── */

interface Review {
  id: string
  productId: string
  productName: string
  productImage: string
  company: string
  customerName: string
  rating: number
  comment: string
  reply: { message: string; repliedByName: string; repliedAt: string } | null
  createdAt: string
}

/* ─── Helpers ────────────────────────────────────────────── */

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false)

  const initials = review.customerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isLong = review.comment.length > 120

  const colors = [
    { bg: "#f0f7f0", accent: "#2a5c3a" },
    { bg: "#fff8f0", accent: "#b45309" },
    { bg: "#f0f4ff", accent: "#3b5bdb" },
    { bg: "#fff0f6", accent: "#c2255c" },
    { bg: "#f3fff3", accent: "#1e6636" },
  ]
  const color = colors[Math.abs(review.id.charCodeAt(0) + review.id.charCodeAt(1)) % colors.length]

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 break-inside-avoid mb-4 border hover:shadow-md transition-shadow"
      style={{ backgroundColor: color.bg, borderColor: "#e2ece3" }}
    >
      {/* Product pill */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white border" style={{ borderColor: "#e2ece3" }}>
          <Image src={review.productImage} alt={review.productName} fill className="object-cover" />
        </div>
        <div className="min-w-0">
          {/* <p className="text-xs font-medium truncate" style={{ color: "#6b7c70" }}>{review.company}</p> */}
          <p className="text-xs font-semibold truncate" style={{ color: color.accent }}>{review.productName}</p>
        </div>
      </div>

      {/* Stars */}
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <Star key={s} size={13}
            className={s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
          />
        ))}
      </div>

      {/* Comment */}
      <div>
        <p className={`text-sm leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}
          style={{ color: "#2d3a30" }}>
          {review.comment}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-semibold hover:underline"
            style={{ color: color.accent }}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Admin reply */}
      {review.reply && (
        <div className="rounded-xl p-3 flex gap-2 bg-white/60">
          <MessageCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: color.accent }} />
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: color.accent }}>Nezal replied</p>
            <p className="text-xs leading-relaxed" style={{ color: "#4a5e50" }}>{review.reply.message}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: "#d4e6d5" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: color.accent, color: "#fff" }}
          >
            {initials}
          </div>
          <span className="text-xs font-semibold" style={{ color: "#1e3a28" }}>
            {review.customerName}
          </span>
        </div>
        {/* <span className="text-xs" style={{ color: "#9cad9e" }}>
          {new Date(review.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span> */}
      </div>
    </div>
  )
}

/* ─── Rating summary bar ─────────────────────────────────── */

function RatingBar({
  star, count, total, active, onClick,
}: {
  star: number; count: number; total: number; active: boolean; onClick: () => void
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full group transition-opacity ${active ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
    >
      <span className="text-xs font-medium w-4 text-right text-[var(--color-text-muted)]">{star}</span>
      <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--color-text-muted)] w-6 text-right">{count}</span>
    </button>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function ReviewsPage() {
  const [reviews, setReviews]       = useState<Review[]>([])
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [sort, setSort]             = useState<"newest" | "highest" | "lowest">("newest")
    const [productFilter, setProductFilter] = useState<string | null>(null)
    const [productFilterName, setProductFilterName] = useState<string>("")
    const [products, setProducts] = useState<{ id: string; name: string }[]>([])
    const [productSearch, setProductSearch] = useState("")
    const [productDropdownOpen, setProductDropdownOpen] = useState(false)

  // For rating distribution — fetch all once
  const [distribution, setDistribution] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  })
  const [avgRating, setAvgRating] = useState(0)

  // Fetch distribution once on mount
 useEffect(() => {
  fetch("/api/products/reviews/all?limit=500")
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) return
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      let sum = 0
      const productMap = new Map<string, string>()
      data.reviews.forEach((r: Review) => {
        dist[r.rating] = (dist[r.rating] || 0) + 1
        sum += r.rating
        productMap.set(r.productId, r.productName)
      })
      setDistribution(dist)
      setAvgRating(data.reviews.length > 0 ? sum / data.reviews.length : 0)
      setProducts(
        Array.from(productMap, ([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    })
    .catch(() => {})
}, [])

const fetchReviews = useCallback(async () => {
  setLoading(true)
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
      sort,
      ...(ratingFilter ? { rating: String(ratingFilter) } : {}),
      ...(productFilter ? { productId: productFilter } : {}),
    })
    const res  = await fetch(`/api/products/reviews/all?${params}`)
    const data = await res.json()
    if (data.success) {
      setReviews(data.reviews)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    }
  } catch {}
  finally { setLoading(false) }
}, [page, sort, ratingFilter, productFilter])

useEffect(() => { fetchReviews() }, [fetchReviews])

// Reset page when filters change
useEffect(() => { setPage(1) }, [sort, ratingFilter, productFilter])

  const totalReviews = Object.values(distribution).reduce((a, b) => a + b, 0)

  return (
    <main className="min-h-screen bg-[var(--color-bg-cream)]">

      {/* Hero */}
      <section className="bg-white border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-primary)] mb-2">
            Customer Reviews
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] mb-3">
            What Our Customers Say
          </h1>
        
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ── */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 sticky top-24 relative">

              {/* Average rating */}
              <div className="text-center pb-4 border-b border-[var(--color-border)] mb-4">
                <p className="text-5xl font-bold text-[var(--color-text-heading)]">
                  {avgRating.toFixed(1)}
                </p>
                <StarRating rating={Math.round(avgRating)} size={18} />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Based on {totalReviews} reviews
                </p>
              </div>

              {/* Rating bars */}
              <div className="flex flex-col gap-2 pb-4 border-b border-[var(--color-border)] mb-4">
                {[5, 4, 3, 2, 1].map((star) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={distribution[star] || 0}
                    total={totalReviews}
                    active={ratingFilter === star}
                    onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  />
                ))}
              </div>

              {/* Clear filter */}
              {ratingFilter && (
                <button
                  onClick={() => setRatingFilter(null)}
                  className="w-full text-xs font-semibold text-[var(--color-brand-primary)] hover:underline mb-4"
                >
                  Clear filter
                </button>
              )}


{/* Filter by product */}
<div className="pb-4 border-b border-[var(--color-border)] mb-4 relative z-30">
  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
    Filter by Product
  </p>

  <div className="relative">
    <input
      type="text"
      value={productDropdownOpen ? productSearch : productFilterName || ""}
      onChange={(e) => {
        setProductSearch(e.target.value)
        setProductDropdownOpen(true)
      }}
      onFocus={() => {
        setProductSearch("")
        setProductDropdownOpen(true)
      }}
      onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
      placeholder="Search product…"
      className="w-full text-sm rounded-xl border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-body)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
    />

    {productDropdownOpen && (
      <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
        <button
          onMouseDown={() => {
            setProductFilter(null)
            setProductFilterName("")
            setProductDropdownOpen(false)
          }}
          className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-[var(--color-bg-cream)] text-[var(--color-text-body)]"
        >
          All Products
        </button>

        {products
          .filter((p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase())
          )
          .map((p) => (
            <button
              key={p.id}
              onMouseDown={() => {
                setProductFilter(p.id)
                setProductFilterName(p.name)
                setProductDropdownOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg-cream)] ${
                productFilter === p.id
                  ? "font-semibold text-[var(--color-brand-primary)]"
                  : "text-[var(--color-text-body)]"
              }`}
            >
              {p.name}
            </button>
          ))}

        {products.filter((p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase())
        ).length === 0 && (
          <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
            No products match.
          </p>
        )}
      </div>
    )}
  </div>

  {productFilter && (
    <button
      onClick={() => {
        setProductFilter(null)
        setProductFilterName("")
      }}
      className="mt-2 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
    >
      Clear product filter
    </button>
  )}
</div>

              {/* Sort */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                  Sort by
                </p>
                <div className="flex flex-col gap-1">
                  {(["newest", "highest", "lowest"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        sort === s
                          ? "bg-[var(--color-brand-primary)] text-white"
                          : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-cream)]"
                      }`}
                    >
                      {s === "newest" ? "Newest first" : s === "highest" ? "Highest rated" : "Lowest rated"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Reviews grid ── */}
          <div className="flex-1 min-w-0">

            {/* Result count */}
            <div className="flex items-center justify-between mb-6">
             <p className="text-sm text-[var(--color-text-muted)]">
              {ratingFilter && productFilter
                ? `Showing ${total} × ${ratingFilter}-star reviews for this product`
                : ratingFilter
                ? `Showing ${total} × ${ratingFilter}-star reviews`
                : productFilter
                ? `Showing ${total} reviews for this product`
                : `Showing all ${total} reviews`}
            </p>
            </div>

           {loading ? (
  <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-2xl bg-white border border-[var(--color-border)] p-5 animate-pulse mb-4 break-inside-avoid">
        <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
      </div>
    ))}
  </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-20">
                <Star size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-[var(--color-text-muted)]">
                  {productFilter
                    ? `No reviews found for "${productFilterName}".`
                    : ratingFilter
                    ? `No ${ratingFilter}-star reviews found.`
                    : "No reviews found."}
                </p>
                {(productFilter || ratingFilter) && (
                  <button
                    onClick={() => {
                      setProductFilter(null)
                      setProductFilterName("")
                      setRatingFilter(null)
                    }}
                    className="mt-3 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-[var(--color-border)] disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-[var(--color-text-muted)]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                          page === p
                            ? "bg-[var(--color-brand-primary)] text-white"
                            : "border border-[var(--color-border)] hover:bg-white"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl border border-[var(--color-border)] disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}