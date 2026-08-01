"use client"

/**
 * DiscoverRituals
 *
 * Homepage section: "Discover Your Perfect Ritual" — fetches active
 * rituals from /api/rituals and renders a preview (first 6) as image
 * cards linking to /rituals/[slug]. A "See All Rituals" button links
 * to the full /rituals index page. Mirrors ShopByConcern's pattern.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface RitualCard {
  name: string
  slug: string
  tagline: string
  heroImage: string
  color: string
}

const HOMEPAGE_PREVIEW_COUNT = 6

export function DiscoverRituals() {
  const [rituals, setRituals] = useState<RitualCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch("/api/rituals")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        const list: RitualCard[] = data.rituals || []

        // API already returns rituals sorted by sortOrder, so we just
        // slice the first N for the homepage preview.
        if (mounted) {
          setTotalCount(list.length)
          setRituals(list.slice(0, HOMEPAGE_PREVIEW_COUNT))
        }
      } catch {
        if (mounted) {
          setRituals([])
          setTotalCount(0)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!loading && rituals.length === 0) return null

  const hasMore = totalCount > HOMEPAGE_PREVIEW_COUNT

  return (
    <section className="py-12 md:py-6" style={{ backgroundColor: "#ffffff" }}>
      <div className="container-nezal">

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-xs font-bold uppercase tracking-widest">
            Our Signature Rituals, Curated For You
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: "#1e3a28" }}>
            Discover Your Perfect Ritual
          </h2>
          <p className="text-sm md:text-base max-w-lg" style={{ color: "#6b7c70" }}>
            Step-by-step routines, curated product sets — designed around how you actually want to feel.
          </p>
          
        </div>

        {/* Ritual grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {loading
            ? [...Array(HOMEPAGE_PREVIEW_COUNT)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
              ))
            : rituals.map((ritual) => (
                <Link
                  key={ritual.slug}
                  href={`/rituals/${ritual.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--color-border)", backgroundColor: ritual.color || "#F3F5EF" }}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                    {ritual.heroImage ? (
                      <img
                        src={ritual.heroImage}
                        alt={ritual.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        Add image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
                    <span className="text-sm font-bold" style={{ color: "#1e3a28" }}>
                      {ritual.name}
                    </span>
                    {ritual.tagline && (
                      <span className="text-xs leading-snug" style={{ color: "#6b7c70" }}>
                        {ritual.tagline}
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 mt-1"
                      style={{ color: "#2a5c3a" }}
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
        </div>

        {/* See More */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-10">
            <Link
              href="/rituals"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:gap-3"
              style={{ backgroundColor: "#1e3a28", color: "#fdfaf5" }}
            >
              See All Rituals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}

export default DiscoverRituals