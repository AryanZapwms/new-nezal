"use client"

/**
 * SearchBar
 *
 * Searches across THREE categories in one dropdown:
 *   - Products   → links to /shop/[company]/product/[id]
 *   - Concerns   → links to /concerns/[slug]
 *   - Ingredients → links to /ingredients/[slug] (filtered product list)
 *
 * Backed by GET /api/search?q=... which returns
 * { products: [...], concerns: [...], ingredients: [...] }
 */

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, X, Loader2, Sparkles, FlaskConical, Zap } from "lucide-react"

interface SearchResultProduct {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company?: { slug: string; name?: string }
  // Present when the product is currently part of an active flash sale —
  // see lib/flashSale.ts. Only used here to show the small "Sale" tag.
  flashSale?: { saleId: string; saleName: string; discountPercent: number; endsAt: string } | null
}

interface SearchResultConcern {
  label: string
  slug: string
}

interface SearchResultIngredient {
  name: string
  slug: string
}

interface SearchResponse {
  products: SearchResultProduct[]
  concerns: SearchResultConcern[]
  ingredients: SearchResultIngredient[]
}

const DEBOUNCE_MS = 300
const MIN_CHARS = 2

// Flat list of every navigable result, used for keyboard up/down + Enter
type FlatItem =
  | { kind: "product"; data: SearchResultProduct }
  | { kind: "concern"; data: SearchResultConcern }
  | { kind: "ingredient"; data: SearchResultIngredient }

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [response, setResponse] = useState<SearchResponse>({ products: [], concerns: [], ingredients: [] })
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < MIN_CHARS) {
      setResponse({ products: [], concerns: [], ingredients: [] })
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        if (!res.ok) throw new Error("Search failed")
        const data: SearchResponse = await res.json()
        setResponse({
          products: data.products || [],
          concerns: data.concerns || [],
          ingredients: data.ingredients || [],
        })
      } catch (err: any) {
        if (err?.name !== "AbortError") setResponse({ products: [], concerns: [], ingredients: [] })
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Flatten all groups into one ordered list for keyboard navigation
  const flatItems: FlatItem[] = [
    ...response.products.map((p) => ({ kind: "product" as const, data: p })),
    ...response.concerns.map((c) => ({ kind: "concern" as const, data: c })),
    ...response.ingredients.map((i) => ({ kind: "ingredient" as const, data: i })),
  ]

  const goToItem = useCallback((item: FlatItem) => {
    setOpen(false)
    setQuery("")
    if (item.kind === "product") {
      const companySlug = item.data.company?.slug || "shop"
      router.push(`/shop/${companySlug}/product/${item.data._id}`)
    } else if (item.kind === "concern") {
      router.push(`/concerns/${item.data.slug}`)
    } else {
      router.push(`/ingredients/${item.data.slug}`)
    }
  }, [router])

  const submitFullSearch = useCallback(() => {
    const trimmed = query.trim()
    if (!trimmed) return
    setOpen(false)
    router.push(`/shop?search=${encodeURIComponent(trimmed)}`)
    setQuery("")
  }, [query, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitFullSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, flatItems.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, -1))
      return
    }
    if (e.key === "Enter" && highlightedIndex >= 0 && flatItems[highlightedIndex]) {
      e.preventDefault()
      goToItem(flatItems[highlightedIndex])
    }
  }

  const showDropdown = open && query.trim().length >= MIN_CHARS
  const hasAnyResults = response.products.length + response.concerns.length + response.ingredients.length > 0

  // Helper to know the running flat-index offset for each group, for highlight matching
  let runningIndex = -1
  const nextIndex = () => ++runningIndex

  return (
    <div ref={containerRef} className="relative hidden md:block w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-3 rounded-full border-2 px-4 py-2.5 transition-all duration-200 bg-white"
          style={{
            borderColor: open ? "#2a5c3a" : "var(--color-border)",
            boxShadow: open ? "0 4px 20px rgba(42, 92, 58, 0.15)" : "none",
          }}
        >
          <Search
            className="h-5 w-5 shrink-0 transition-colors"
            style={{ color: open ? "#2a5c3a" : "var(--color-text-muted)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlightedIndex(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search Products, Concerns, Ingredients..."
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-gray-400"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#2a5c3a" }} />}
          {!loading && query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus() }}
              className="shrink-0 rounded-full p-0.5 hover:bg-gray-100 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-2xl"
          style={{ borderColor: "var(--color-border)" }}
        >
          {loading && !hasAnyResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!loading && !hasAnyResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results found for "{query}"
            </div>
          )}

          <div className="max-h-[460px] overflow-y-auto">

            {/* ── Products ── */}
            {response.products.length > 0 && (
              <div className="py-2">
                <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Products</p>
                {response.products.map((product) => {
                  const idx = nextIndex()
                  const displayPrice = product.discountPrice || product.price
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => goToItem({ kind: "product", data: product })}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ backgroundColor: isHighlighted ? "#f0f7f0" : "transparent" }}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
                        {product.image ? (
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-gray-400">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-[var(--color-text-heading)]">{product.name}</p>
                          {/* Small inline tag — a full ribbon is too heavy for a compact dropdown row */}
                          {product.flashSale && (
                            <span
                              className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white"
                              style={{ backgroundColor: "#E4432B" }}
                            >
                              <Zap className="h-2.5 w-2.5 fill-current" />
                              Sale
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold" style={{ color: "#1e3a28" }}>₹{displayPrice}</span>
                          {product.discountPrice && (
                            <span className="text-xs line-through text-gray-400">₹{product.price}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Concerns ── */}
            {response.concerns.length > 0 && (
              <div className="py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Shop by Concern</p>
                {response.concerns.map((concern) => {
                  const idx = nextIndex()
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={concern.slug}
                      type="button"
                      onClick={() => goToItem({ kind: "concern", data: concern })}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ backgroundColor: isHighlighted ? "#f0f7f0" : "transparent" }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#e0f0e4" }}>
                        <Sparkles className="h-4 w-4" style={{ color: "#2a5c3a" }} />
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text-heading)]">{concern.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Ingredients ── */}
            {response.ingredients.length > 0 && (
              <div className="py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Ingredients</p>
                {response.ingredients.map((ingredient) => {
                  const idx = nextIndex()
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={ingredient.slug}
                      type="button"
                      onClick={() => goToItem({ kind: "ingredient", data: ingredient })}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ backgroundColor: isHighlighted ? "#f0f7f0" : "transparent" }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#e0f0e4" }}>
                        <FlaskConical className="h-4 w-4" style={{ color: "#2a5c3a" }} />
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text-heading)]">{ingredient.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

          </div>

          {hasAnyResults && (
            <button
              type="button"
              onClick={submitFullSearch}
              className="block w-full border-t px-4 py-3 text-center text-sm font-semibold transition-colors hover:bg-[#f0f7f0]"
              style={{ borderColor: "var(--color-border)", color: "#2a5c3a" }}
            >
              View all results for "{query}" →
            </button>
          )}
        </div>
      )}
    </div>
  )
}