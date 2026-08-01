"use client"

/**
 * All Concerns index page — /concerns
 *
 * Shows the full list of admin-managed concerns as image cards,
 * same visual style as the homepage "Shop By Concern" preview,
 * just without the 8-item cap.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight, Home, Leaf } from "lucide-react"

interface ConcernCard {
  label: string
  slug: string
  heroImage: string
  color: string
  order?: number
  createdAt?: string
}

function ConcernsSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdfaf5" }}>
      <div className="container-nezal py-12">
        <div className="h-8 w-64 bg-gray-100 rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AllConcernsPage() {
  const [concerns, setConcerns] = useState<ConcernCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch("/api/concerns")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        const list: ConcernCard[] = data.concerns || []

        // Same ordering fix as the homepage preview — respect an explicit
        // `order` field if present, otherwise reverse the newest-first
        // API response so the first-created concern shows first.
        const sorted = list.every((c) => typeof c.order === "number")
          ? [...list].sort((a, b) => (a.order as number) - (b.order as number))
          : [...list].reverse()

        if (mounted) setConcerns(sorted)
      } catch {
        if (mounted) setConcerns([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <ConcernsSkeleton />

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#fdfaf5" }}>

      {/* ── Header ── */}
      <section className="border-b border-[var(--color-border)]">
        <div className="container-nezal py-10 md:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
              <Home size={13} /> Home
            </Link>
            <ChevronRight size={13} />
            <span className="text-[var(--color-text-heading)] font-medium">Concerns</span>
          </nav>

          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-xs font-bold uppercase tracking-widest mb-3">
            Shop By Concern
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold" style={{ color: "#1e3a28" }}>
            All Skin &amp; Hair Concerns
          </h1>
          <p className="text-sm md:text-base max-w-lg mt-3" style={{ color: "#6b7c70" }}>
            Tell us your concern, we'll show you the right products — curated formulas for every skin and hair need.
          </p>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="container-nezal py-12">
        {concerns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">
              No concerns have been added yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
            {concerns.map((concern) => (
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
        )}
      </section>

    </main>
  )
}