"use client"

/**
 * ShopByConcern
 *
 * Homepage section. Fetches active concerns from /api/concerns and
 * renders a preview (first 8) as image cards linking to /concerns/[slug].
 * A "See All Concerns" button links to the full /concerns index page.
 * Concerns are fully admin-manageable via /admin/concerns.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface ConcernCard {
  label: string
  slug: string
  heroImage: string
  color: string
  order?: number
  createdAt?: string
}

const HOMEPAGE_PREVIEW_COUNT = 6

export function ShopByConcern() {
  const [concerns, setConcerns] = useState<ConcernCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch("/api/concerns")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        const list: ConcernCard[] = data.concerns || []

        // The API currently returns concerns newest-first (e.g. sorted by
        // createdAt descending), which makes the grid render upside down —
        // the concern created first (Acne) ends up last instead of first.
        // If every item has an explicit `order` field, respect that;
        // otherwise fall back to reversing so the oldest/first-created
        // concern shows first, matching the intended display order.
        const sorted = list.every((c) => typeof c.order === "number")
          ? [...list].sort((a, b) => (a.order as number) - (b.order as number))
          : [...list].reverse()

        if (mounted) {
          setTotalCount(sorted.length)
          setConcerns(sorted.slice(0, HOMEPAGE_PREVIEW_COUNT))
        }
      } catch {
        if (mounted) {
          setConcerns([])
          setTotalCount(0)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!loading && concerns.length === 0) return null

  const hasMore = totalCount > HOMEPAGE_PREVIEW_COUNT

  return (
    <section className="py-12 md:py-6" style={{ backgroundColor: "#fdfaf5" }}>
      <div className="container-nezal">

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-xs font-bold uppercase tracking-widest">
            Shop By Concern
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: "#1e3a28" }}>
            Find What Your Skin Needs
          </h2>
          <p className="text-sm md:text-base max-w-lg" style={{ color: "#6b7c70" }}>
            Tell us your concern, we'll show you the right products — curated formulas for your specific skin and hair needs.
          </p>
        </div>

        {/* Concern grid — 2 cols mobile, 3 tablet, 5 desktop (fits 8 cleanly in 2 rows on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {loading
            ? [...Array(HOMEPAGE_PREVIEW_COUNT)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
              ))
            : concerns.map((concern) => (
                <Link
                  key={concern.slug}
                  href={`/concerns/${concern.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--color-border)", backgroundColor: concern.color || "#F3F5EF" }}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                    {concern.heroImage ? (
                      <img
                        src={concern.heroImage}
                        alt={concern.label}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400 px-2 text-center">
                        Add image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="flex flex-col items-center gap-1 px-2 py-3 text-center">
                    <span className="text-xs md:text-sm font-bold leading-tight" style={{ color: "#1e3a28" }}>
                      {concern.label}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ color: "#2a5c3a" }}
                    >
                      Shop now <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
        </div>

        {/* See More */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-10">
            <Link
              href="/concerns"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:gap-3"
              style={{ backgroundColor: "#1e3a28", color: "#fdfaf5" }}
            >
              See All Concerns <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}

export default ShopByConcern