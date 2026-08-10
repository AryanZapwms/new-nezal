// components/hero-products.tsx
"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { ChevronLeft, ChevronRight, ArrowRight, Loader2, Star, Flame, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"

interface HeroProductEntry {
  _id: string
  productId: {
    _id: string
    name: string
    price: number
    discountPrice?: number
    image?: string
    flashSale?: { discountPercent: number } | null
    company: { _id: string; name: string; slug: string }
    // ── New optional fields — card degrades gracefully if any are missing ──
    rating?: number
    reviewCount?: number
    /** e.g. "250ml", "100g", "Pack of 3" */
    sizeLabel?: string
    isBestSeller?: boolean
    keyIngredients?: string[]
    stock?: number
  }
}

const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24
const CACHE_KEY = "heroProducts:global"

async function fetchHeroProductsAPI() {
  const res = await fetch(`/api/hero-products`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch hero products`)
  const json = await res.json()
  return { heroProducts: Array.isArray(json?.heroProducts) ? json.heroProducts : [] }
}

export function invalidateHeroProductsCache() {
  invalidateCache(CACHE_KEY)
}

export function HeroProducts() {
  const router = useRouter()
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialData = useMemo(
    () => getCachedSync<{ heroProducts: any[] }>(CACHE_KEY, MAX_AGE),
    []
  )

  const [products, setProducts] = useState<HeroProductEntry[]>([])
  const [loading, setLoading] = useState(!initialData)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await fetchWithCache<{ heroProducts: any[] }>(
          CACHE_KEY,
          fetchHeroProductsAPI,
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        if (Array.isArray(data.heroProducts) && data.heroProducts.length > 0) {
          setProducts(
            data.heroProducts
              .map((item: any) => {
                const product = item.productId
                if (!product || !product.company) return null
                return { _id: item._id, productId: product }
              })
              .filter(Boolean) as HeroProductEntry[]
          )
        } else {
          setProducts([])
        }
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const updateScrollButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const cardW = el.querySelector("[data-card]")?.clientWidth ?? 260
    el.scrollBy({ left: dir === "left" ? -(cardW + 20) : cardW + 20, behavior: "smooth" })
  }

  if (!loading && products.length === 0) return null

  const goTo = (p: HeroProductEntry) => {
    if (navigatingId) return // avoid double-clicks firing multiple navigations
    setNavigatingId(p._id)
    router.push(`/shop/${p.productId.company.slug}/product/${p.productId._id}`)
  }

  const discount = (p: HeroProductEntry) => {
    if (p.productId.flashSale?.discountPercent) return p.productId.flashSale.discountPercent
    return p.productId.discountPrice && p.productId.discountPrice < p.productId.price
      ? Math.round(((p.productId.price - p.productId.discountPrice) / p.productId.price) * 100)
      : null
  }

  const handleAddToCart = (e: React.MouseEvent, p: HeroProductEntry) => {
    e.stopPropagation()
    if (p.productId.stock === undefined || p.productId.stock < 1) return

    setAddingId(p._id)
    addItem({
      productId: p.productId._id,
      name: p.productId.name,
      price: p.productId.price,
      discountPrice: p.productId.discountPrice,
      image: p.productId.image,
      quantity: 1,
      company: p.productId.company,
      flashSale: p.productId.flashSale,
    })
    toast({ title: "Added to cart", description: `${p.productId.name} added.` })
    setTimeout(() => setAddingId(null), 700)
  }

  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#f7f5f0" }}>
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: "linear-gradient(to right, #c8a96e, #e8cf9e, #c8a96e)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-14">
        {/* ── Header row ── */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
              style={{ background: "#fbf3e4", color: "#a17f34" }}
            >
              Handpicked For You
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold leading-tight"
              style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
            >
              Best Sellers
            </h2>
            <p className="text-sm mt-3" style={{ color: "#6b7c6b" }}>
              The products our customers can't stop talking about
            </p>
          </div>

          {/* Scroll controls */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
              style={{ background: "#fff", border: "1.5px solid #e5ddd0", color: "#1a3a2a", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
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

        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl overflow-hidden animate-pulse"
                style={{ width: 260, height: 420, background: "#e8e4d8" }}
              />
            ))}
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              onScroll={updateScrollButtons}
              className="flex gap-5 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              <style>{`[data-hero-scroll]::-webkit-scrollbar { display: none; }`}</style>

              {products.map((p) => {
                const disc = discount(p)
                const price = p.productId.price
                const finalPrice = p.productId.discountPrice ?? price
                const isOutOfStock = p.productId.stock === undefined || p.productId.stock < 1
                const ingredients = (p.productId.keyIngredients ?? []).slice(0, 2)

                return (
                  <div
                    key={p._id}
                    data-card
                    className="flex-shrink-0 group cursor-pointer"
                    style={{ width: "clamp(210px, 25vw, 270px)" }}
                    onClick={() => goTo(p)}
                  >
                    <div
                      className="relative rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 flex flex-col h-full"
                      style={{
                        background: "#fff",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        border: "1px solid #eee6d8",
                        opacity: navigatingId && navigatingId !== p._id ? 0.5 : 1,
                        pointerEvents: navigatingId ? "none" : "auto",
                      }}
                    >
                      {navigatingId === p._id && (
                        <div
                          className="absolute inset-0 z-10 flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.7)" }}
                        >
                          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1a3a2a" }} />
                        </div>
                      )}

                      {/* ── IMAGE ── */}
                      <div
                        className="relative overflow-hidden"
                        style={{ height: "clamp(180px, 20vw, 230px)", background: "#f2ede0" }}
                      >
                        {/* Best Seller ribbon — top-left corner */}
                        {p.productId.isBestSeller && (
                          <div className="absolute -left-9 top-3 z-10 w-32 -rotate-45 overflow-hidden">
                            <div
                              className="flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                              style={{ background: "#1a3a2a", color: "#e8cf9e" }}
                            >
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              Best Seller
                            </div>
                          </div>
                        )}

                        {/* Discount badge — top-right */}
                        {disc && (
                          <div
                            className="absolute top-3 right-3 z-10 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full"

                          >
                            -{disc}%
                          </div>
                        )}

                        <img
                          src={p.productId.image || "/nezallogo.jpg"}
                          alt={p.productId.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/nezallogo.jpg"
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: "linear-gradient(to top, rgba(26,46,26,0.15) 0%, transparent 55%)" }}
                        />
                      </div>

                      {/* ── CONTENT ── */}
                      <div className="p-4 flex flex-col flex-1 gap-1.5">
                        <h3
                          className="font-semibold text-sm leading-snug line-clamp-2 min-h-[36px]"
                          style={{ color: "#1a2e1a" }}
                        >
                          {p.productId.name}
                        </h3>

                        {/* Rating — hidden if no reviews */}
                        {typeof p.productId.rating === "number" &&
                          p.productId.reviewCount &&
                          p.productId.reviewCount > 0 && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-semibold" style={{ color: "#1a2e1a" }}>
                                {p.productId.rating.toFixed(1)}
                              </span>
                              <span style={{ color: "#9aaa9a" }}>({p.productId.reviewCount})</span>
                            </div>
                          )}

                        {/* Size + key ingredients */}
                        {(p.productId.sizeLabel || ingredients.length > 0) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.productId.sizeLabel && (
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                                style={{ background: "#f2ede0", color: "#6b7c6b" }}
                              >
                                {p.productId.sizeLabel}
                              </span>
                            )}
                            {ingredients.map((ing) => (
                              <span
                                key={ing}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                                style={{ background: "#fbf3e4", color: "#a17f34" }}
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price */}
                        {price > 0 && (
                          <div className="flex items-baseline gap-2 pt-0.5">
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
                          onClick={(e) => handleAddToCart(e, p)}
                          disabled={isOutOfStock}
                          className="mt-auto w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ background: isOutOfStock ? "#c9cfc9" : "#1a3a2a", color: "#fff" }}
                          onMouseEnter={(e) => {
                            if (!isOutOfStock) (e.currentTarget as HTMLButtonElement).style.background = "#2d6a4f"
                          }}
                          onMouseLeave={(e) => {
                            if (!isOutOfStock) (e.currentTarget as HTMLButtonElement).style.background = "#1a3a2a"
                          }}
                        >
                          {addingId === p._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isOutOfStock ? (
                            "Out of Stock"
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Add to Cart
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-sm mt-4 sm:hidden" style={{ color: "#067106" }}>
              ← ← Swipe to explore → →
            </p>
          </>
        )}
      </div>
    </section>
  )
}