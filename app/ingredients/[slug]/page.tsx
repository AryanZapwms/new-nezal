"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronRight, Leaf, Home, CheckCircle2, Sparkles, FlaskConical } from "lucide-react"
import ProductCard from "@/components/product-card"
import Image from "next/image"
import { INGREDIENT_DATA, getIngredientLabel } from "@/lib/ingredient-data"

/* ─── Types ──────────────────────────────────────────────── */

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
  isBestSeller?: boolean
  sizes?: { size: string; unit: string; quantity: number; price: number; discountPrice?: number; stock: number }[]
  stock?: number
  company: { name: string; slug: string }
}

/* ─── Skeleton ───────────────────────────────────────────── */

function IngredientSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-64 bg-neutral-100" />
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <div className="h-6 w-48 bg-neutral-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-neutral-100 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function IngredientPage() {
  const params = useParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const info = INGREDIENT_DATA[slug]
  const label = getIngredientLabel(slug)

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/ingredients/${slug}`)
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        setProducts(data.products ?? [])
        if ((data.products ?? []).length === 0) setNotFound(true)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) return <IngredientSkeleton />

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

     {/* ── Hero ── */}
<section style={{ backgroundColor: "#F3F5EF" }} className="border-b border-[var(--color-border)]">
  <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
    <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
      <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
        <Home size={13} /> Home
      </Link>
      <ChevronRight size={13} />
      <span>Ingredient</span>
      <ChevronRight size={13} />
      <span className="text-[var(--color-text-heading)] font-medium">{label}</span>
    </nav>

      <div>
    <div className="flex flex-col md:flex-row md:items-start gap-8">

      {/* Left — text */}
      <div className="flex flex-col gap-3 flex-1 max-w-2xl">
        <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
          <Leaf size={13} /> {info?.category || "Ingredient"}
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-heading)] leading-tight">
          {label}
        </h1>
        {info?.tagline && (
          <p className="text-lg font-medium italic text-[var(--color-brand-primary)]">
            {info.tagline}
          </p>
        )}
        {info?.description && (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            {info.description}
          </p>
        )}

        {/* Did You Know — shows below text on mobile */}
        {info?.didYouKnow && (
          <div className="md:hidden mt-2 bg-white rounded-2xl border-3 border-[var(--color-border)] p-4 ">
            <div className="flex items-center gap-2 mb-2 ">
              <Sparkles size={15} className="text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Did you know?</p>
            </div>
            <p className="text-sm text-[var(--color-text-body)] leading-relaxed">{info.didYouKnow}</p>
          </div>
        )}
      </div>

      {/* Right — image + did you know */}
      <div className="flex flex-col gap-4 md:w-80 flex-shrink-0 ">

        {/* Ingredient image */}
        <div className="relative w-full h-56 md:h-64 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white">
          <Image
            src={`/ingredients/${slug === "bhringraj" ? "bringraj" : slug}.${
              ["turmeric", "vitamin-c", "tulsi", "shea-butter", "rose", "bringraj"].includes(
                slug === "bhringraj" ? "bringraj" : slug
              ) ? "webp"
              : slug === "tea-tree" ? "png"
              : "jpg"
            }`}
            alt={label}
            fill
            className="object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.jpg"
            }}
          />
          {/* subtle green tint overlay */}
          <div className="absolute inset-0 bg-[#1e3a28]/5" />
        </div>

        
      </div>
  </div>

      {/* Did You Know — desktop */}
          {info?.didYouKnow && (
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--color-border)] p-4 mt-8 ">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-amber-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Did you know?</p>
              </div>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">{info.didYouKnow}</p>
            </div>
          )}
      

    </div>
  </div>
</section>

      {/* ── Benefits + Helps Address ── */}
      {info && (
        <section className="border-b border-[var(--color-border)] bg-white">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Key Benefits */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical size={18} className="text-[var(--color-brand-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-heading)] uppercase tracking-widest">
                    Key Benefits
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {info.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-[var(--color-brand-primary)] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[var(--color-text-body)]">{b}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Helps Address */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf size={18} className="text-[var(--color-brand-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-heading)] uppercase tracking-widest">
                    Helps Address
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {info.helpsAddress.map((h, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border"
                      style={{ backgroundColor: "#f0f7f0", borderColor: "#c8dac9", color: "#1e3a28" }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Products ── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
            Products with {label}
          </h2>
          <span className="text-sm text-[var(--color-text-muted)]">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {notFound || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">No products found with this ingredient yet.</p>
            <Link href="/shop" className="text-[var(--color-brand-primary)] font-semibold hover:underline">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                id={product._id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                discountPrice={product.discountPrice}
                salePercentage={product.flashSale?.discountPercent ?? product.salePercentage}
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
                isBestSeller={product.isBestSeller}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}