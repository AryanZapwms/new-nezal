"use client"

import Link from "next/link"
import Image from "next/image"
import { Home, ChevronRight, Leaf, Search } from "lucide-react"
import { useState, useMemo } from "react"

// ─── All ingredients (28 from client doc + rose + bhringraj already live) ────

const ALL_INGREDIENTS = [
  // Skin Actives
  {
    slug: "aloe-vera",
    label: "Aloe Vera",
    tagline: "Universal soother for skin & hair",
    category: "Skin Active",
    image: "/ingredients/aloe-vera.jpg",
  },
  {
    slug: "niacinamide",
    label: "Niacinamide",
    tagline: "Pore minimiser & skin brightener",
    category: "Skin Active",
    image: "/ingredients/niacinamide.jpg",
  },
  {
    slug: "vitamin-c",
    label: "Vitamin C",
    tagline: "Radiance & antioxidant protection",
    category: "Skin Active",
    image: "/ingredients/vitamin-c.webp",
  },
  {
    slug: "hyaluronic-acid",
    label: "Hyaluronic Acid",
    tagline: "Deep hydration specialist",
    category: "Skin Active",
    image: "/ingredients/hyaluronic-acid.jpg",
  },
  {
    slug: "salicylic-acid",
    label: "Salicylic Acid",
    tagline: "BHA for acne-prone skin",
    category: "Skin Active",
    image: "/ingredients/Salicylic_Acid.webp",
  },
  {
    slug: "kojic-acid",
    label: "Kojic Acid",
    tagline: "Brightening & skin tone support",
    category: "Skin Active",
    image: "/ingredients/kojic-acid.png",
  },
  {
    slug: "glycerine",
    label: "Glycerine",
    tagline: "Universal moisture retention",
    category: "Skin Active",
    image: "/ingredients/Glycerine.jpg",
  },
  {
    slug: "apple-cider-vinegar",
    label: "Apple Cider Vinegar",
    tagline: "Natural toner & pH balancer",
    category: "Skin Active",
    image: "/ingredients/apple-cider-vineger.webp",
  },
  {
    slug: "liquorice-extract",
    label: "Liquorice Extract",
    tagline: "Gentle brightening & soothing",
    category: "Skin Active",
    image: "/ingredients/liquorice.jpg",
  },
  {
    slug: "allantoin",
    label: "Allantoin",
    tagline: "Post-cleanse skin comfort",
    category: "Skin Active",
    image: "/ingredients/allantoin.jpg",
  },
  // Botanical Actives
  {
    slug: "neem",
    label: "Neem",
    tagline: "Ayurvedic antibacterial purifier",
    category: "Botanical Active",
    image: "/ingredients/neem.jpg",
  },
  {
    slug: "tulsi",
    label: "Tulsi",
    tagline: "Sacred herbal skin balancer",
    category: "Botanical Active",
    image: "/ingredients/tulsi.webp",
  },
  {
    slug: "turmeric",
    label: "Turmeric",
    tagline: "Golden brightening & glow",
    category: "Botanical Active",
    image: "/ingredients/Turmeric.webp",
  },
  {
    slug: "tea-tree",
    label: "Tea Tree",
    tagline: "Pore-clearing acne control",
    category: "Botanical Active",
    image: "/ingredients/tea-tree.png",
  },
  {
    slug: "saffron",
    label: "Saffron",
    tagline: "Timeless brightening",
    category: "Botanical Active",
    image: "/ingredients/Saffron.webp",
  },
  {
    slug: "activated-charcoal",
    label: "Activated Charcoal",
    tagline: "Deep pore detox & purification",
    category: "Botanical Active",
    image: "/ingredients/activated-charcoal.jpg",
  },
  {
    slug: "papaya-extract",
    label: "Papaya Extract",
    tagline: "Natural enzyme brightening",
    category: "Botanical Active",
    image: "/ingredients/papaya_extract.jpg",
  },
  {
    slug: "oatmeal",
    label: "Oatmeal",
    tagline: "Gentle exfoliation & soothing",
    category: "Botanical Active",
    image: "/ingredients/oatmeal.webp",
  },
  {
    slug: "multani-mitti",
    label: "Multani Mitti",
    tagline: "Traditional clay detox",
    category: "Botanical Active",
    image: "/ingredients/multani-mitti.webp",
  },
  {
    slug: "rose",
    label: "Rose",
    tagline: "Timeless floral hydration",
    category: "Botanical Active",
    image: "/ingredients/rose.webp",
  },
  // Hair Actives
  {
    slug: "redensyl",
    label: "Redensyl",
    tagline: "Advanced hair density active",
    category: "Hair Active",
    image: "/ingredients/redensyl.webp",
  },
  {
    slug: "anagain",
    label: "Anagain",
    tagline: "Natural hair cycle support",
    category: "Hair Active",
    image: "/ingredients/anagain.webp",
  },
  {
    slug: "amla",
    label: "Amla",
    tagline: "Ayurvedic hair strength & shine",
    category: "Hair Active",
    image: "/ingredients/amla.webp",
  },
  {
    slug: "shikakai",
    label: "Shikakai",
    tagline: "Traditional herbal hair cleanser",
    category: "Hair Active",
    image: "/ingredients/shikakai.webp",
  },
  {
    slug: "seaweed-extract",
    label: "Seaweed Extract",
    tagline: "Mineral-rich hair nourishment",
    category: "Hair Active",
    image: "/ingredients/seaweed-extract.webp",
  },
  {
    slug: "panthenol",
    label: "Panthenol",
    tagline: "Deep hair moisture & strength",
    category: "Hair Active",
    image: "/ingredients/panthenol.webp",
  },
  {
    slug: "bhringraj",
    label: "Bhringraj",
    tagline: "Ayurvedic king of hair",
    category: "Hair Active",
    image: "/ingredients/bringraj.webp",
  },
  // Emollients
  {


     
    slug: "shea-butter",
    label: "Shea Butter",
    tagline: "Deep nourishment & softness",
    category: "Emollient",
    image: "/ingredients/shea-butter.webp",
  },
  // Wellness Actives
  {
    slug: "himalayan-pink-salt",
    label: "Himalayan Pink Salt",
    tagline: "Mineral detox & wellness bathing",
    category: "Wellness Active",
    image: "/ingredients/himalayan-pink-salt.jpg",
  },
  {
    slug: "cedarwood-essential-oil",
    label: "Cedarwood Essential Oil",
    tagline: "Calming aromatherapy",
    category: "Wellness Active",
    image: "/ingredients/cedarwood-oil.webp",
  },
]

const CATEGORIES = [
  "All",
  "Skin Active",
  "Botanical Active",
  "Hair Active",
  "Emollient",
  "Wellness Active",
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Skin Active":      { bg: "#e8f5e8", text: "#1e6636", border: "#c0dbc0" },
  "Botanical Active": { bg: "#fef9e7", text: "#7d5a00", border: "#e8d89a" },
  "Hair Active":      { bg: "#fce4ec", text: "#880e4f", border: "#f5b8c9" },
  "Emollient":        { bg: "#fff3e0", text: "#b45309", border: "#fcd9a0" },
  "Wellness Active":  { bg: "#ede7f6", text: "#4527a0", border: "#c9b9e8" },
}

export default function IngredientsPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const filtered = useMemo(() => {
    return ALL_INGREDIENTS.filter((ing) => {
      const matchesSearch =
        search.trim() === "" ||
        ing.label.toLowerCase().includes(search.toLowerCase()) ||
        ing.tagline.toLowerCase().includes(search.toLowerCase()) ||
        ing.category.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        activeCategory === "All" || ing.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory])

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

      {/* ── Hero banner ── */}
      <section
        className="border-b border-[var(--color-border)]"
        style={{ backgroundColor: "#F3F5EF" }}
      >
        <div className="container-nezal py-10 md:py-14">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
              <Home size={13} /> Home
            </Link>
            <ChevronRight size={13} />
            <span className="text-[var(--color-text-heading)] font-medium">Ingredient Library</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-xl">
              <span
                className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ backgroundColor: "#e8f5e8", color: "#1e6636" }}
              >
                <Leaf size={12} /> Ingredient Library
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: "#1e3a28" }}>
                What Goes Into Every Nezal Product
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#6b7c70" }}>
                {ALL_INGREDIENTS.length} botanicals, actives, and natural compounds — each chosen with purpose.
                Explore the science and tradition behind your skincare and haircare.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 shrink-0">
              {[
                { value: "30", label: "Key Ingredients" },
                { value: "65+", label: "Formulations" },
                { value: "100%", label: "Nature-Backed" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span className="text-2xl font-extrabold" style={{ color: "#1e6636" }}>{stat.value}</span>
                  <span className="text-xs text-center mt-0.5" style={{ color: "#6b7c70" }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section className="sticky top-[var(--sticky-header-stack-height)] z-20 bg-white border-b border-[var(--color-border)] shadow-sm">
        <div className="container-nezal py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c70" }} />
            <input
              type="text"
              placeholder="Search ingredients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none transition-colors focus:border-[#1e6636]"
              style={{ borderColor: "#dde8de", backgroundColor: "#fafaf8", color: "#1e3a28" }}
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={
                  activeCategory === cat
                    ? { backgroundColor: "#1e6636", color: "#fff", borderColor: "#1e6636" }
                    : { backgroundColor: "white", color: "#4b6b53", borderColor: "#dde8de" }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="container-nezal py-10">

        {/* Result count */}
        <p className="text-sm mb-6" style={{ color: "#6b7c70" }}>
          {filtered.length === ALL_INGREDIENTS.length
            ? `Showing all ${filtered.length} ingredients`
            : `${filtered.length} ingredient${filtered.length !== 1 ? "s" : ""} found`}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Leaf size={40} style={{ color: "#c0d8c4" }} />
            <p className="text-base font-medium" style={{ color: "#6b7c70" }}>
              No ingredients found for "{search}"
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All") }}
              className="text-sm font-semibold underline"
              style={{ color: "#1e6636" }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {filtered.map((ing) => {
              const catStyle = CATEGORY_COLORS[ing.category] ?? CATEGORY_COLORS["Skin Active"]
              return (
                <Link
                  key={ing.slug}
                  href={`/ingredients/${ing.slug}`}
                  className="group relative overflow-hidden rounded-2xl border bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{ borderColor: "#dde8de" }}
                >
                  {/* Image */}
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ height: "180px", backgroundColor: "#f0f7f0" }}
                  >
                    <Image
                      src={ing.image}
                      alt={ing.label}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = "/placeholder.jpg"
                      }}
                    />
                    {/* hover tint */}
                    <div className="absolute inset-0 bg-[#1e3a28]/0 group-hover:bg-[#1e3a28]/10 transition-colors duration-300" />

                    {/* Category badge — top-left */}
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none"
                      style={{ backgroundColor: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}
                    >
                      {ing.category}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="p-3.5 flex flex-col gap-1">
                    <p className="text-sm font-bold leading-tight" style={{ color: "#1e3a28" }}>
                      {ing.label}
                    </p>
                    <p className="text-xs leading-snug" style={{ color: "#6b7c70" }}>
                      {ing.tagline}
                    </p>
                    <span
                      className="text-xs font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1"
                      style={{ color: "#1e6636" }}
                    >
                      <Leaf size={10} /> Explore →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Bottom CTA ── */}
      <section
        className="border-t border-[var(--color-border)] mt-4"
        style={{ backgroundColor: "#f3f5ef" }}
      >
        <div className="container-nezal py-12 text-center flex flex-col items-center gap-4">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: "#e8f5e8", color: "#1e6636" }}
          >
            <Leaf size={12} /> Every Ingredient Has a Purpose
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1e3a28" }}>
            Not sure which ingredient is right for you?
          </h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "#6b7c70" }}>
            Browse by skin concern instead — we'll show you exactly which ingredients and products address what you're looking for.
          </p>
          <Link
            href="/concerns"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#1e6636" }}
          >
            <Leaf size={14} /> Shop by Concern
          </Link>
        </div>
      </section>

    </main>
  )
}