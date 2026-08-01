// app/shop/[company]/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import ProductCard from "@/components/product-card"
import { BrandFilters } from "@/components/brand-filters"
import { CompanyCarousel } from "@/components/company-carousel"
import { NewArrivals } from "@/components/new-arrivals"
import { ShopByConcern } from "@/components/ShopByConcern"
import { Button } from "@/components/ui/button"
import WhyChoose from "@/components/why-choose"
import Testimonials from "@/components/testimonials"
import { ComingSoon } from "@/components/coming-soon"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react"
import { NewArrivalsSidebar } from "@/components/new-arrivals-sidebar"


// ── Types ─────────────────────────────────────────────────────────────────────
interface CarouselImage {
  _id: string
  url: string
  title?: string
  description?: string
}

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { name: string; slug: string }
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

interface Company {
  _id: string
  name: string
  slug: string
  description?: string
  banner?: string
  carouselImages?: CarouselImage[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PRODUCTS_PER_PAGE = 12
const COMPANIES_KEY = "shop:companies:all"
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

function productCacheKey(opts: { company?: string; page: number; limit: number; category?: string }) {
  const { company = "all", page, limit, category = "" } = opts
  return `shop:products:company:${company}:page:${page}:limit:${limit}:cat:${category}`
}

async function fetchCompaniesAPI(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch companies")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchProductsAPI(params: {
  page: number; limit: number; company?: string; category?: string
}): Promise<{ products: Product[]; total: number }> {
  const { page, limit, company, category } = params
  const urlParams = new URLSearchParams()
  urlParams.append("page", String(page))
  urlParams.append("limit", String(limit))
  if (company) urlParams.append("company", company)
  if (category) urlParams.append("category", category)
  const res = await fetch(`/api/products?${urlParams.toString()}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch products")
  const json = await res.json()
  const products = Array.isArray(json?.products) ? json.products
    : Array.isArray(json) ? json
    : Array.isArray(json?.data) ? json.data : []
  const total = json?.pagination?.total ?? json?.total ?? json?.totalItems ?? json?.count ?? products.length
  return { products, total: Number(total ?? products.length) }
}

export function invalidateCompanyShopCaches(companySlug?: string) {
  invalidateCache(COMPANIES_KEY)
  if (companySlug) invalidateCache(`shop:products:company:${companySlug}:`)
  else invalidateCache("shop:products:company:")
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CompanyShopPage() {
  const params = useParams()
  const companySlug = params.company as string

  const initialCompanies = useMemo(() => getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? [], [])

  const [products, setProducts] = useState<Product[]>([])
  const [companyData, setCompanyData] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadCompany() {
      if (!companySlug) return
      try {
        const companies = await fetchWithCache<Company[]>(
          COMPANIES_KEY, fetchCompaniesAPI,
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        const found = Array.isArray(companies) ? companies.find((c: Company) => c.slug === companySlug) : null
        setCompanyData(found ?? null)
      } catch (err) {
        if (!mounted) return
        setCompanyData(null)
      }
    }
    loadCompany()
    return () => { mounted = false }
  }, [companySlug])

  useEffect(() => {
    let mounted = true
    async function loadProducts() {
      if (!companySlug) return
      setLoading(true)
      try {
        const productOpts = { company: companySlug, page, limit: PRODUCTS_PER_PAGE, category: selectedCategory || undefined }
        const cacheKey = productCacheKey(productOpts)
        const { products: fetched, total } = await fetchWithCache<{ products: Product[]; total: number }>(
          cacheKey, () => fetchProductsAPI(productOpts),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setProducts(fetched)
        setTotalProducts(total)
        setTotalPages(Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)))
      } catch (err) {
        if (!mounted) return
        setProducts([])
        setTotalPages(1)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [companySlug, page, selectedCategory])

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug)
    setPage(1)
    setMobileFiltersOpen(false)
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (!companyData) {
    return (
      <main className="min-h-screen" style={{ background: "var(--color-bg-page, #f7f5f0)" }}>
        {/* Skeleton hero */}
        <div className="w-full h-[55vh] bg-gray-200 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            <div className="hidden lg:block h-96 bg-gray-200 animate-pulse rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  const hasCarousel = companyData.carouselImages && companyData.carouselImages.length > 0
  if (!hasCarousel) return <ComingSoon companyName={companyData.name} />

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--color-bg-page, #f7f5f0)", fontFamily: "'Inter', sans-serif" }}
    >

{/* ── HERO CAROUSEL (full-width, cinematic) ─────────────────────────── */}
{/* ── HERO CAROUSEL (full-width, no forced height) ─────────────────── */}
<section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
  <CompanyCarousel images={companyData.carouselImages} />
</section>

{/* ── COMPANY INFO (below carousel, normal flow) ────────────────────── */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
  <span
    className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
    style={{ background: "#e8f4ec", color: "#2d6a4f" }}
  >
    Official Store
  </span>
  <h1
    className="text-2xl md:text-4xl font-bold"
    style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
  >
    {companyData.name}
  </h1>
  {companyData.description && (
    <p className="mt-1 text-sm md:text-base max-w-2xl" style={{ color: "#4a5c4a" }}>
      {companyData.description}
    </p>
  )}
</div>


      {/* ── MARQUEE TRUST BAR ─────────────────────────────────────────────── */}
      <div
        className="w-full overflow-hidden py-3"
        style={{ background: "#1a3a2a", color: "#c8a96e" }}
      >
        <div
          className="flex gap-10 whitespace-nowrap"
          style={{
            animation: "marquee 24s linear infinite",
            width: "max-content",
          }}
        >
          {[
            "🌿 Natural Ingredients",
            "✦ Cruelty-Free",
            "✦ Made in India",
            "✦ Quality Tested",
            "✦ Own Manufacturing",
            "✦ Safe for Daily Use",
            "🌿 Natural Ingredients",
            "✦ Cruelty-Free",
            "✦ Made in India",
            "✦ Quality Tested",
            "✦ Own Manufacturing",
            "✦ Safe for Daily Use",
          ].map((item, i) => (
            <span key={i} className="text-xs font-semibold tracking-widest uppercase">{item}</span>
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* ── NEW ARRIVALS ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-4 ">
        {/* Section label */}
        <div className="text-center mb-8">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
            style={{ background: "#e8f4ec", color: "#2d6a4f" }}
          >
            🌱 Fresh Drops
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
          >
            New <span style={{ color: "#2d6a4f" }}>Arrivals</span>
          </h2>
          <p className="text-sm mt-2" style={{ color: "#6b7c6b" }}>
            The latest from {companyData.name} — be the first to try
          </p>
        </div>
        <NewArrivals
          companyId={companyData._id}
          companySlug={companySlug}
          companyName={companyData.name}
        />
      </section>

      {/* ── DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #c8d8c8, transparent)" }} />
      </div>

      {/* ── MAIN SHOP AREA: sidebar + products ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">

        {/* Section heading */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
              style={{ background: "#e8f4ec", color: "#2d6a4f" }}
            >
              Our Collection
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
            >
              We <span style={{ color: "#2d6a4f" }}>Suggest</span> Our Products
            </h2>
          </div>

          {/* Mobile filter toggle */}
          <button
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition"
            style={{ background: "#1a3a2a", color: "#fff" }}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {selectedCategory && "(1)"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">

          {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
          
{/* ── Desktop Sidebar ─────────────────────────────────────────── */}
<aside className="hidden lg:block sticky top-4 space-y-5">
  <NewArrivalsSidebar companyId={companyData._id} companySlug={companySlug} />

  <div
    className="rounded-2xl overflow-hidden"
    style={{ background: "#fff", border: "1px solid #e2ece2", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
  >
    {/* Header strip */}
    <div
      className="px-5 pt-5 pb-4"
      style={{ borderBottom: "1px solid #f0f4f0" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#e8f4ec" }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "#2d6a4f" }} />
          </div>
          <h3 className="font-bold text-sm tracking-tight" style={{ color: "#1a2e1a" }}>
            Category
          </h3>
        </div>

        {selectedCategory && (
          <button
            onClick={() => handleCategoryChange("")}
            className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-full transition-colors"
            style={{ color: "#2d6a4f", background: "#e8f4ec" }}
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {selectedCategory && (
        <p className="text-[11px] mt-2" style={{ color: "#9aaa9a" }}>
          Viewing <span className="font-semibold" style={{ color: "#2d6a4f" }}>{selectedCategory}</span>
        </p>
      )}
    </div>

    {/* Filter body */}
    <div className="p-3">
      <BrandFilters
        companySlug={companySlug}
        onCategoryChange={handleCategoryChange}
        selectedCategory={selectedCategory}
      />
    </div>
  </div>
</aside>


          {/* ── Mobile Filters Drawer ───────────────────────────────────── */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
              <div
                className="absolute right-0 top-0 h-full w-80 max-w-full p-6 overflow-y-auto"
                style={{ background: "#fff" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg" style={{ color: "#1a2e1a" }}>Filters</h3>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="w-5 h-5" style={{ color: "#1a2e1a" }} />
                  </button>
                </div>
                <BrandFilters
                  companySlug={companySlug}
                  onCategoryChange={handleCategoryChange}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
          )}

          {/* ── Products Grid ───────────────────────────────────────────── */}
          <div>
            {/* Active filter chip */}
            {selectedCategory && (
              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm" style={{ color: "#6b7c6b" }}>Filtered by:</span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "#e8f4ec", color: "#2d6a4f" }}
                >
                  {selectedCategory}
                  <button onClick={() => handleCategoryChange("")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
                {[...Array(PRODUCTS_PER_PAGE)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ height: 320 }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl"
                  style={{ background: "#e8f4ec" }}
                >
                  🌿
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: "#1a2e1a" }}>
                  No products found
                </h3>
                <p className="text-sm mb-6" style={{ color: "#6b7c6b" }}>
                  Try removing filters or explore a different category.
                </p>
                {selectedCategory && (
                  <Button
                    variant="outline"
                    onClick={() => handleCategoryChange("")}
                    style={{ borderColor: "#2d6a4f", color: "#2d6a4f" }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Count */}
                <p className="text-sm mb-4" style={{ color: "#6b7c6b" }}>
                  Showing {(page - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(page * PRODUCTS_PER_PAGE, totalProducts)} of{" "}
                  <span className="font-semibold" style={{ color: "#1a2e1a" }}>{totalProducts}</span> products
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
                  {products.map((product) => (
                    <ProductCard
                      key={product._id}
                      id={product._id}
                      name={product.name}
                      price={product.price}
                      discountPrice={product.discountPrice}
                      image={product.image}
                      company={product.company}
                      flashSale={product.flashSale}
                    />
                  ))}
                </div>

                {/* ── Pagination ───────────────────────────────────────── */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30"
                      style={{ background: "#fff", border: "1px solid #d4e4d4", color: "#1a3a2a" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (page <= 3) pageNum = i + 1
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = page - 2 + i
                      return pageNum
                    }).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className="w-9 h-9 rounded-xl text-sm font-semibold transition"
                        style={
                          page === pageNum
                            ? { background: "#1a3a2a", color: "#fff", border: "1px solid #1a3a2a" }
                            : { background: "#fff", color: "#1a2e1a", border: "1px solid #d4e4d4" }
                        }
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30"
                      style={{ background: "#fff", border: "1px solid #d4e4d4", color: "#1a3a2a" }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div style={{ height: 1, background: "linear-gradient(to right, transparent, #c8d8c8, transparent)" }} />
      </div>

      {/* ── SHOP BY CONCERN ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
            style={{ background: "#e8f4ec", color: "#2d6a4f" }}
          >
            Targeted Care
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
          >
            Shop by <span style={{ color: "#2d6a4f" }}>Concern</span>
          </h2>
          <p className="text-sm mt-2" style={{ color: "#6b7c6b" }}>
            Find exactly what your skin or hair needs
          </p>
        </div>
        <ShopByConcern companyId={companyData._id} companySlug={companyData.slug} />
      </section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────────────── */}
      <section
        className="py-14"
        style={{ background: "#1a3a2a" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
              style={{ background: "rgba(200,169,110,0.15)", color: "#c8a96e" }}
            >
              Our Trust, Your Confidence
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Why Choose <span style={{ color: "#c8a96e" }}>Nezal?</span>
            </h2>
          </div>
          <WhyChoose />
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
            style={{ background: "#e8f4ec", color: "#2d6a4f" }}
          >
            Real Results
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: "#1a2e1a", letterSpacing: "-0.02em" }}
          >
            What Our <span style={{ color: "#2d6a4f" }}>Customers</span> Say
          </h2>
        </div>
        <Testimonials companySlug={companySlug} />
      </section>

    </main>
  )
}