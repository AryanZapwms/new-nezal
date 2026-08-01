"use client"

/**
 * All Rituals index page — /rituals
 *
 * Shows the full list of admin-managed rituals as image cards,
 * same visual style as the homepage "Discover Your Perfect Ritual"
 * preview, just without the cap. Mirrors app/concerns/page.tsx.
 */
import React from "react";
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight, Home, Sparkles } from "lucide-react"

interface RitualCard {
  name: string
  slug: string
  tagline: string
  heroImage: string
  color: string
  sortOrder?: number
}

function RitualsSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdfaf5" }}>
      <div className="container-nezal py-12">
        <div className="h-8 w-64 bg-gray-100 rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AllRitualsPage() {
  const [rituals, setRituals] = useState<RitualCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch("/api/rituals")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        // API already returns rituals sorted by sortOrder, so no
        // client-side reordering is needed here (unlike concerns).
        if (mounted) setRituals(data.rituals || [])
      } catch {
        if (mounted) setRituals([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <RitualsSkeleton />

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#fdfaf5" }}>

      {/* ── Header ── */}
<section className="border-b border-[var(--color-border)] bg-gradient-to-b from-[#faf9f5] to-white">
  <div className="container-nezal py-14 md:py-20">

    {/* Breadcrumb */}
    <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-8">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-[var(--color-brand-primary)] transition-colors"
      >
        <Home size={13} />
        Home
      </Link>
      <ChevronRight size={13} />
      <span className="font-medium text-[var(--color-text-heading)]">
        Rituals
      </span>
    </nav>

    <div className="max-w-4xl">

      {/* Eyebrow */}
      <span className="inline-flex items-center rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
        ✨ Our Signature Rituals
      </span>

      {/* Heading */}
      <h1
        className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-tight"
        style={{ color: "#1e3a28" }}
      >
        Four Steps.
        <br />
        <span className="text-[var(--color-brand-primary)]">
          One Complete Ritual.
        </span>
      </h1>

      {/* Description */}
      <p
        className="mt-6 max-w-2xl text-base md:text-lg leading-8"
        style={{ color: "#6b7c70" }}
      >
        Every ritual is thoughtfully curated with products that work
        together—guiding your skin through cleansing, treatment,
        nourishment, and long-term renewal.
      </p>

      {/* Steps */}
      <div className="mt-10 flex flex-wrap items-center gap-3 md:gap-4">

        {[
          "Cleanse",
          "Treat",
          "Nourish",
          "Renew & Maintain",
        ].map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-3 rounded-full border border-[#E7E5DD] bg-white px-5 py-3 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-xs font-bold text-white">
                {index + 1}
              </span>

              <span
                className="font-medium"
                style={{ color: "#1e3a28" }}
              >
                {step}
              </span>
            </div>

            {index < 3 && (
              <span className="hidden md:block text-[#C7B89C] text-xl">
                →
              </span>
            )}
          </React.Fragment>
        ))}

      </div>

      {/* Footer text */}
      <p
        className="mt-8 text-sm md:text-base"
        style={{ color: "#7b847d" }}
      >
        Designed to simplify your skincare routine while helping your skin
        look healthier, balanced, and naturally radiant.
      </p>

    </div>
  </div>
</section>

      {/* ── Grid ── */}
      <section className="container-nezal py-12">
        {rituals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Sparkles size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">
              No rituals have been added yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
            {rituals.map((ritual) => (
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
                    <div className="flex h-full items-center justify-center text-xs text-gray-400 px-2 text-center">
                      Add image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        )}
      </section>

    </main>
  )
}