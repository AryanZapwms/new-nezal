// app/shop/[company]/product/[id]/page.tsx
"use client"

import { FormEvent, useCallback, useEffect, useRef, useState, useMemo, memo } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Star, ShoppingCart, Zap, Heart, Truck, RotateCcw, Leaf, Tag, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import ProductCard from "@/components/product-card"
import FAQ from "@/components/FAQ"
import { getCachedSync, fetchWithCache } from "@/lib/cacheClient"
import { trackViewContent, trackAddToCart } from "@/lib/facebook-pixel"
import { useToast } from "@/hooks/use-toast"

// ── Cache config ──────────────────────────────────────────
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

function productCacheKey(id: string) { return `product:${id}` }
function productReviewsCacheKey(id: string) { return `product:reviews:${id}` }
function suggestedProductsCacheKey(companySlug: string, productId: string) {
  return `suggested:products:${companySlug}:${productId}`
}

// ── API helpers ───────────────────────────────────────────
async function fetchProductAPI(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch product: ${res.status}`)
  const data = await res.json()
  if (!data || !data._id) throw new Error("Invalid product data")
  return data
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

async function fetchSuggestedProductsAPI(companySlug: string, productId: string): Promise<SuggestedProduct[]> {
  const params = new URLSearchParams({ company: companySlug, limit: "6", exclude: productId })
  const res = await fetch(`/api/products?${params}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch suggested products")
  const data = await res.json()
  return data.products || []
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
  category?: { name: string }
  sizes?: Size[]
}

interface SuggestedProduct {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { name: string; slug: string }
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

  const initialProduct = useMemo(() => getCachedSync<Product>(productCacheKey(id), MAX_AGE), [id])
  const initialReviews = useMemo(
    () => getCachedSync<{ reviews: any[]; summary: any }>(productReviewsCacheKey(id), MAX_AGE),
    [id]
  )

  // ── State ──────────────────────────────────────────────
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null)
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([])
  const [loading, setLoading] = useState(!initialProduct)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>(
    initialReviews ? (initialReviews.reviews || []).map(parseProductReview) : []
  )
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>(
    initialReviews ? parseReviewSummary(initialReviews.summary) : defaultReviewSummary
  )
  const [reviewsLoading, setReviewsLoading] = useState(!initialReviews)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [ratingInput, setRatingInput] = useState<RatingKey | 0>(0)
  const [hoverRating, setHoverRating] = useState<RatingKey | 0>(0)
  const [comment, setComment] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [activeTab, setActiveTab] = useState<"description" | "ingredients" | "benefits" | "usage">("description")
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)
  const [wishlist, setWishlist] = useState(false)

  const reviewsFetchRef = useRef(false)

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
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setProduct(data)
        trackViewContent(data._id, data.name, data.discountPrice || data.price)
        if (data?.company?.slug) loadSuggested(data.company.slug)
      } catch (err) {
        console.error("Error fetching product:", err)
        if (mounted) setProduct(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    async function loadSuggested(companySlug: string) {
      try {
        const data = await fetchWithCache<SuggestedProduct[]>(
          suggestedProductsCacheKey(companySlug, id),
          () => fetchSuggestedProductsAPI(companySlug, id),
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
    if (!initialReviews) loadReviews()
  }, [initialReviews, loadReviews])

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
      price: selectedSize ? selectedSize.price : product.price,
      discountPrice: selectedSize ? selectedSize.discountPrice : product.discountPrice,
      image: product.image,
      quantity,
      company: product.company || { name: "Unknown", slug: "unknown" },
      selectedSize: selectedSize || undefined,
    })
    const itemPrice = selectedSize ? selectedSize.price : product.price
    const itemDiscountPrice = selectedSize ? selectedSize.discountPrice : product.discountPrice
    trackAddToCart(product._id, product.name, itemDiscountPrice || itemPrice, quantity)
    toast({ title: "Added to cart!", description: `${quantity} × ${product.name}${selectedSize ? ` (${selectedSize.size}${selectedSize.unit})` : ""} added.` })
    setQuantity(1)
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
      if (data.review) {
        setReviews((prev) => [parseProductReview(data.review), ...prev.filter((r) => r.userId !== (session?.user?.id || ""))])
      } else if (Array.isArray(data.reviews)) {
        setReviews(data.reviews.map(parseProductReview))
      }
      setReviewSummary(parseReviewSummary(data.summary))
      setRatingInput(0); setHoverRating(0); setComment("")
      toast({ title: "Review submitted!", description: "Thank you for your feedback." })
    } catch (err) {
      toast({ title: "Review failed", description: "Could not submit review.", variant: "destructive" })
    } finally {
      setSubmittingReview(false)
    }
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
  const currentDiscountPrice = selectedSize ? selectedSize.discountPrice : product?.discountPrice
  const displayPrice = currentDiscountPrice || currentPrice
  const discount = currentDiscountPrice ? Math.round(((currentPrice - currentDiscountPrice) / currentPrice) * 100) : 0
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
        <div className="text-center space-y-3">
          <p className="text-2xl font-semibold text-gray-700">Product not found</p>
          <p className="text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
        </div>
      </main>
    )
  }

  const allImages = product.images?.length ? product.images : [product.image]

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">

          {/* ── LEFT: Image Gallery ── */}
          <div className="space-y-4">

            {/* Main image */}
            <div
              className="relative overflow-hidden rounded-2xl border"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#dde8de",
                aspectRatio: "1 / 1",
              }}
            >
              {discount > 0 && (
                <div
                  className="absolute top-4 left-4 z-10 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
                >
                  {discount}% OFF
                </div>
              )}

              <Image
                src={allImages[selectedImage]}
                alt={product.name}
                fill
                className="object-contain p-8 transition-transform duration-300 hover:scale-105"
                priority
              />

              {/* Prev / Next arrows for mobile */}
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
                {allImages.map((img, idx) => (
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
                  <Leaf className="w-5 h-5" style={{ color: "#1e3a28" }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: "#1e3a28" }}>
                  Product Description
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
                {product.description}
              </p>
            </div>
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="space-y-6">

            {/* Brand + Name */}
            <div>
              {product.company?.name && (
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-2"
                  style={{ color: "#2a5c3a" }}
                >
                  {product.company.name}
                </p>
              )}
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight" style={{ color: "#1e3a28" }}>
                {product.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6b7c70" }}>
                {product.description}
              </p>
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
                    className="text-sm font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#fff7e6", color: "#b45309", border: "1px solid #fcd9a0" }}
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
                    Select Size
                  </p>
                  <button className="text-xs underline" style={{ color: "#2a5c3a" }}>
                    Size guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes?.map((size, idx) => {
                    const isSel = selectedSize?.size === size.size && selectedSize?.unit === size.unit
                    const oos = size.stock <= 0
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
                        {size.size}{size.unit}
                        {size.discountPrice ? ` – ₹${size.discountPrice}` : ` – ₹${size.price}`}
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
                >
                  <Zap className="w-5 h-5" />
                  Shop Now
                </button>
              </div>

              <button
                onClick={() => setWishlist(!wishlist)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border-2 transition-all duration-150"
                style={{
                  backgroundColor: wishlist ? "#fff0f0" : "#ffffff",
                  borderColor: wishlist ? "#f4a0a0" : "#c8dac9",
                  color: wishlist ? "#c0392b" : "#1e3a28",
                }}
              >
                <Heart className={`w-4 h-4 ${wishlist ? "fill-red-400 text-red-400" : ""}`} />
                {wishlist ? "Saved to Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            {/* Bulk Deal */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: "#f0f7f0", borderColor: "#c8dac9" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5" style={{ color: "#1e3a28" }} />
                <h3 className="font-bold text-base" style={{ color: "#1e3a28" }}>
                  Bulk Deal
                </h3>
              </div>
              <div className="space-y-0 divide-y" style={{ borderColor: "#d2e8d4" }}>
                {[
                  { qty: "1–10", disc: "17% off", save: "Standard" },
                  { qty: "11–50", disc: "22% off", save: "₹33/jar" },
                  { qty: "51–100", disc: "25% off", save: "₹37/jar" },
                ].map((row) => (
                  <div
                    key={row.qty}
                    className="flex items-center justify-between py-3 text-sm"
                    style={{ borderColor: "#d2e8d4" }}
                  >
                    <span style={{ color: "#4a5e50" }}>{row.qty}</span>
                    <span className="font-semibold" style={{ color: "#1e6636" }}>{row.disc}</span>
                    <span style={{ color: "#4a5e50" }}>{row.save}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: "#2a5c3a" }}>
                For 100+ quantity – contact us
              </p>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Truck className="w-5 h-5" />, title: "Free Delivery", sub: "Orders ₹449+" },
                { icon: <RotateCcw className="w-5 h-5" />, title: "Easy Return", sub: "7 Day Policy" },
                { icon: <Leaf className="w-5 h-5" />, title: "100% Natural", sub: "Dermat Tested" },
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
          <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
            {product.description}
          </p>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* TABS SECTION                                  */}
        {/* ══════════════════════════════════════════════ */}
        {(product.ingredients?.length || product.benefits?.length || product.usage) && (
          <div
            className="mt-10 rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
          >
            {/* Tab nav */}
            <div className="flex overflow-x-auto border-b" style={{ borderColor: "#dde8de" }}>
              {(
                [
                  { key: "description", label: "Description" },
                  { key: "ingredients", label: "Ingredients" },
                  { key: "benefits", label: "Benefits" },
                  { key: "usage", label: "How to Use" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-shrink-0 px-6 py-4 text-sm font-semibold border-b-2 transition-all"
                  style={{
                    borderBottomColor: activeTab === tab.key ? "#1e3a28" : "transparent",
                    color: activeTab === tab.key ? "#1e3a28" : "#6b7c70",
                    backgroundColor: activeTab === tab.key ? "#f7faf7" : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6 lg:p-8">
              {activeTab === "description" && (
                <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
                  {product.description}
                </p>
              )}

              {activeTab === "ingredients" && (
                <div className="flex flex-wrap gap-2">
                  {(product.ingredients || []).map((ing, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 rounded-full text-sm font-medium border"
                      style={{
                        backgroundColor: "#f0f7f0",
                        borderColor: "#c8dac9",
                        color: "#1e3a28",
                      }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              {activeTab === "benefits" && (
                <ul className="space-y-3">
                  {(product.benefits || []).map((ben, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#4a5e50" }}>
                      <span
                        className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
                      >
                        ✓
                      </span>
                      {ben}
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === "usage" && (
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#4a5e50" }}>
                  {product.usage}
                </p>
              )}
            </div>
          </div>
        )}

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {suggestedProducts.map((p) => (
        <ProductCard
          key={p._id}
          id={p._id}
          name={p.name}
          price={p.price}
          discountPrice={p.discountPrice}
          image={p.image}
          company={p.company}
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