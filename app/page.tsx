"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import ProductCard from "@/components/product-card"
import { HomeCarousel } from "@/components/home-carousel"
import { ShopByCategory } from "@/components/shop-by-category"
import WhyChoose from "@/components/why-choose"
import Testimonials from "@/components/testimonials"
import { AnimatedTestimonials } from "@/components/AnimatedTestimonials"

import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"
import { BRAND } from "@/lib/config"

// ─── Types ───────────────────────────────────────────
interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { _id: string; name: string; slug: string }
}

interface Company {
  _id: string
  name: string
  slug: string
  carouselImages?: Array<{ _id: string; url: string; title?: string; description?: string }>
}

interface Review {
  id: string
  productName: string
  productImage: string
  productId: string
  customerName: string
  rating: number
  comment: string
  company: string
}

// ─── Cache config ────────────────────────────────────
const COMPANIES_KEY = "home:companies:all"
const SUGGESTED_PRODUCTS_KEY = "home:products:suggested:8"
const ALL_PRODUCTS_KEY = "home:products:all:100"
const REVIEWS_KEY = "home:reviews:all"
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

// ─── API fetchers ────────────────────────────────────
async function fetchCompaniesAPI(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch companies")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchSuggestedProductsAPI(): Promise<Product[]> {
  const res = await fetch("/api/products?limit=8", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch suggested products")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.products)) return json.products
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchAllProductsAPI(): Promise<Product[]> {
  const res = await fetch("/api/products?limit=100", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch all products")
  const json = await res.json()
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.products)) return json.products
  if (Array.isArray(json?.data)) return json.data
  return []
}

async function fetchReviewsAPI(): Promise<Review[]> {
  const res = await fetch("/api/products/reviews/all", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch reviews")
  const json = await res.json()
  const raw = Array.isArray(json) ? json : json?.reviews ?? json?.data ?? []
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 20).map((r: any) => ({
    id: r.id || r._id || `${Math.random()}`,
    productName: r.productName || r.product?.name || "Product",
    productImage: r.productImage || r.product?.image || "/placeholder.jpg",
    productId: r.productId || r.product?._id || "",
    customerName: r.userName || r.customerName || r.name || "Anonymous",
    rating: typeof r.rating === "number" ? r.rating : 5,
    comment: r.comment || r.review || "",
    company: r.company || r.brand || BRAND.name,
  }))
}

export function invalidateHomeCaches() {
  invalidateCache(COMPANIES_KEY)
  invalidateCache(SUGGESTED_PRODUCTS_KEY)
  invalidateCache(ALL_PRODUCTS_KEY)
  invalidateCache(REVIEWS_KEY)
}

// ─── Ticker items ────────────────────────────────────
const TICKER_ITEMS = [
  "Cruelty Free",
  "Dermatologist Tested",
  "100% Natural Extracts",
  "Made with love in India",
  "Ayurveda Wisdom",
  "Zero Toxins",
  "Paraben Free",
  "Sulphate Free",
]


const PROMO_BANNERS = [
  {
    image: "/products/neem-tulsi-facewash.jpg",
    label: "Face Wash",
    sub: "From ₹199",
    href: "/collections/foaming-face-wash",
  },
  {
    image: "/products/bhringraj-hair-serum.jpg",
    label: "Hair Serum",
    sub: "Reduce Hair Fall",
    href: "/collections/hair-serum",
  },
  {
    image: "/products/aloe-vera-body-lotion.jpg",
    label: "Body Lotion",
    sub: "All-Day Hydration",
    href: "/collections/body-lotion",
  },
  {
    image: "/products/body-massage-oil-cedarwood.jpg",
    label: "Massage Oil",
    sub: "Relax & Restore",
    href: "/collections/body-massage-oil",
  },
  {
    image: "/products/almond-nourishing-cream.jpg",
    label: "Face Cream",
    sub: "Deep Nourishment",
    href: "/collections/face-serum",
  },
  {
    image: "/products/rose-bathing-salt.jpg",
    label: "Bath Salts",
    sub: "Turn Bath Into Ritual",
    href: "/collections/bath-salt",
  },
]

function PromoBannerGrid() {
  return (
    <section className="py-12 md:py-16 bg-[#FAFAF8]">
      <div className="container-nezal">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            Our Collections
          </span>
          <h2 className="mt-2 text-[28px] md:text-[32px] font-bold text-[var(--color-text-heading)]">
            Shop by Product
          </h2>
        </div>
 
        {/* Grid — 3 cols desktop, 2 cols mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {PROMO_BANNERS.map((banner) => (
            <a
              key={banner.href}
              href={banner.href}
              className="group flex flex-col items-center gap-3"
            >
              {/* Image circle container — matches reference style */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white border border-[var(--color-border)] shadow-sm group-hover:shadow-md transition-shadow duration-300">
                {/* Soft pink blob background like the reference */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(var(--color-brand-primary-rgb, 42,122,91), 0.07) 0%, transparent 70%)",
                  }}
                />
                <img
                  src={banner.image}
                  alt={banner.label}
                  className="relative z-10 w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
 
              {/* Label */}
              <div className="text-center">
                <p className="font-bold text-[var(--color-text-heading)] text-sm md:text-base">
                  {banner.label}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {banner.sub}
                </p>
              </div>
            </a>
          ))}
        </div>
 
        {/* View all link */}
        <div className="mt-10 text-center">
          <a
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            View All Products →
          </a>
        </div>
      </div>
    </section>
  )
}


// ─── Home component ──────────────────────────────────
export default function Home() {
  // Initial cache reads
  const initialCompanies = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? []),
    []
  )
  const initialSuggestedProducts = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Product[]>(SUGGESTED_PRODUCTS_KEY, MAX_AGE) ?? []),
    []
  )
  const initialAllProducts = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Product[]>(ALL_PRODUCTS_KEY, MAX_AGE) ?? []),
    []
  )
  const initialReviews = useMemo(
    () => (typeof window === "undefined" ? [] : getCachedSync<Review[]>(REVIEWS_KEY, MAX_AGE) ?? []),
    []
  )

  // State
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>(initialSuggestedProducts)
  const [allProducts, setAllProducts] = useState<Product[]>(initialAllProducts)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [loading, setLoading] = useState(initialAllProducts.length === 0)
  const [selectedConcernCompany, setSelectedConcernCompany] = useState<Company | null>(null)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [showTopButton, setShowTopButton] = useState(false)
  const [waMenuOpen, setWaMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)

  const waMenuRef = useRef<HTMLDivElement | null>(null)
  const waButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => { setIsClient(true) }, [])

  const dummyReviews: Review[] = [
    {
      id: "1",
      productName: "Natural Glow Face Cream",
      productImage: "",
      productId: "",
      customerName: "Priya S.",
      rating: 5,
      comment: "My skin feels amazing after just one week! Totally recommend it.",
      company: BRAND.name,
    },
  ]

  // ── Effect hooks ───────────────────────────────────
  useEffect(() => {
    let mounted = true
    const loadCompanies = async () => {
      try {
        const data = await fetchWithCache<Company[]>(COMPANIES_KEY, fetchCompaniesAPI, {
          ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
        })
        if (!mounted) return
        setCompanies(data)
        if (data.length > 0) {
          const nezalCompany = data.find((c) => c.name.toLowerCase() === "nezal" || c.slug === "nezal")
          setSelectedConcernCompany(nezalCompany || data[0])
        } else {
          setSelectedConcernCompany(null)
        }
      } catch (err) { console.error("Error fetching companies:", err) }
    }
    loadCompanies()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadSuggested = async () => {
      try {
        const data = await fetchWithCache<Product[]>(SUGGESTED_PRODUCTS_KEY, fetchSuggestedProductsAPI, {
          ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
        })
        if (!mounted) return
        data.sort((a, b) => {
          const aIsNezal = a.company.name.toLowerCase() === "nezal"
          const bIsNezal = b.company.name.toLowerCase() === "nezal"
          if (aIsNezal && !bIsNezal) return -1
          if (!aIsNezal && bIsNezal) return 1
          return 0
        })
        setSuggestedProducts(data)
      } catch (err) { console.error("Error fetching suggested products:", err) }
    }
    loadSuggested()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadAllProducts = async () => {
      setLoading(true)
      try {
        const data = await fetchWithCache<Product[]>(ALL_PRODUCTS_KEY, fetchAllProductsAPI, {
          ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
        })
        if (!mounted) return
        data.sort((a, b) => {
          const aIsNezal = a.company.name.toLowerCase() === "nezal"
          const bIsNezal = b.company.name.toLowerCase() === "nezal"
          if (aIsNezal && !bIsNezal) return -1
          if (!aIsNezal && bIsNezal) return 1
          return 0
        })
        setAllProducts(data)
      } catch (err) { console.error("Error fetching all products:", err) } finally {
        if (mounted) setLoading(false)
      }
    }
    loadAllProducts()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadReviews = async () => {
      try {
        const data = await fetchWithCache<Review[]>(REVIEWS_KEY, fetchReviewsAPI, {
          ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
        })
        if (!mounted) return
        if (Array.isArray(data) && data.length > 0) setReviews(data)
        else setReviews(dummyReviews)
      } catch (err) { console.error("Error fetching reviews:", err); setReviews(dummyReviews) }
    }
    loadReviews()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (reviews.length === 0) return
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [reviews])

  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!waMenuRef.current) return
      if (waButtonRef.current && waButtonRef.current.contains(target)) return
      if (!waMenuRef.current.contains(target)) setWaMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setWaMenuOpen(false) }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("touchstart", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("touchstart", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  const PRIMARY_WA = BRAND.whatsapp.primary
  const SECONDARY_WA = BRAND.whatsapp.secondary
  const buildWaLink = (number: string) => `https://wa.me/${number}`
  const openWaFor = (number: string) => {
    window.open(buildWaLink(number), "_blank", "noopener,noreferrer")
    setWaMenuOpen(false)
  }

  // ── JSX ────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Carousel */}
      <section className="w-full">
        <HomeCarousel />
      </section>

      {/* Scrolling Ticker – black strip with gold stars */}
      <div className="overflow-hidden py-2.5 bg-[#1A1A1A]">
        <div className="ticker-track select-none">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((text, i) => (
            <span key={i} className="flex items-center gap-6 shrink-0">
              <span className="text-[13px] font-medium uppercase tracking-[0.05em] whitespace-nowrap text-white">
                {text}
              </span>
              <span className="text-base text-[#F5C842]">✦</span>
            </span>
          ))}
        </div>
      </div>

   {/* Shop By Category (includes trust bar above it) */}
{selectedConcernCompany && (
  <ShopByCategory
    companyId={selectedConcernCompany._id}
    companySlug={selectedConcernCompany.slug}
  />
)}

      {/* Secondary carousel (company carousel) */}
      <section className="py-12 md:py-16 bg-muted">
        <div className="container-nezal">
          <div className="text-center mb-8">
            <h2 className="text-[28px] md:text-[32px] font-bold text-foreground mb-2">
              Nature&apos;s Goodness
            </h2>
            <p className="text-[15px] text-muted-foreground">
              Explore our complete herbal collection
            </p>
          </div>

          {/* Suggested products grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {!isClient || suggestedProducts.length === 0
              ? [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl animate-pulse bg-muted-foreground/20"
                    style={{ height: 280 }}
                  />
                ))
              : suggestedProducts.map((product) => (
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
        </div>
      </section>



<PromoBannerGrid />







    {/* 25% Off — limited preview with View More */}
<section className="py-12 md:py-16 bg-background">
  <div className="container-nezal">
 
    {/* Heading */}
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-xs font-bold uppercase tracking-widest mb-3">
        <span>✦</span> Limited Time
      </div>
      <h2 className="text-[28px] md:text-[32px] font-bold text-foreground">
        25% Off Site-Wide
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use code <span className="font-bold text-[var(--color-brand-primary)]">NEZAL25</span> at checkout
      </p>
    </div>
 
    {/* Product grid — show 8 or all */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {!isClient || loading
        ? [...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse bg-muted-foreground/20"
              style={{ height: 280 }}
            />
          ))
        : allProducts.length === 0
        ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No products available at the moment</p>
          </div>
        )
        : (showAllProducts ? allProducts : allProducts.slice(0, 8)).map((product) => (
            <ProductCard
              key={product._id}
              id={product._id}
              name={product.name}
              price={product.price}
              discountPrice={product.discountPrice}
              image={product.image}
              company={product.company}
              size="sm"
            />
          ))}
    </div>
 
    {/* View More / View Less button */}
    {!loading && allProducts.length > 8 && (
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          onClick={() => setShowAllProducts((v) => !v)}
          className="group inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] font-semibold text-sm hover:bg-[var(--color-brand-primary)] hover:text-white transition-all duration-200"
        >
          {showAllProducts ? (
            <>Show Less <span className="transition-transform group-hover:-translate-y-0.5">↑</span></>
          ) : (
            <>View All {allProducts.length} Products <span className="transition-transform group-hover:translate-y-0.5">↓</span></>
          )}
        </button>
        {!showAllProducts && (
          <p className="text-xs text-muted-foreground">
            Showing 8 of {allProducts.length} products
          </p>
        )}
      </div>
    )}
  </div>
</section>

      {/* Our Aim section */}
      <section className="py-12 md:py-16 bg-muted">
        <div className="container-nezal">
          <div className="text-center mb-8">
            <h2 className="text-[28px] md:text-[32px] font-bold text-primary">
              Our Aim
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-8 items-center rounded-2xl overflow-hidden border border-border p-6 lg:p-10 bg-card">
            <div className="flex-1 space-y-4">
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Introducing Nezal, the luxurious brand that deals with a range of natural skincare
                products. If you&apos;re looking to take your beauty routine to the next level, then
                look no further than Nezal. Our products are made with only the finest ingredients
                and are designed to nourish and revitalize your skin. Trust us, your skin will thank
                you for using Nezal!
              </p>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Nezal is a range of natural products for enhancing and preserving your original
                beauty. Nezal&apos;s products are made with natural ingredients and are free from harsh
                chemicals. They are gentle on the skin and help to keep your skin looking young and
                radiant.
              </p>
            </div>
            <div className="w-full lg:w-80 shrink-0">
              <img
                src="/companylogo.png"
                alt="Nezal products"
                className="w-full h-56 lg:h-64 object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 md:py-16">
        <WhyChoose />
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-16 bg-muted">
      <AnimatedTestimonials />
      </section>

      {/* Floating buttons */}
      <div className="fixed left-4 bottom-6 z-50 flex flex-col gap-3">
        {/* Amazon */}
        <a
          href="https://www.amazon.in/stores/NEZAL/page/C2DBA1DC-D672-44B2-A08C-633F5CDBA91A"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Shop on Amazon"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-md border border-border transition-all hover:shadow-lg"
        >
          <img
            src="https://static.vecteezy.com/system/resources/thumbnails/050/816/837/small/amazon-shopping-transparent-icon-free-png.png"
            alt="Amazon"
            className="w-6 h-6 object-contain"
          />
        </a>

        {/* WhatsApp */}
        <div className="relative" ref={waMenuRef}>
          <button
            ref={waButtonRef}
            onClick={() => setWaMenuOpen((s) => !s)}
            aria-label="Chat on WhatsApp"
            className="flex items-center justify-center w-12 h-12 rounded-full text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
            style={{ background: "#25D366" }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
          </button>

          <div
            className={`absolute left-0 bottom-14 z-50 w-56 rounded-xl shadow-xl bg-card border border-border transition-all transform origin-bottom-left ${
              waMenuOpen
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div className="py-2">
              <button
                onClick={() => openWaFor(PRIMARY_WA)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "#25D366" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <div>
                  <p className="font-medium text-[13px] text-foreground">
                    Chat with {BRAND.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{PRIMARY_WA}</p>
                </div>
              </button>
              <button
                onClick={() => openWaFor(SECONDARY_WA)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "#3b82f6" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 12v6a2 2 0 01-2 2H6l-4 4V6a2 2 0 012-2h16a2 2 0 012 2z" />
                </svg>
                <div>
                  <p className="font-medium text-[13px] text-foreground">
                    Chat with Support
                  </p>
                  <p className="text-[11px] text-muted-foreground">{SECONDARY_WA}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`fixed right-6 bottom-6 z-50 flex items-center justify-center w-12 h-12 rounded-full text-primary-foreground shadow-lg transition-all duration-300 ${
          showTopButton ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"
        }`}
        style={{ background: "var(--color-brand-primary)" }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </main>
  )
}