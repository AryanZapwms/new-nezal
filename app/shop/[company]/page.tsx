// app/shop/[company]/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import  ProductCard  from "@/components/product-card"
import { BrandFilters } from "@/components/brand-filters"
import { CompanyCarousel } from "@/components/company-carousel"
import { NewArrivals } from "@/components/new-arrivals"
import { Button } from "@/components/ui/button"
import { ShopByCategory } from "@/components/shop-by-category"
import WhyChoose from "@/components/why-choose"
import Testimonials from "@/components/testimonials"
import { ComingSoon } from "@/components/coming-soon"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

// ===== Types & constants unchanged =====
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
}

interface Company {
  _id: string
  name: string
  slug: string
  description?: string
  banner?: string
  carouselImages?: CarouselImage[]
}

const PRODUCTS_PER_PAGE = 12
const COMPANIES_KEY = "shop:companies:all"
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

function productCacheKey(opts: { company?: string; page: number; limit: number; category?: string }) {
  const { company = "all", page, limit, category = "" } = opts
  return `shop:products:company:${company}:page:${page}:limit:${limit}:cat:${category}`
}

// ===== API fetchers unchanged =====
async function fetchCompaniesAPI(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch companies")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchProductsAPI(params: {
  page: number
  limit: number
  company?: string
  category?: string
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
  
  const products = Array.isArray(json?.products)
    ? json.products
    : Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
    ? json.data
    : []
  const total = json?.pagination?.total ?? json?.total ?? json?.totalItems ?? json?.count ?? products.length
  return { products, total: Number(total ?? products.length) }
}

export function invalidateCompanyShopCaches(companySlug?: string) {
  invalidateCache(COMPANIES_KEY)
  if (companySlug) {
    invalidateCache(`shop:products:company:${companySlug}:`)
  } else {
    invalidateCache("shop:products:company:")
  }
}

// ============================
// Component – all logic kept
// ============================
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
  

  // Fetch company metadata (unchanged)
  useEffect(() => {
    let mounted = true
    async function loadCompany() {
      if (!companySlug) return
      try {
        const companies = await fetchWithCache<Company[]>(
          COMPANIES_KEY,
          fetchCompaniesAPI,
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        const found = Array.isArray(companies) ? companies.find((c: Company) => c.slug === companySlug) : null
        if (found) setCompanyData(found)
        else setCompanyData(null)
      } catch (err) {
        console.error("Error fetching company:", err)
        if (!mounted) return
        setCompanyData(null)
      }
    }
    loadCompany()
    return () => { mounted = false }
  }, [companySlug])

  // Fetch products (unchanged)
  useEffect(() => {
    let mounted = true
    async function loadProducts() {
      if (!companySlug) return
      setLoading(true)
      try {
        const productOpts = {
          company: companySlug,
          page,
          limit: PRODUCTS_PER_PAGE,
          category: selectedCategory || undefined,
        }
        const cacheKey = productCacheKey(productOpts)
        
        const { products: fetched, total } = await fetchWithCache<{ products: Product[]; total: number }>(
          cacheKey,
          () => fetchProductsAPI(productOpts),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
       setProducts(fetched)
setTotalProducts(total)
setTotalPages(Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)))
      } catch (err) {
        console.error("Error fetching products:", err)
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
  }

  // Loading / no company skeleton (Nezal styled)
  if (!companyData) {
    return (
      <main className="min-h-screen bg-[--color-bg-page]">
        <div className="container-nezal py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <div className="hidden lg:block">
              <div className="w-48 h-96 bg-gray-200 animate-pulse rounded-2xl" />
            </div>
            <div className="space-y-8">
              <div className="w-full h-[300px] md:h-[400px] bg-gray-200 animate-pulse rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  const hasCarousel = companyData.carouselImages && companyData.carouselImages.length > 0

  if (!hasCarousel) {
    return <ComingSoon companyName={companyData.name} />
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <BrandFilters
                companySlug={companySlug}
                onCategoryChange={handleCategoryChange}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            {/* Carousel */}
            {hasCarousel ? (
              <CompanyCarousel images={companyData.carouselImages} />
            ) : (
              <div className="w-full h-[300px] md:h-[400px] bg-gray-200 animate-pulse rounded-2xl" />
            )}

            {/* Mobile filter */}
            <div className="lg:hidden">
              <BrandFilters
                companySlug={companySlug}
                onCategoryChange={handleCategoryChange}
                selectedCategory={selectedCategory}
              />
            </div>

            {/* New Arrivals */}
            {companyData ? (
              <NewArrivals
                companyId={companyData._id}
                companySlug={companySlug}
                companyName={companyData.name}
              />
            ) : (
              <div className="text-center mb-6">
                <div className="w-48 h-8 bg-gray-200 animate-pulse rounded mx-auto" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-200 animate-pulse rounded-2xl h-80 w-full" />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Products – Nezal heading */}
            <div>
              <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-[--color-text-heading] flex items-center justify-center gap-3">
                  <span className="text-[--color-brand-accent]">🌿</span>
                  We Suggest Our Products
                  <span className="text-[--color-brand-accent]">🌿</span>
                </h2>
              </div>

              <div>
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                    {[...Array(PRODUCTS_PER_PAGE)].map((_, i) => (
                      <div key={i} className="bg-gray-200 animate-pulse rounded-2xl h-80 w-full" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <svg className="w-16 h-16 text-[--color-text-muted] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="text-xl font-semibold text-[--color-text-heading] mb-2">No products found</h3>
                    <p className="text-sm text-[--color-text-muted] mb-6">We couldn't find any products matching your criteria.</p>
                    {selectedCategory && (
                      <Button variant="outline" onClick={() => { setSelectedCategory(""); setPage(1); }} className="border-[--color-border]">
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 p-8 rounded-2xl bg-[--color-bg-cream]">
                      {products.map((product) => (
                        <ProductCard
                          key={product._id}
                          id={product._id}
                          name={product.name}
                          price={product.price}
                          discountPrice={product.discountPrice}
                          image={product.image}
                          company={product.company}
                        />
                      ))}
                    </div>

                    {/* Pagination — Nezal green accent */}
                    {totalPages > 1 && (
                      <div className="mt-8 pt-6 border-t border-[--color-border]">
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="h-9 px-4 border-[--color-border]"
                          >
                            Previous
                          </Button>
                          <div className="hidden sm:flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 5) pageNum = i + 1
                              else if (page <= 3) pageNum = i + 1
                              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                              else pageNum = page - 2 + i
                              return pageNum
                            }).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className={`w-9 h-9 ${page === pageNum ? "bg-[--color-brand-primary] text-white hover:bg-[--color-brand-primary-dark]" : "border-[--color-border]"}`}
                              >
                                {pageNum}
                              </Button>
                            ))}
                          </div>
                          <div className="sm:hidden text-sm font-medium text-[--color-text-body] px-3">
                            {page} / {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="h-9 px-4 border-[--color-border]"
                          >
                            Next
                          </Button>
                        </div>
                        <div className="text-center mt-3 text-xs text-[--color-text-muted]">
                         Showing {(page - 1) * PRODUCTS_PER_PAGE + 1}-{Math.min(page * PRODUCTS_PER_PAGE, totalProducts)} of {totalProducts} products
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Shop By Concern */}
            {companyData ? (
              <ShopByConcern
                companyId={companyData._id}
                companySlug={companyData.slug}
              />
            ) : null}

            {/* Why Choose Us */}
            <WhyChoose />

            {/* Testimonials */}
            <Testimonials companySlug={companySlug} />
          </div>
        </div>
      </div>
    </main>
  )
}