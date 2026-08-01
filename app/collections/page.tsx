// app/collections/page.tsx
"use client"

import React, { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { Leaf, ChevronRight, ArrowRight, Download } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Collection {
  _id: string
  name: string
  slug: string
  tagline: string
  heroImage?: string
  navCategory: string
  subCategory: string
  sortOrder: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_CATEGORIES = [
  { key: "all",       label: "All Collections" },
  { key: "face-care", label: "Face Care"        },
  { key: "body-care", label: "Body Care"        },
  { key: "hair-care", label: "Hair Care"        },
  { key: "gift-kits", label: "Gift Kits"        },
]

const CATEGORY_LABELS: Record<string, string> = {
  "face-care":   "Face Care",
  "body-care":   "Body Care",
  "hair-care":   "Hair Care",
  "gift-kits":   "Gift Kits",
  "soaps":       "Soaps",
  "bath-shower": "Bath & Shower",
  "massage-oil": "Massage Oil",
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "face-care":   "Serums, washes, moisturizers and scrubs — crafted for every skin story.",
  "body-care":   "Head-to-toe rituals that nourish, hydrate and restore.",
  "hair-care":   "Root-to-tip Ayurvedic care for stronger, healthier hair.",
  "gift-kits":   "Curated sets for the people you love.",
  "soaps":       "Handcrafted bar soaps with botanical extracts — for every skin type and mood.",
  "bath-shower": "Your daily cleanse, elevated.",
  "massage-oil": "Relaxation and skin nourishment in every drop.",
}

// Labels for sub-categories shown within Body Care
const SUBCATEGORY_LABELS: Record<string, string> = {
  "soaps":        "Soaps",
  "body-care":    "Body Care",
  "face-care":    "Face Care",
  "hair-care":    "Hair Care",
  "gift-kits":    "Gift Kits",
  "bath-shower":  "Bath & Shower",
  "massage-oil":  "Massage Oil",
}

const SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
  "soaps":       "Handcrafted bar soaps with botanical extracts — for every skin type and mood.",
  "body-care":   "Lotions, oils, gels and washes to nourish and care for your body every day.",
  "bath-shower": "Your daily cleanse, elevated.",
  "massage-oil": "Relaxation and skin nourishment in every drop.",
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[var(--color-border)] hover:shadow-lg hover:border-[var(--color-brand-primary)]/30 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--color-bg-cream)] overflow-hidden">
        {collection.heroImage ? (
          <Image
            src={collection.heroImage}
            alt={collection.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/20" />
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-primary)]">
          {CATEGORY_LABELS[collection.navCategory] ?? collection.navCategory}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-5 flex-1">
        <h3 className="font-bold text-[var(--color-text-heading)] text-lg group-hover:text-[var(--color-brand-primary)] transition-colors">
          {collection.name}
        </h3>
        {collection.tagline && (
          <p className="text-sm text-[var(--color-text-muted)] leading-snug flex-1">
            {collection.tagline}
          </p>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] mt-2 group-hover:gap-2 transition-all">
          Explore <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}

// ─── Sub-section heading + grid ───────────────────────────────────────────────

function SubCategorySection({
  subCategoryKey,
  collections,
  parentCategory,
}: {
  subCategoryKey: string
  collections: Collection[]
  parentCategory: string
}) {
  const label = SUBCATEGORY_LABELS[subCategoryKey] ?? subCategoryKey
  const description = SUBCATEGORY_DESCRIPTIONS[subCategoryKey]

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-section heading */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full bg-[var(--color-brand-primary)]" />
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-heading)]">{label}</h3>
          {description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {collections
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((col) => (
            <CollectionCard key={col._id} collection={col} />
          ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-white border border-[var(--color-border)]">
          <div className="aspect-[4/3] bg-neutral-100" />
          <div className="p-5 flex flex-col gap-3">
            <div className="h-5 w-32 bg-neutral-100 rounded" />
            <div className="h-4 w-full bg-neutral-50 rounded" />
            <div className="h-4 w-2/3 bg-neutral-50 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function CollectionsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = searchParams.get("category") ?? "all"

  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const url =
          categoryParam && categoryParam !== "all"
            ? `/api/collections?category=${categoryParam}`
            : `/api/collections`
        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        setCollections(Array.isArray(data) ? data : (data.collections ?? []))
      } catch (err) {
        console.error(err)
        setCollections([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [categoryParam])

  // Group by navCategory for "All" view
  const grouped = React.useMemo(() => {
    if (categoryParam !== "all") return null
    const map: Record<string, Collection[]> = {}
    for (const col of collections) {
      if (!map[col.navCategory]) map[col.navCategory] = []
      map[col.navCategory].push(col)
    }
    return map
  }, [collections, categoryParam])

  // Group by subCategory within a single navCategory view (used for body-care)
  const groupedBySub = React.useMemo(() => {
    if (categoryParam === "all") return null
    // Only body-care has meaningful sub-categories worth splitting
    if (categoryParam !== "body-care") return null
    const map: Record<string, Collection[]> = {}
    for (const col of collections) {
      const key = col.subCategory ?? col.navCategory
      if (!map[key]) map[key] = []
      map[key].push(col)
    }
    return map
  }, [collections, categoryParam])

  const SUBCATEGORY_TO_PARENT_TAB: Record<string, string> = {
  soaps: "body-care",
  "bath-shower": "body-care",
  "massage-oil": "body-care",
}

const activeCategory =
  NAV_CATEGORIES.find((c) => c.key === categoryParam) ??
  NAV_CATEGORIES.find((c) => c.key === SUBCATEGORY_TO_PARENT_TAB[categoryParam]) ??
  NAV_CATEGORIES[0]

  // Sub-category render order for body-care
  const BODY_CARE_SUB_ORDER = ["soaps", "bath-shower", "massage-oil", "body-care"]

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

      {/* ── Hero ── */}
      <section className="bg-[var(--color-bg-cream)] border-b border-[var(--color-border)]">
        <div className="container-nezal py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--color-brand-primary)]">Home</Link>
            <ChevronRight size={14} />
            <span className="text-[var(--color-text-heading)] font-medium">Collections</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col gap-3">
              <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
                <Leaf size={13} /> Herbal Collections
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-heading)]">
                {categoryParam === "all"
                  ? "All Collections"
                  : `${CATEGORY_LABELS[categoryParam] ?? categoryParam} Collections`}
              </h1>
              <p className="text-[var(--color-text-muted)] max-w-xl text-base">
                {categoryParam === "all"
                  ? "Every Nezal collection is a ritual — rooted in Ayurvedic wisdom, crafted for modern skin."
                  : CATEGORY_DESCRIPTIONS[categoryParam] ?? ""}
              </p>
            </div>

            {/* Brochure CTA */}
            <a
              href="/nezal-brochure.pdf"
              download="Nezal-Product-Brochure.pdf"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-heading)] hover:bg-white transition-colors self-start md:self-auto shrink-0"
            >
              <Download size={15} />
              Download Brochure
            </a>
          </div>
        </div>
      </section>

      {/* ── Filter tabs ── */}
      <section className="bg-white border-b border-[var(--color-border)] sticky top-16 z-30">
        <div className="container-nezal">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {NAV_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  if (cat.key === "all") {
                    router.push("/collections")
                  } else {
                    router.push(`/collections?category=${cat.key}`)
                  }
                }}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeCategory.key === cat.key
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : "text-[var(--color-text-heading)] hover:bg-[var(--color-bg-cream)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Collections grid ── */}
      <section className="container-nezal py-12">
        {loading ? (
          <CollectionsSkeleton />
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">No collections found.</p>
            <Link href="/collections" className="text-[var(--color-brand-primary)] font-semibold hover:underline">
              View all collections →
            </Link>
          </div>
        ) : categoryParam === "all" && grouped ? (
          // ── "All" view — one section per navCategory ──────────────────────
          <div className="flex flex-col gap-16">
            {Object.entries(grouped)
              .sort(([a], [b]) => {
                const order = ["face-care", "body-care", "hair-care", "gift-kits"]
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([category, cols]) => {
                // For body-care in "all" view, split by subCategory
                const isBodyCare = category === "body-care"
                const subGrouped = isBodyCare
                  ? cols.reduce<Record<string, Collection[]>>((acc, col) => {
                      const key = col.subCategory ?? col.navCategory
                      if (!acc[key]) acc[key] = []
                      acc[key].push(col)
                      return acc
                    }, {})
                  : null

                return (
                  <div key={category} className="flex flex-col gap-6">
                    {/* Category heading */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
                          {CATEGORY_LABELS[category] ?? category}
                        </h2>
                        {CATEGORY_DESCRIPTIONS[category] && (
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {CATEGORY_DESCRIPTIONS[category]}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/collections?category=${category}`}
                        className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline shrink-0"
                      >
                        View all <ChevronRight size={14} />
                      </Link>
                    </div>

                    {isBodyCare && subGrouped ? (
                      // Body care — show soaps first, then body care products
                      <div className="flex flex-col gap-10">
                        {BODY_CARE_SUB_ORDER.filter((sub) => subGrouped[sub]?.length > 0).map((sub) => (
                          <SubCategorySection
                            key={sub}
                            subCategoryKey={sub}
                            collections={subGrouped[sub]}
                            parentCategory={category}
                          />
                        ))}
                        {/* Render any subCategories not in the predefined order */}
                        {Object.keys(subGrouped)
                          .filter((k) => !BODY_CARE_SUB_ORDER.includes(k))
                          .map((sub) => (
                            <SubCategorySection
                              key={sub}
                              subCategoryKey={sub}
                              collections={subGrouped[sub]}
                              parentCategory={category}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {cols
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((col) => (
                            <CollectionCard key={col._id} collection={col} />
                          ))}
                      </div>
                    )}

                    {/* Mobile view all */}
                    <Link
                      href={`/collections?category=${category}`}
                      className="sm:hidden inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                    >
                      View all {CATEGORY_LABELS[category]} <ChevronRight size={14} />
                    </Link>
                  </div>
                )
              })}
          </div>
        ) : categoryParam === "body-care" && groupedBySub ? (
          // ── Body Care filtered view — split by subCategory ─────────────────
          <div className="flex flex-col gap-12">
            {BODY_CARE_SUB_ORDER.filter((sub) => groupedBySub[sub]?.length > 0).map((sub) => (
              <SubCategorySection
                key={sub}
                subCategoryKey={sub}
                collections={groupedBySub[sub]}
                parentCategory="body-care"
              />
            ))}
            {Object.keys(groupedBySub)
              .filter((k) => !BODY_CARE_SUB_ORDER.includes(k))
              .map((sub) => (
                <SubCategorySection
                  key={sub}
                  subCategoryKey={sub}
                  collections={groupedBySub[sub]}
                  parentCategory="body-care"
                />
              ))}
          </div>
        ) : (
          // ── All other filtered views — flat grid ───────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((col) => (
                <CollectionCard key={col._id} collection={col} />
              ))}
          </div>
        )}
      </section>

      {/* ── Bottom CTA strip ── */}
      <section className="bg-[var(--color-bg-cream)] border-t border-[var(--color-border)]">
        <div className="container-nezal py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
              Not sure where to start?
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm">
              Shop by your skin concern and we'll point you to the right collection.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {["acne", "pigmentation", "open-pores", "hydration", "hairfall", "dryness"].map((slug) => (
              <Link
                key={slug}
                href={`/concerns/${slug}`}
                className="px-4 py-2 rounded-full border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-heading)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors capitalize"
              >
                {slug.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}

// ─── Page (Suspense boundary for useSearchParams) ─────────────────────────────

export default function CollectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg-page)] animate-pulse">
        <div className="bg-[var(--color-bg-cream)] h-48" />
        <div className="container-nezal py-12">
          <CollectionsSkeleton />
        </div>
      </div>
    }>
      <CollectionsInner />
    </Suspense>
  )
}