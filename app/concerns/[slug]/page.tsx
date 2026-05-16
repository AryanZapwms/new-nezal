"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ChevronRight, Leaf, Home, ArrowRight } from "lucide-react"
import ProductCard from "@/components/product-card"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyIngredient {
  name: string
  benefit: string
}

interface Product {
  _id: string
  name: string
  slug: string
  price: number
  discountPrice?: number
  image?: string
  images?: string[]
  variantLabel?: string
  skinTypes?: string[]
  concerns?: string[]
  keyIngredients?: KeyIngredient[]
  collectionSlug?: string
  sizes?: {
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
    stock: number
  }[]
  stock?: number
  company: { name: string; slug: string }
}

interface RelatedCollection {
  _id: string
  name: string
  slug: string
  tagline: string
  heroImage?: string
  navCategory: string
}

// ─── Concern meta ─────────────────────────────────────────────────────────────

const CONCERN_META: Record<string, {
  label: string
  headline: string
  subheadline: string
  description: string
  color: string
}> = {
  acne: {
    label: "Acne",
    headline: "Clear Skin Starts Here",
    subheadline: "Targeted herbal formulas that fight acne at the root — without stripping your skin.",
    description: "Acne-prone skin needs active but gentle care. Our botanically-powered formulas combine tea tree, neem and salicylic acid to control sebum, clear pores and prevent future breakouts — while keeping your skin barrier healthy.",
    color: "#E8F5E9",
  },
  pigmentation: {
    label: "Pigmentation",
    headline: "Reveal Your Even Skin Tone",
    subheadline: "Brightening actives that fade dark spots and restore radiance naturally.",
    description: "Pigmentation, dark spots and uneven tone are among the most common skin concerns in India. Our vitamin C, niacinamide and turmeric-powered formulas work to inhibit melanin production and gradually restore an even, luminous complexion.",
    color: "#FFF8E1",
  },
  "open-pores": {
    label: "Open Pores",
    headline: "Refine. Minimize. Glow.",
    subheadline: "Pore-tightening actives that keep your skin smooth and clear.",
    description: "Enlarged pores are often caused by excess sebum, dead skin buildup and loss of skin elasticity. Our niacinamide and salicylic acid formulations work to deeply cleanse, tighten and visibly minimize pores with regular use.",
    color: "#F3F5EF",
  },
  hydration: {
    label: "Hydration",
    headline: "Drink Deep. Glow Long.",
    subheadline: "Hyaluronic acid and botanical humectants for skin that stays plump all day.",
    description: "Dehydrated skin looks dull, feels tight and ages faster. Our hyaluronic acid and aloe vera-rich formulas attract and lock in moisture at multiple skin layers — restoring plumpness, suppleness and that healthy glow.",
    color: "#E3F2FD",
  },
  hairfall: {
    label: "Hair Fall",
    headline: "Stop the Fall. Start the Growth.",
    subheadline: "Bhringraj, biotin and onion oil — Ayurvedic actives for stronger, fuller hair.",
    description: "Hair fall can be triggered by stress, nutrient deficiency or scalp imbalance. Our Ayurvedic-inspired hair care range combines bhringraj, onion oil and biotin to nourish follicles, improve scalp circulation and visibly reduce hair fall.",
    color: "#FCE4EC",
  },
  dryness: {
    label: "Dryness",
    headline: "Nourish From Within.",
    subheadline: "Rich botanical oils and butters that restore your skin's natural moisture barrier.",
    description: "Dry skin needs more than surface hydration — it needs barrier repair. Our shea butter, almond oil and ceramide-rich formulas penetrate deep to restore lipid balance, reduce flakiness and leave skin soft and supple.",
    color: "#FFF3E0",
  },
}

const DEFAULT_META = {
  label: "Concern",
  headline: "Products for Your Concern",
  subheadline: "Herbal formulas curated for your specific skin need.",
  description: "Explore our range of herbal products curated for this concern.",
  color: "#FAF7F2",
}

const CATEGORY_LABELS: Record<string, string> = {
  "face-care": "Face Care",
  "body-care": "Body Care",
  "hair-care": "Hair Care",
  "gift-kits": "Gift Kits",
}

function toLabel(slug: string) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Related Collection Card ──────────────────────────────────────────────────

function RelatedCollectionCard({ col }: { col: RelatedCollection }) {
  return (
    <Link
      href={`/collections/${col.slug}`}
      className="group flex flex-col gap-4 p-5 rounded-2xl bg-white border border-[var(--color-border)] hover:shadow-md hover:border-[var(--color-brand-primary)]/30 transition-all"
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-cream)] relative">
        {col.heroImage ? (
          <Image src={col.heroImage} alt={col.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Leaf size={28} className="text-[var(--color-brand-primary)]/30" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-primary)]">
          {CATEGORY_LABELS[col.navCategory] ?? toLabel(col.navCategory)}
        </span>
        <h3 className="font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-brand-primary)] transition-colors">
          {col.name}
        </h3>
        {col.tagline && (
          <p className="text-sm text-[var(--color-text-muted)]">{col.tagline}</p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] group-hover:gap-2 transition-all mt-auto">
        Explore <ArrowRight size={13} />
      </span>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConcernSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] animate-pulse">
      <div className="h-64 bg-neutral-100" />
      <div className="container-nezal py-12 flex flex-col gap-6">
        <div className="h-6 w-48 bg-neutral-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConcernPage() {
  const params = useParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<RelatedCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const meta = CONCERN_META[slug] ?? DEFAULT_META

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/concerns/${slug}`)
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        setProducts(data.products ?? [])
        setCollections(data.collections ?? [])
        if ((data.products ?? []).length === 0 && (data.collections ?? []).length === 0) {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) return <ConcernSkeleton />

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

      {/* ── Hero ── */}
      <section style={{ backgroundColor: meta.color }} className="border-b border-[var(--color-border)]">
        <div className="container-nezal py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
              <Home size={13} /> Home
            </Link>
            <ChevronRight size={13} />
            <Link href="/concerns" className="hover:text-[var(--color-brand-primary)]">
              Concerns
            </Link>
            <ChevronRight size={13} />
            <span className="text-[var(--color-text-heading)] font-medium">{meta.label}</span>
          </nav>

          <div className="flex flex-col gap-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
              <Leaf size={13} /> Skin Concern
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-heading)] leading-tight">
              {meta.headline}
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
              {meta.subheadline}
            </p>
            <p className="text-sm text-[var(--color-text-body)] leading-relaxed max-w-xl">
              {meta.description}
            </p>
            {!notFound && (
              <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                {products.length} product{products.length !== 1 ? "s" : ""} for {meta.label}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Recommended Collections ── */}
      {collections.length > 0 && (
        <section className="bg-white border-b border-[var(--color-border)]">
          <div className="container-nezal py-10">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-heading)]">
                  Collections for {meta.label}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Explore our full ranges specifically crafted for this concern.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {collections.map((col) => (
                  <RelatedCollectionCard key={col._id} col={col} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Products ── */}
      <section className="container-nezal py-12">
        {notFound || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">
              No products found for this concern yet.
            </p>
            <Link
              href="/shop"
              className="text-[var(--color-brand-primary)] font-semibold hover:underline"
            >
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
              All Products for {meta.label}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((product) => (
                <div key={product._id}>
                  <ProductCard
                    id={product._id}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    discountPrice={product.discountPrice}
                    image={product.image}
                    images={product.images}
                    variantLabel={product.variantLabel}
                    skinTypes={product.skinTypes}
                    concerns={product.concerns}
                    keyIngredients={product.keyIngredients}
                    company={product.company}
                    hasMultipleSizes={!!product.sizes?.length}
                    sizes={product.sizes as any}
                    stock={product.stock}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Other Concerns ── */}
      <section className="bg-[var(--color-bg-cream)] border-t border-[var(--color-border)]">
        <div className="container-nezal py-10">
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-[var(--color-text-heading)]">
              Explore Other Concerns
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CONCERN_META)
                .filter(([s]) => s !== slug)
                .map(([s, m]) => (
                  <Link
                    key={s}
                    href={`/concerns/${s}`}
                    className="px-4 py-2 rounded-full border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-heading)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
                  >
                    {m.label}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}