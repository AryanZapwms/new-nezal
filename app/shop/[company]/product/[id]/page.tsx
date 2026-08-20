// app/shop/[company]/product/[id]/page.tsx

"use client"

import { FormEvent, useCallback, useEffect, useRef, useState, useMemo, memo } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Star, ShoppingCart, Zap, Heart, Truck, RotateCcw, Leaf, Tag, ChevronLeft, ChevronRight, BadgeCheck, Clock, Package } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import ProductCard from "@/components/product-card"
import FAQ from "@/components/FAQ"
import { getCachedSync, fetchWithCache } from "@/lib/cacheClient"
import { trackViewContent, trackAddToCart } from "@/lib/facebook-pixel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import ProductDescription from "@/components/ProductDescription"
import ProductSections from "@/components/ProductSections"
import { useLoading } from "@/hooks/use-loading"
import { WishlistButton } from "@/components/wishlist-button"



// ── Cache config ──────────────────────────────────────────
const TTL = 1000 * 60 * 2          // 2 min in-memory TTL
const MAX_AGE = 1000 * 60 * 10     // 10 min max localStorage age (was 24h)

function productCacheKey(id: string) { return `product:${id}` }
function productReviewsCacheKey(id: string) { return `product:reviews:${id}` }

function suggestedProductsCacheKey(companySlug: string, productId: string, categorySlug?: string) {
  return `suggested:products:${companySlug}:${categorySlug || "none"}:${productId}`
}

// ── Countdown helper ───────────────────────────────────────
function getTimeRemaining(endsAt: string) {
  const total = new Date(endsAt).getTime() - Date.now()
  if (total <= 0) return null
  const hours = Math.floor(total / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { hours, minutes, seconds, total }
}

function getFlashPrice(basePrice: number, flashSale?: Product["flashSale"] | null) {
  if (!flashSale) return undefined
  return Math.round(basePrice - (basePrice * flashSale.discountPercent) / 100)
}

// ── Amazon affiliate link helper ───────────────────────────
// Set NEXT_PUBLIC_AMAZON_AFFILIATE_TAG in your env once you have an
// Amazon Associates tag (e.g. "nezal-21"). Until then, the raw URL is used as-is.
function buildAmazonLink(rawUrl: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG
  if (!tag) return rawUrl
  try {
    const url = new URL(rawUrl)
    url.searchParams.set("tag", tag)
    return url.toString()
  } catch {
    return rawUrl // malformed URL saved in admin — fall back to as-is rather than break the button
  }
}

// ── API helpers ───────────────────────────────────────────
async function fetchProductAPI(id: string): Promise<Product> {
  // retry once on failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/products/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`)
      const data = await res.json()
      if (!data || !data._id) throw new Error("Invalid product data")
      return data
    } catch (err) {
      if (attempt === 1) throw err
      await new Promise(r => setTimeout(r, 600))  // wait 600ms then retry
    }
  }
  throw new Error("Unreachable")
}

async function fetchProductReviewsAPI(id: string): Promise<{ reviews: any[]; summary: any }> {
  try {
    const res = await fetch(`/api/products/${id}/reviews`, { cache: "no-store" })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch reviews: ${res.status}`)
    }
    return res.json()
  } catch (error) {
    console.error("Error in fetchProductReviewsAPI:", error)
    throw error
  }
}

async function fetchSuggestedProductsAPI(
  companySlug: string,
  productId: string,
  categorySlug?: string
): Promise<SuggestedProduct[]> {
  const TARGET = 6
  const excludeIds = [productId]
  let results: SuggestedProduct[] = []

  // 1) Prefer products from the SAME CATEGORY (most relevant)
  if (categorySlug) {
    const catParams = new URLSearchParams({
      category: categorySlug,
      limit: String(TARGET),
      exclude: excludeIds.join(","),
    })
    const catRes = await fetch(`/api/products?${catParams}`, { cache: "no-store" })
    if (catRes.ok) {
      const catData = await catRes.json()
      results = catData.products || []
      excludeIds.push(...results.map((p: SuggestedProduct) => p._id))
    }
  }

  // 2) Fill any remaining slots with same-company products
  if (results.length < TARGET) {
    const remaining = TARGET - results.length
    const companyParams = new URLSearchParams({
      company: companySlug,
      limit: String(remaining),
      exclude: excludeIds.join(","),
    })
    const companyRes = await fetch(`/api/products?${companyParams}`, { cache: "no-store" })
    if (companyRes.ok) {
      const companyData = await companyRes.json()
      results = [...results, ...(companyData.products || [])]
    }
  }

  return results
}

// ── Types ─────────────────────────────────────────────────
interface Result { image: string; title: string; text: string }

interface Size {
  _id?: string
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
}

interface Product {
  _id: string
  name: string
  description: string
  price: number
  discountPrice?: number
  salePercentage?: number | null
  mrp?: string | number
  image: string
  images: string[]
  stock: number
  ingredients: string[]
  benefits: string[]
  usage: string
  suitableFor?: string[]
  results?: Result[]
  company?: { name: string; slug: string }
  category?: { name: string; slug: string }
  sizes?: Size[]
  updatedAt?: string
  whyYoullLoveIt?: string[]
  fragranceExp?: string[]
  whoIsItFor?: string
  skinHairConcern?: string
  expectedResults?: string
  keyIngredients?: { name: string; benefit: string }[]
  amazonUrl?: string
  isBestSeller?: boolean
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

interface SuggestedProduct {
  _id: string
  name: string
  price: number
  discountPrice?: number
  salePercentage?: number | null
  image: string
  company: { name: string; slug: string }
  isBestSeller?: boolean
  stock?: number
  sizes?: Size[]
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

type RatingKey = 1 | 2 | 3 | 4 | 5

interface ReviewSummary {
  total: number
  averageRating: number
  ratingCounts: Record<RatingKey, number>
}

interface ProductReview {
  id: string
  productId: string
  userId: string
  rating: number
  comment: string
  userName: string
  userEmail: string
  reply: { message: string; repliedAt: string; repliedBy: string; repliedByName: string } | null
  createdAt: string
  updatedAt: string
}

const defaultReviewSummary: ReviewSummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
}

function parseReviewSummary(summary: any): ReviewSummary {
  if (!summary) return { ...defaultReviewSummary, ratingCounts: { ...defaultReviewSummary.ratingCounts } }
  return {
    total: typeof summary.total === "number" ? summary.total : 0,
    averageRating: typeof summary.averageRating === "number" ? summary.averageRating : 0,
    ratingCounts: {
      1: summary.ratingCounts?.[1] ?? 0,
      2: summary.ratingCounts?.[2] ?? 0,
      3: summary.ratingCounts?.[3] ?? 0,
      4: summary.ratingCounts?.[4] ?? 0,
      5: summary.ratingCounts?.[5] ?? 0,
    },
  }
}

function parseProductReview(review: any): ProductReview {
  const resolveId = (value: any) => {
    if (typeof value === "string") return value
    if (value?._id) return value._id.toString()
    if (typeof value?.toString === "function") return value.toString()
    return ""
  }
  const reply = review?.reply
    ? {
        message: typeof review.reply.message === "string" ? review.reply.message : "",
        repliedAt:
          typeof review.reply.repliedAt === "string"
            ? review.reply.repliedAt
            : review.reply.repliedAt instanceof Date
              ? review.reply.repliedAt.toISOString()
              : "",
        repliedBy: resolveId(review.reply.repliedBy),
        repliedByName: typeof review.reply.repliedByName === "string" ? review.reply.repliedByName : "",
      }
    : null
  return {
    id: resolveId(review?.id ?? review?._id),
    productId: resolveId(review?.productId ?? review?.product),
    userId: resolveId(review?.userId ?? review?.user),
    rating: Number(review?.rating) || 0,
    comment: typeof review?.comment === "string" ? review.comment : "",
    userName: typeof review?.userName === "string" ? review.userName : "",
    userEmail: typeof review?.userEmail === "string" ? review.userEmail : "",
    reply: reply && reply.message ? reply : null,
    createdAt:
      typeof review?.createdAt === "string"
        ? review.createdAt
        : review?.createdAt instanceof Date
          ? review.createdAt.toISOString()
          : "",
    updatedAt:
      typeof review?.updatedAt === "string"
        ? review.updatedAt
        : review?.updatedAt instanceof Date
          ? review.updatedAt.toISOString()
          : "",
  }
}

// ── Star renderer ─────────────────────────────────────────
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={
            s <= Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : s - 0.5 <= rating
              ? "fill-amber-200 text-amber-400"
              : "fill-gray-200 text-gray-300"
          }
        />
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════
const ProductDetailPage = memo(function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const router = useRouter()  
  const { withLoading } = useLoading()

 const initialProduct = null
const initialReviews = null

  // ── State ──────────────────────────────────────────────
  const [product, setProduct] = useState<Product | null>(null)
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>(defaultReviewSummary)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [ratingInput, setRatingInput] = useState<RatingKey | 0>(0)
  const [hoverRating, setHoverRating] = useState<RatingKey | 0>(0)
  const [comment, setComment] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [activeTab, setActiveTab] = useState<"description" | "ingredients" | "benefits" | "usage">("description")
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)
  const [wishlist, setWishlist] = useState(false)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const reviewsFetchRef = useRef(false)


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const container = imageContainerRef.current
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  setZoomPosition({ x, y })
}



      // ── Flash sale countdown ticker ─────────────────────────
      useEffect(() => {
        if (!product?.flashSale?.endsAt) {
          setTimeLeft(null)
          return
        }
        const tick = () => setTimeLeft(getTimeRemaining(product.flashSale!.endsAt))
        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
      }, [product?.flashSale?.endsAt])





  // ── Effects ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function loadProduct() {
      if (!id) return
      setLoading(true)
      try {

        const data = await fetchWithCache<Product>(
        productCacheKey(id),
        () => fetchProductAPI(id),
        {
    ttlMs: TTL,
    maxAgeMs: MAX_AGE,
    backgroundRefresh: true,
    persistToStorage: true,
    validateBeforeUse: (d) => !!d && !!d._id,  // ← eject bad cache entries
  }
        )
        if (!mounted) return
        setProduct(data)

        trackViewContent(data._id, data.name, data.discountPrice || data.price)
        if (data?.company?.slug) loadSuggested(data.company.slug, data.category?.slug)
      } catch (err) {
        console.error("Error fetching product:", err)
        if (mounted) setProduct(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    async function loadSuggested(companySlug: string, categorySlug?: string) {
  try {
    const data = await fetchWithCache<SuggestedProduct[]>(
      suggestedProductsCacheKey(companySlug, id, categorySlug),
      () => fetchSuggestedProductsAPI(companySlug, id, categorySlug),
      { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
    )
    if (mounted) setSuggestedProducts(data)
  } catch (err) {
    console.error("Error fetching suggested products:", err)
  }
}
    loadProduct()
    return () => { mounted = false }
  }, [id])

  const loadReviews = useCallback(async () => {
    if (!id || reviewsFetchRef.current) return
    reviewsFetchRef.current = true
    setReviewsLoading(true)
    try {
      const data = await fetchWithCache<{ reviews: any[]; summary: any }>(
        productReviewsCacheKey(id),
        () => fetchProductReviewsAPI(id),
        { ttlMs: TTL * 2, maxAgeMs: MAX_AGE, backgroundRefresh: false, persistToStorage: true }
      )
      setReviews((data.reviews || []).map(parseProductReview))
      setReviewSummary(parseReviewSummary(data.summary))
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setReviews([])
      setReviewSummary({ ...defaultReviewSummary, ratingCounts: { ...defaultReviewSummary.ratingCounts } })
    } finally {
      reviewsFetchRef.current = false
      setReviewsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setUserName(session.user.name)
      if (session.user.email) setUserEmail(session.user.email)
    }
  }, [session])

  useEffect(() => {
  loadReviews()
}, [loadReviews]);

  useEffect(() => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      const first = product.sizes.find((s) => s.stock > 0)
      if (first) setSelectedSize(first)
    }
  }, [product, selectedSize])

  // ── Handlers ───────────────────────────────────────────
  const handleAddToCart = () => {
    if (!product) return
    if (getTotalItems() >= 5) { setShowBulkOrderModal(true); return }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({ title: "Select a size", description: "Please choose a size before adding to cart.", variant: "destructive" })
      return
    }
    const stock = selectedSize ? selectedSize.stock : product.stock
    if (stock === 0) {
      toast({ title: "Out of stock", description: "This item is currently out of stock.", variant: "destructive" })
      return
    }
 addItem({
  productId: product._id,
  name: product.name,
  price: currentPrice,
  discountPrice: currentDiscountPrice,
  image: product.image,
  quantity,
  company: product.company || { name: "Unknown", slug: "unknown" },
  selectedSize: selectedSize
    ? { ...selectedSize, discountPrice: currentDiscountPrice }
    : undefined,
  flashSale: product.flashSale,
})
const itemPrice = currentPrice
const itemDiscountPrice = currentDiscountPrice
    
    trackAddToCart(product._id, product.name, itemDiscountPrice || itemPrice, quantity)
    toast({ title: "Added to cart!", description: `${quantity} × ${product.name}${selectedSize ? ` (${selectedSize.size}${selectedSize.unit})` : ""} added.` })
    setQuantity(1)
  }

 const handleShopNow = () => {
  if (!product) return

  // ← removed: the !session?.user redirect block

  if (product.sizes && product.sizes.length > 0 && !selectedSize) {
    toast({
      title: "Select a size",
      description: "Please choose a size before purchasing.",
      variant: "destructive"
    })
    return
  }

  if (isOutOfStock) return

addItem({
  productId: product._id,
  name: product.name,
  price: currentPrice,
  discountPrice: currentDiscountPrice,
  image: product.image,
  quantity,
  company: product.company || { name: "Unknown", slug: "unknown" },
  selectedSize: selectedSize
    ? { ...selectedSize, discountPrice: currentDiscountPrice }
    : undefined,
  flashSale: product.flashSale,
})

router.push("/checkout")
}

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id) return
    if (!session?.user?.id) {
      toast({ title: "Login required", description: "Please sign in to submit a review.", variant: "destructive" })
      return
    }
    if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" })
      return
    }
    if (!comment.trim()) {
      toast({ title: "Comment required", description: "Please enter your review.", variant: "destructive" })
      return
    }
    if (!userName.trim() || !userEmail.trim()) {
      toast({ title: "Details required", description: "Please provide your name and email.", variant: "destructive" })
      return
    }
    setSubmittingReview(true)
    await withLoading(async () => { 
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingInput, comment, userName, userEmail }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to submit review" }))
        toast({ title: "Review failed", description: error.error || "Could not submit review", variant: "destructive" })
        return
      }
      const data = await res.json()
      setRatingInput(0)
      setHoverRating(0)
      setComment("")
        toast({
          title: "Review submitted!",
          description: "Thank you! Your review will appear after our team verifies it.",
        })

    } catch (err) {
      toast({ title: "Review failed", description: "Could not submit review.", variant: "destructive" })
    } finally {
      setSubmittingReview(false)
    }
     }, "Submitting your review...") 
  }

  const ratingPercentage = useCallback(
    (rating: RatingKey) => {
      if (!reviewSummary.total) return 0
      return Math.round((reviewSummary.ratingCounts[rating] / reviewSummary.total) * 100)
    },
    [reviewSummary]
  )

  // ── Derived ────────────────────────────────────────────
      const currentPrice = selectedSize ? selectedSize.price : (product?.price ?? 0)
      // product.discountPrice already reflects whichever sale (flash, direct,
      // or collection — see lib/sale.ts) is currently in effect on the base
      // price. Sizes carry their own legacy per-size discountPrice
      // independently, so a product-level sale would otherwise never show up
      // once a size is selected — derive the sale's percentage-off here and
      // apply it to the selected size's own price instead.
      const basePrice = product?.price ?? 0
      const percentOff =
  product?.salePercentage != null && product.salePercentage > 0
    ? product.salePercentage / 100
    : product?.discountPrice != null && product.discountPrice < basePrice && basePrice > 0
    ? (basePrice - product.discountPrice) / basePrice
    : 0

      const currentDiscountPrice = product?.flashSale
        ? getFlashPrice(currentPrice, product.flashSale)
        : selectedSize
        ? selectedSize.discountPrice ?? (percentOff > 0 ? Math.round(selectedSize.price * (1 - percentOff)) : undefined)
        : product?.discountPrice
      const displayPrice = currentDiscountPrice || currentPrice
      const discount = product?.flashSale
  ? Math.round(product.flashSale.discountPercent)
  : product?.salePercentage != null && product.salePercentage > 0
  ? Math.round(product.salePercentage)
  : currentDiscountPrice
  ? Math.round(((currentPrice - currentDiscountPrice) / currentPrice) * 100)
  : 0
      const hasSizes = product?.sizes && product.sizes.length > 0
      const isOutOfStock = hasSizes ? !selectedSize || selectedSize.stock <= 0 : (product?.stock ?? 0) <= 0

  // ── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <Skeleton className="w-full aspect-square" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            </div>
            <div className="space-y-5">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-14 flex-1" />
                <Skeleton className="h-14 flex-1" />
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-2xl font-semibold text-gray-700">Product not found</p>
        <p className="text-gray-500">This product may have moved or is temporarily unavailable.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1e3a28" }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}

  const allImages = [
  ...(product.images || []),
  product.image,
].filter((img): img is string => typeof img === "string" && img.trim().length > 0)

const currentImage =
  allImages[selectedImage] || allImages[0] || null

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f7faf7" }}>

      {/* ── CATEGORY HEADING ── */}
      <div
        className="text-center py-5 border-b"
        style={{ backgroundColor: "#ffffff", borderColor: "#e2ece3" }}
      >
        <h2 className="text-xl font-semibold tracking-wide" style={{ color: "#1e3a28" }}>
          {product.category?.name ?? "Product"}
        </h2>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

        {/* ══════════════════════════════════════════════ */}
        {/* TOP SECTION: Images + Product Info            */}
        {/* ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* ── LEFT: Image Gallery ── */}
          <div className="space-y-4">

            {/* Main image */}
            <div
  ref={imageContainerRef}
  className="relative overflow-hidden rounded-2xl border cursor-zoom-in"
  style={{
    backgroundColor: "#ffffff",
    borderColor: "#dde8de",
    aspectRatio: "1 / 1",
  }}
  onMouseEnter={() => setIsZooming(true)}
  onMouseLeave={() => setIsZooming(false)}
  onMouseMove={handleMouseMove}
>
  {discount > 0 && (
    <div
      className="absolute top-4 left-4 z-10 text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
    >
      {discount}% OFF
    </div>
  )}

  {product.isBestSeller && (
    <div className="absolute -right-11 top-5 z-10 w-40 rotate-45 overflow-hidden">
      <div
        className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase tracking-wider shadow-md"
        style={{ backgroundColor: "#1a3a2a", color: "#e8cf9e" }}
      >
        <Star className="h-3.5 w-3.5 fill-current" />
        Best Seller
      </div>
    </div>
  )}

  {currentImage ? (
    <Image
      src={`${currentImage}?v=${product._id.slice(-6)}`}
      alt={product.name}
      fill
      className="object-contain p-8"
      priority
    />
  ) : (
    <div className="flex h-full items-center justify-center text-gray-400">
      No image available
    </div>
  )}

  {/* Zoom overlay — desktop only, appears on hover, pans with cursor */}
  {currentImage && (
    <div
      className="absolute inset-0 pointer-events-none transition-opacity duration-150 hidden lg:block"
      style={{
        opacity: isZooming ? 1 : 0,
        backgroundImage: `url(${currentImage}?v=${product._id.slice(-6)})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "220%",   // ← increase for a stronger zoom, decrease for subtler
        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
        backgroundColor: "#ffffff",
      }}
    />
  )}

  {/* Prev / Next arrows for mobile — unchanged */}
  {allImages.length > 1 && (
    <>
      <button
        onClick={() => setSelectedImage((i) => (i - 1 + allImages.length) % allImages.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border flex items-center justify-center lg:hidden"
        style={{ borderColor: "#dde8de" }}
        aria-label="Previous image"
      >
        <ChevronLeft className="w-4 h-4" style={{ color: "#1e3a28" }} />
      </button>
      <button
        onClick={() => setSelectedImage((i) => (i + 1) % allImages.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border flex items-center justify-center lg:hidden"
        style={{ borderColor: "#dde8de" }}
        aria-label="Next image"
      >
        <ChevronRight className="w-4 h-4" style={{ color: "#1e3a28" }} />
      </button>
    </>
  )}
</div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {allImages.filter(Boolean).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className="relative flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all duration-150"
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: selectedImage === idx ? "#2a5c3a" : "#dde8de",
                      transform: selectedImage === idx ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <Image src={img} alt={`View ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Description card (visible on desktop below images) */}
            <div
              className="hidden lg:block rounded-2xl border p-6 space-y-3"
              style={{ backgroundColor: "#f0f7f0", borderColor: "#d2e8d4" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#d2e8d4" }}
                >
                  <Package className="w-5 h-5" style={{ color: "#1e3a28" }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: "#1e3a28" }}>
                  Product Description
                </h3>
              </div>
             <ProductSections
  data={{
    whyYoullLoveIt:  product.whyYoullLoveIt,
    suitableFor:     product.suitableFor,
    fragranceExp:    product.fragranceExp,
    whoIsItFor:      product.whoIsItFor,
    skinHairConcern: product.skinHairConcern,
    expectedResults: product.expectedResults,
    ingredients:     product.ingredients,
    keyIngredients:  product.keyIngredients,
  }}
/>
            </div>
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">

            {/* Brand + Name */}
            <div>
              {/* {product.company?.name && (
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-2"
                  style={{ color: "#2a5c3a" }}
                >
                  {product.company.name}
                </p>
              )} */}
              <h2 className="text-xs lg:text-3xl font-bold leading-tight" style={{ color: "#1e3a28" }}>
                {product.name}
              </h2>
              <ProductDescription description={product.description} className="mt-2" />
            </div>

            {/* Rating row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-bold" style={{ color: "#1e3a28" }}>
                {reviewSummary.averageRating.toFixed(1)}
              </span>
              <StarRating rating={reviewSummary.averageRating} size={16} />
              <a
                href="#reviews"
                className="text-sm underline underline-offset-2"
                style={{ color: "#2a5c3a" }}
              >
                {reviewSummary.total} review{reviewSummary.total !== 1 ? "s" : ""}
              </a>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#e0f0e4", color: "#1e6636" }}
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

{/* Price */}
<div
  className="rounded-2xl border p-5 space-y-1"
  style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
>
  {product.flashSale && timeLeft && (
    <div
      className="relative overflow-hidden rounded-2xl mb-4 p-4"
      style={{
        background: "linear-gradient(135deg, #E4432B 0%, #c0301c 100%)",
        boxShadow: "0 8px 24px rgba(228,67,43,0.35)",
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shine 2.5s linear infinite",
        }}
      />
      <style>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="relative flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">
              {product.flashSale.saleName || "Flash Sale"}
            </p>
            <p className="text-white/80 text-xs font-medium">
              {product.flashSale.discountPercent}% off — limited time only
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-white/70 mr-0.5" />
          {[
            { value: timeLeft.hours, label: "h" },
            { value: timeLeft.minutes, label: "m" },
            { value: timeLeft.seconds, label: "s" },
          ].map((unit, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="rounded-lg px-2.5 py-1.5 min-w-[42px] text-center"
                style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
              >
                <span className="text-white font-mono font-extrabold text-base tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="text-white/70 text-[10px] font-semibold ml-0.5">{unit.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

  <div className="flex items-baseline gap-3 flex-wrap">
    <span className="text-4xl font-extrabold" style={{ color: "#1e3a28" }}>
      ₹{displayPrice}
    </span>
    {currentDiscountPrice && (
      <span className="text-xl line-through" style={{ color: "#9cad9e" }}>
        ₹{currentPrice}
      </span>
    )}
    {discount > 0 && (
      <span
        className="text-sm font-semibold px-2.5 py-1 rounded-full border border-none bg-yellow-400 text-black"
       
      >
        {discount}% off
      </span>
    )}
  </div>
  <p className="text-xs" style={{ color: "#6b7c70" }}>Inclusive of all taxes</p>
</div>

            {/* Size selector */}
            {hasSizes && (
              <div>
                <div className="mb-3">
  <p className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
    Select Size
  </p>
</div>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes?.map((size, idx) => {
                    const isSel = selectedSize?.size === size.size && selectedSize?.unit === size.unit
                    const oos = size.stock <= 0
                   const displaySize = size.size.includes(size.unit)
  ? size.size
  : `${size.size}${size.unit}`;
                  
                    return (
                      <button
                        key={idx}
                        onClick={() => !oos && setSelectedSize(size)}
                        disabled={oos}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150"
                        style={{
                          backgroundColor: isSel ? "#1e3a28" : "#ffffff",
                          borderColor: isSel ? "#1e3a28" : "#c8dac9",
                          color: isSel ? "#ffffff" : oos ? "#b0c0b1" : "#1e3a28",
                          opacity: oos ? 0.5 : 1,
                          textDecoration: oos ? "line-through" : "none",
                          cursor: oos ? "not-allowed" : "pointer",
                        }}
                      >
                       {displaySize}
                        {product.flashSale
                          ? ` – ₹${getFlashPrice(size.price, product.flashSale)}`
                          : size.discountPrice
                          ? ` – ₹${size.discountPrice}`
                          : percentOff > 0
                          ? ` – ₹${Math.round(size.price * (1 - percentOff))}`
                          : ` – ₹${size.price}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity + stock */}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "#1e3a28" }}>
                Quantity
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div
                  className="flex items-center border-2 rounded-xl overflow-hidden"
                  style={{ borderColor: "#c8dac9", backgroundColor: "#ffffff" }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-xl font-bold transition-colors"
                    style={{ color: "#1e3a28" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f7f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-base font-bold" style={{ color: "#1e3a28" }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-11 flex items-center justify-center text-xl font-bold transition-colors"
                    style={{ color: "#1e3a28" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f7f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#1e6636" }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#1e6636" }} />
                  {isOutOfStock ? "Out of stock" : "In stock · Ships in 2 days"}
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">


                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-semibold transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: isOutOfStock ? "#c8dac9" : "#1e3a28",
                    color: "#ffffff",
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  disabled={isOutOfStock}
                  className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-semibold border-2 transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: isOutOfStock ? "#f0f7f0" : "#2a5c3a",
                    borderColor: isOutOfStock ? "#c8dac9" : "#2a5c3a",
                    color: "#ffffff",
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                  }}
                  onClick={handleShopNow} 
                >
                  <Zap className="w-5 h-5" />
                  Shop Now
                </button>
              </div>

              {product.amazonUrl && (
                <a
                  href={buildAmazonLink(product.amazonUrl)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: "#fff8ee",
                    borderColor: "#f0c14b",
                    color: "#111827",
                  }}
                >
                  <Image src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="" width={72} height={22} className="object-contain" />
                  Buy this product on Amazon
                </a>
              )}
            
              <WishlistButton
                productId={product._id}
                productName={product.name}
                productPrice={displayPrice}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border-2"
              />
            </div>

                

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Truck className="w-5 h-5" />, title: "Free Delivery", sub: "Orders ₹1399+" },
                { icon: <RotateCcw className="w-5 h-5" />, title: "Easy Return", sub: "7 Day Policy" },
                { icon: <Package className="w-5 h-5" />, title: "Bulk Purchase", sub: "Get Special Offers" },
              ].map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border p-4 flex flex-col items-center text-center gap-2"
                  style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#e0f0e4", color: "#1e3a28" }}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight" style={{ color: "#1e3a28" }}>
                      {b.title}
                    </p>
                    <p className="text-xs leading-tight mt-0.5" style={{ color: "#6b7c70" }}>
                      {b.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile description ── */}
        <div
          className="lg:hidden mt-8 rounded-2xl border p-5 space-y-3"
          style={{ backgroundColor: "#f0f7f0", borderColor: "#d2e8d4" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#d2e8d4" }}
            >
              <Leaf className="w-5 h-5" style={{ color: "#1e3a28" }} />
            </div>
            <h3 className="text-base font-semibold" style={{ color: "#1e3a28" }}>
              Product Description
            </h3>
          </div>
         <ProductSections
  data={{
    whyYoullLoveIt:  product.whyYoullLoveIt,
    suitableFor:     product.suitableFor,
    fragranceExp:    product.fragranceExp,
    whoIsItFor:      product.whoIsItFor,
    skinHairConcern: product.skinHairConcern,
    expectedResults: product.expectedResults,
    ingredients:     product.ingredients,
    keyIngredients:  product.keyIngredients,
  }}
/>
        </div>


        {/* ══════════════════════════════════════════════ */}
        {/* TABS SECTION                                  */}
        {/* ══════════════════════════════════════════════ */}
       

        {/* ══════════════════════════════════════════════ */}
        {/* REVIEWS SECTION                               */}
        {/* ══════════════════════════════════════════════ */}
        <section id="reviews" className="mt-10">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#1e3a28" }}>
            Customer Reviews
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Summary */}
            <div
              className="rounded-2xl border p-6 space-y-5"
              style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
            >
              <div className="flex items-end gap-4">
                <span className="text-6xl font-extrabold leading-none" style={{ color: "#1e3a28" }}>
                  {reviewSummary.averageRating.toFixed(1)}
                </span>
                <div>
                  <StarRating rating={reviewSummary.averageRating} size={20} />
                  <p className="text-sm mt-1" style={{ color: "#6b7c70" }}>
                    {reviewSummary.total} Reviews
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {([5, 4, 3, 2, 1] as RatingKey[]).map((r) => (
                  <div key={r} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-right" style={{ color: "#6b7c70" }}>
                      {r}
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#e8f0e9" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ratingPercentage(r)}%`,
                          backgroundColor: r >= 4 ? "#2a5c3a" : r === 3 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="w-8 text-xs" style={{ color: "#6b7c70" }}>
                      {ratingPercentage(r)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Write review form */}
            <div
              className="rounded-2xl border p-6"
              style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
            >
              <h3 className="font-semibold text-base mb-4" style={{ color: "#1e3a28" }}>
                Write a Review
              </h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star input */}
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#6b7c70" }}>
                    Your Rating
                  </p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingInput(s as RatingKey)}
                        onMouseEnter={() => setHoverRating(s as RatingKey)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            s <= (hoverRating || ratingInput)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="px-3 py-2.5 text-sm rounded-xl border outline-none focus:ring-2"
                    style={{
                      borderColor: "#c8dac9",
                      focusRingColor: "#1e3a28",
                    } as React.CSSProperties}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="px-3 py-2.5 text-sm rounded-xl border outline-none"
                    style={{ borderColor: "#c8dac9" }}
                  />
                </div>

                <textarea
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                  style={{ borderColor: "#c8dac9" }}
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: submittingReview ? "#c8dac9" : "#1e3a28",
                    color: "#ffffff",
                    cursor: submittingReview ? "wait" : "pointer",
                  }}
                >
                  {submittingReview ? "Submitting…" : "Submit Review"}
                </button>
              </form>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {reviewsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                : reviews.slice(0, 4).map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border p-4 space-y-2"
                      style={{ backgroundColor: "#f7faf7", borderColor: "#dde8de" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
                          >
                            {review.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
                            {review.userName}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: "#9cad9e" }}>
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>

                      <StarRating rating={review.rating} size={13} />

                      <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
                        {review.comment}
                      </p>

                      {review.reply && (
                        <div
                          className="mt-2 rounded-xl p-3 text-xs"
                          style={{ backgroundColor: "#e0f0e4", color: "#1e4d2e" }}
                        >
                          <span className="font-semibold">Nezal · </span>
                          {review.reply.message}
                        </div>
                      )}
                    </div>
                  ))}
              {reviews.length === 0 && !reviewsLoading && (
                <div
                  className="rounded-2xl border p-6 text-center text-sm"
                  style={{ borderColor: "#dde8de", color: "#6b7c70" }}
                >
                  No reviews yet. Be the first to review!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════ */}
        {/* SUGGESTED PRODUCTS                            */}
        {/* ══════════════════════════════════════════════ */}
      {/* SUGGESTED PRODUCTS */}
{suggestedProducts.length > 0 && (
  <section className="mt-14">
    <h2 className="text-2xl font-bold mb-6" style={{ color: "#1e3a28" }}>
      You May Also Like
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {suggestedProducts.map((p) => (
        <ProductCard
        key={p._id}
        id={p._id}
        name={p.name}
        price={p.price}
        discountPrice={p.discountPrice}
        salePercentage={p.flashSale?.discountPercent ?? p.salePercentage}
        image={p.image}
        company={p.company}
        stock={p.stock}
        sizes={p.sizes}
        flashSale={p.flashSale}
        isBestSeller={p.isBestSeller}
      />
      ))}
    </div>
  </section>
)}

        {/* FAQ */}
        <div className="mt-14">
          <FAQ />
        </div>
      </div>
    </main>
  )
})

ProductDetailPage.displayName = "ProductDetailPage"
export default ProductDetailPage