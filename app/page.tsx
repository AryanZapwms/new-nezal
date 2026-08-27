// app/page.tsx
// Server Component — data is fetched on the server, page arrives pre-rendered.
// No skeleton flash, no client-side waterfall, no 100-product fetch.

import { Suspense } from "react"
import { HomeCarousel } from "@/components/home-carousel"
import { ShopByCategory } from "@/components/shop-by-category"
import WhyChoose from "@/components/why-choose"
import { ShopByConcern } from "@/components/ShopByConcern"
import { DiscoverRituals } from "@/components/DiscoverRituals"
import { DiscoverIngredients } from "@/components/DiscoverIngredients"
import { AnimatedTestimonials } from "@/components/AnimatedTestimonials"
import { BRAND } from "@/lib/config"
import { connectDB } from "@/lib/db"
import HomeClient from "@/components/HomeClient"
import FlashDeal from "@/components/FlashDeal"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"
import { TrustBar } from "@/components/TrustBar"
import { HeroProducts } from "@/components/hero-products"

// This page reads straight from MongoDB (not via Next's fetch cache), so
// without this it gets statically rendered once at build/deploy time and
// never picks up admin changes (banners, products, etc.) on its own —
// only revalidatePath() calls from the admin routes, or this timer, refresh it.
export const revalidate = 60

// ── Server-side data fetching ─────────────────────────────────────────────────
// All fetches run in PARALLEL on the server. The page HTML arrives
// fully populated — zero client waterfalls.

async function getHomeData() {
  try {
    await connectDB()

    const { Product }   = await import("@/lib/models/product")
    const { Company }   = await import("@/lib/models/company")
    const { Review }    = await import("@/lib/models/review")
    const { FlashSale } = await import("@/lib/models/flashsale")
    const { HomeBanner } = await import("@/lib/models/homeBanner")

    const now = new Date()

    const [companiesRaw, productsRaw, reviewsRaw, flashSalesRaw, bannersRaw] = await Promise.all([
  Company.find({}).sort({ name: 1 }).lean(),

  Product.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("company", "name slug _id")
    .lean(),

  Review.find({ status: "approved" })
    .sort({ rating: -1, createdAt: -1 })
    .limit(10)
    .populate("product", "name image")
    .populate("company", "name")
    .lean(),

  FlashSale.find({
    isActive:  true,
    startsAt:  { $lte: now },
    endsAt:    { $gte: now },
  })
    .populate({
      path:     "products",
      select:   "name slug price discountPrice image images company stock",
      populate: { path: "company", select: "name slug" },
    })
    .lean(),

  HomeBanner.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
])
    const s = (obj: any) => JSON.parse(JSON.stringify(obj))

    const companies  = s(companiesRaw)
    const reviews    = s(reviewsRaw)
    const flashSales = s(flashSalesRaw)
    const banners = s(bannersRaw)

    // ── Merge in flash-sale pricing so these 8 products carry the same
    //    discountPrice / flashSale data as every other listing, in case
    //    they get rendered (see note in chat — they currently aren't). ──
    const flashSaleMap = await getActiveFlashSaleMap()
    const products = applyFlashSaleToList(s(productsRaw), flashSaleMap)

    const nezalCompany =
      companies.find((c: any) => c.slug === "nezal" || c.name?.toLowerCase() === "nezal") ??
      companies[0] ?? null

    const activeSale = flashSales.find((s: any) => s.products?.length > 0) ?? null

    return { companies, products, reviews, nezalCompany, activeSale, banners }
 } catch (err) {
  console.error("Home page data fetch error:", err)
  return { companies: [], products: [], reviews: [], nezalCompany: null, activeSale: null, banners: [] }
}
}

// ── Promo banners (static, no fetch needed) ───────────────────────────────────
const PROMO_BANNERS = [
  { image: "https://nezal-cdn.b-cdn.net/products/6a0d9d9edf37fac29c20d5ac/rwzzisquhzzalhdngf9z.jpg", label: "Face Wash", sub: "From ₹199", href: "/collections/foaming-face-wash" },
  { image: "https://nezal-cdn.b-cdn.net/misc/promo-banners/hair_serum_i7llmw.jpg", label: "Hair Serum", sub: "Reduce Hair Fall", href: "/collections/hair-serum" },
  { image: "https://nezal-cdn.b-cdn.net/misc/promo-banners/lotion_wrjr9l.jpg", label: "Body Lotion", sub: "All-Day Hydration", href: "/collections/body-lotion" },
  { image: "https://nezal-cdn.b-cdn.net/products/6a0d7e252f7e0d5d2c727cbf/db5xjbpwpnmb6uf6yep6.jpg", label: "Massage Oil", sub: "Relax & Restore", href: "/collections/body-massage-oil" },
  { image: "https://nezal-cdn.b-cdn.net/products/6a0d9d9edf37fac29c20d5a6/klcvgxsephlxhm6n4xib.jpg", label: "Face Cream", sub: "Deep Nourishment", href: "/collections/face-serum" },
  { image: "https://nezal-cdn.b-cdn.net/products/6a0d7e252f7e0d5d2c727cd6/vz9jkgrr5tdccprgfl5a.jpg", label: "Bath Salts", sub: "Turn Bath Into Ritual", href: "/collections/bath-salt" },
]

const TICKER_ITEMS = ["Own Manufacturing", "Crafted With Care", "Quality Tested Formulations", "Inhouse Saponification", "Modern Botanical Ingredents"]

function PromoBannerGrid() {
  return (
    <section className="py-12 md:py-10 bg-[#FAFAF8]">
      <div className="container-nezal">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            Our Collection
          </span>
          <h2 className="mt-2 text-[28px] md:text-[32px] font-bold text-[var(--color-text-heading)]">
            Shop by Collection
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {PROMO_BANNERS.map((banner) => (
            <a key={banner.href} href={banner.href} className="group flex flex-col items-center gap-3">
              <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-white border border-[var(--color-border)] shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(42,122,91,0.10),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <img
                  src={banner.image}
                  alt={banner.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[1.5deg]"
                />
              </div>
              <div className="text-center transition-all duration-300 group-hover:-translate-y-1">
                <p className="font-bold text-[var(--color-text-heading)] text-sm md:text-base">{banner.label}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{banner.sub}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[#0d600e] hover:text-white border px-3 py-2 rounded-xl">
            View All Products →
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Page (Server Component) ───────────────────────────────────────────────────
export default async function Home() {
const { companies, products, reviews, nezalCompany, activeSale, banners } = await getHomeData()

const testimonials = reviews.slice(0, 8).map((r: any) => ({
  id:      r._id,
  name:    r.userName || "Anonymous",
  role:    "Verified Buyer",
  avatar:  "/placeholder-user.jpg",
  rating:  typeof r.rating === "number" ? r.rating : 5,
  quote:   r.comment || "",
  product: r.product?.name || "Nezal Product",
}))

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">

      {/* Hero Carousel */}
     <section id="home-hero" className="w-full">
         <HomeCarousel images={banners} />
      </section>

      {/* Scrolling Ticker */}
      <div className="overflow-hidden py-2.5 bg-[#1A1A1A]">
        <div className="ticker-track select-none">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((text, i) => (
            <span key={i} className="flex items-center gap-6 shrink-0">
              <span className="text-[13px] font-medium uppercase tracking-[0.05em] whitespace-nowrap text-white">{text}</span>
              <span className="text-base text-[#F5C842] px-3">✦</span>
            </span>
          ))}
        </div>
      </div>

     {/* Flash Deal — products pre-rendered, no skeleton */}
      {activeSale && <FlashDeal sale={activeSale} />}

      {/* Hero Products */}
          <HeroProducts />

          {/* Shop By Concern */}
      <ShopByConcern />

      {/* Discover Rituals */}
      <DiscoverRituals />

      {/* Shop By Category */}
      {nezalCompany && (
        <ShopByCategory companyId={nezalCompany._id} companySlug={nezalCompany.slug} />
      )}



      

      

    

      {/* Promo Banner Grid */}
      <PromoBannerGrid />

      {/* Discover Ingredients */}
      <DiscoverIngredients />

     <TrustBar />

      {/* Why Choose Us */}

    

      <section className="py-12 md:py-8">
        <WhyChoose />
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-8 bg-muted">
        <AnimatedTestimonials testimonials={testimonials.length > 0 ? testimonials : undefined} />
      </section>

      {/* Floating buttons — needs client interactivity */}
      <HomeClient products={products} showFloatingButtons companies={companies} />

    </main>
  )
}