// components/new-arrivals.tsx
"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"

interface NewArrivalProduct {
  _id: string
  productId: {
    _id: string
    name: string
    price: number
    discountPrice?: number
    flashSale?: {
      saleId: string
      saleName: string
      discountPercent: number
      endsAt: string
    } | null
  }
  title: string
  image: string
  description?: string
  company: { _id: string; name: string; slug: string }
}

interface NewArrivalsProps {
  companyId: string
  companySlug: string
  companyName: string
}

const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24





function getCacheKey(companyId: string) { return `newArrivals:${companyId}` }

async function fetchNewArrivalsAPI(companyId: string) {
  const res = await fetch(`/api/companies/${companyId}/new-arrivals`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch new arrivals`)
  const json = await res.json()
  return {
    newArrivals: Array.isArray(json?.newArrivals) ? json.newArrivals : Array.isArray(json) ? json : json?.data ?? [],
    settings: json?.settings ?? {},
  }
}

export function invalidateNewArrivalsCache(companyId?: string) {
  if (companyId) invalidateCache(getCacheKey(companyId))
  else invalidateCache("newArrivals:")
}

export function NewArrivals({ companyId, companySlug, companyName }: NewArrivalsProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const cacheKey = getCacheKey(companyId)
  const initialData = useMemo(() => getCachedSync<{ newArrivals: any[]; settings?: any }>(cacheKey, MAX_AGE), [cacheKey])

  const [products, setProducts] = useState<NewArrivalProduct[]>([])
  const [isVisible, setIsVisible] = useState(initialData?.settings?.isVisible ?? true)
  const [loading, setLoading] = useState(!initialData)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!companyId) { setProducts([]); setIsVisible(false); setLoading(false); return }
      setLoading(true)
      try {
        const data = await fetchWithCache<{ newArrivals: any[]; settings?: any }>(
          cacheKey, () => fetchNewArrivalsAPI(companyId),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setIsVisible(data?.settings?.isVisible ?? true)
        if (Array.isArray(data.newArrivals) && data.newArrivals.length > 0) {
          setProducts(
            data.newArrivals.map((arrival: any) => {
              const product = arrival.productId || arrival.product
              if (!product) return null
              return {
                _id: arrival._id || `${companyId}-${product._id}`,
                productId: {
  _id: product._id,
  name: product.name || "Product",
  price: product.price ?? 0,
  discountPrice: product.discountPrice,
  flashSale: product.flashSale ?? null,
},
                title: arrival.title || product.name || "New Arrival",
                image: arrival.image || product.image || "/nezallogo.jpg",
                description: arrival.description || "",
                company: { _id: companyId, name: companyName, slug: companySlug },
              }
            }).filter(Boolean) as NewArrivalProduct[]
          )
        }
      } catch { if (mounted) setProducts([]) }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [companyId, companySlug, companyName, cacheKey])

  const updateScrollButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const cardW = el.querySelector("[data-card]")?.clientWidth ?? 320
    el.scrollBy({ left: dir === "left" ? -(cardW + 20) : cardW + 20, behavior: "smooth" })
  }

  if (!isVisible || products.length === 0) return null

  const discount = (p: NewArrivalProduct) =>
    p.productId.discountPrice && p.productId.discountPrice < p.productId.price
      ? Math.round(((p.productId.price - p.productId.discountPrice) / p.productId.price) * 100)
      : null

  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#f7f5f0" }}>

      {/* ── Decorative leaf strip ── */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: "linear-gradient(to right, #2d6a4f, #52b788, #2d6a4f)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-14">

        {/* ── Header row ── */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
              style={{ background: "#e8f4ec", color: "#2d6a4f" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "#2d6a4f", animation: "pulse 2s infinite" }}
              />
              Fresh Drops
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold leading-tight"
              style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
            >
              New{" "}
              <span
                className="relative inline-block"
                style={{ color: "#2d6a4f" }}
              >
                Arrivals
                {/* underline squiggle */}
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="6" viewBox="0 0 200 6" fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M0 4 Q25 1 50 4 Q75 7 100 4 Q125 1 150 4 Q175 7 200 4"
                    stroke="#c8a96e" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            <p className="text-sm mt-3" style={{ color: "#6b7c6b" }}>
              The latest from {companyName} — be the first to try
            </p>
          </div>

          {/* Scroll controls */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              style={{ background: "#fff", border: "1.5px solid #d4e4d4", color: "#1a3a2a", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              style={{ background: "#1a3a2a", border: "1.5px solid #1a3a2a", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Loading skeletons ── */}
        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl overflow-hidden animate-pulse"
                style={{ width: 280, height: 380, background: "#e8e8e4" }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* ── Horizontal scroll track ── */}
            <div
              ref={scrollRef}
              onScroll={updateScrollButtons}
              className="flex gap-5 overflow-x-auto pb-2"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <style>{`
                [data-scroll-track]::-webkit-scrollbar { display: none; }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
              `}</style>

              {products.map((product, idx) => {
                const disc = discount(product)
                const price = product.productId.price
                const finalPrice = product.productId.discountPrice ?? price

                return (
                  <div
                    key={product._id}
                    data-card
                    className="flex-shrink-0 group cursor-pointer"
                    style={{ width: "clamp(220px, 28vw, 300px)" }}
                    onClick={() => router.push(`/shop/${product.company.slug}/product/${product.productId._id}`)}
                  >
                    {/* Card */}
                    <div
                      className="relative rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
                      style={{
                        background: "#fff",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        border: "1px solid #eaf0ea",
                      }}
                    >
                      {/* Image area */}
                      <div
                        className="relative overflow-hidden"
                        style={{ height: "clamp(180px, 22vw, 240px)", background: "#f0f5f0" }}
                      >
                        <img
                          src={product.image || "/nezallogo.jpg"}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-107"
                          style={{ transform: "scale(1)" }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                          onError={e => { (e.target as HTMLImageElement).src = "/nezallogo.jpg" }}
                        />

                        {/* NEW badge */}
<div
  className="absolute top-3 left-3 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
  style={{ background: "#2d6a4f" }}
>
  NEW
</div>

{/* Flash sale badge takes priority over the plain discount badge */}
{product.productId.flashSale ? (
  <div
    className="absolute top-3 right-3 text-white text-[10px] font-bold px-2 py-1 rounded-full"
    style={{ background: "#E4432B" }}
  >
    ⚡ Sale
  </div>
) : disc ? (
  <div
    className="absolute top-3 right-3 text-white text-[10px] font-bold px-2 py-1 rounded-full"
    style={{ background: "#c8a96e" }}
  >
    -{disc}%
  </div>
) : null}

                        {/* Discount badge */}
                        {disc && (
                          <div
                            className="absolute top-3 right-3 text-white text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{ background: "#c8a96e" }}
                          >
                            -{disc}%
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: "linear-gradient(to top, rgba(26,46,26,0.18) 0%, transparent 60%)" }}
                        />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3
                          className="font-semibold text-sm leading-snug mb-1 line-clamp-2"
                          style={{ color: "#1a2e1a" }}
                        >
                          {product.title}
                        </h3>

                        {product.description && (
                          <p
                            className="text-xs line-clamp-2 mb-3"
                            style={{ color: "#7a8c7a" }}
                          >
                            {product.description}
                          </p>
                        )}

                        {/* Price row */}
                        {price > 0 && (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-bold text-base" style={{ color: "#1a2e1a" }}>
                              ₹{finalPrice}
                            </span>
                            {disc && (
                              <span className="text-xs line-through" style={{ color: "#aaa" }}>
                                ₹{price}
                              </span>
                            )}
                          </div>
                        )}

                        {/* CTA */}
                        <button
                          className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200 group/btn"
                          style={{ background: "#1a3a2a", color: "#fff" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = "#2d6a4f"
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = "#1a3a2a"
                          }}
                        >
                          Shop Now
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Index dot */}
                    <div className="flex justify-center mt-3">
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: idx === 0 ? "#2d6a4f" : "#d4ddd4" }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* ── View all card ── */}
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{
                  width: "clamp(160px, 18vw, 200px)",
                  minHeight: "clamp(180px, 22vw, 240px)",
                  background: "#1a3a2a",
                  border: "1px solid #1a3a2a",
                }}
                onClick={() => router.push(`/shop/${companySlug}`)}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div className="text-center px-4">
                  <p className="text-white font-semibold text-sm">View All</p>
                  <p className="text-white/60 text-xs mt-0.5">Products</p>
                </div>
              </div>
            </div>

            {/* ── Mobile scroll hint ── */}
            <p
              className="text-center text-xs mt-4 sm:hidden"
              style={{ color: "#9aaa9a" }}
            >
              ← Swipe to explore →
            </p>
          </>
        )}
      </div>
    </section>
  )
}