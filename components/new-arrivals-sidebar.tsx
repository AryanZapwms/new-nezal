"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getCachedSync, fetchWithCache } from "@/lib/cacheClient"
import { ArrowRight } from "lucide-react"

interface NewArrivalProduct {
  _id: string
  productId: {
    _id: string
    name: string
    price: number
    discountPrice?: number
    flashSale?: {
      saleId: string
      saleName: string
      discountPercent: number
      endsAt: string
    } | null
  }
  title: string
  image: string
  company: { _id: string; name: string; slug: string }
}

interface NewArrivalsSidebarProps {
  companyId: string
  companySlug: string
}

const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24
const MAX_ITEMS = 4

function getCacheKey(companyId: string) {
  return `newArrivals:${companyId}`
}

async function fetchNewArrivalsAPI(companyId: string) {
  const res = await fetch(`/api/companies/${companyId}/new-arrivals`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch new arrivals")
  const json = await res.json()
  return {
    newArrivals: Array.isArray(json?.newArrivals) ? json.newArrivals : Array.isArray(json) ? json : json?.data ?? [],
    settings: json?.settings ?? {},
  }
}

export function NewArrivalsSidebar({ companyId, companySlug }: NewArrivalsSidebarProps) {
  const router = useRouter()
  const cacheKey = getCacheKey(companyId)
  const initialData = useMemo(
    () => getCachedSync<{ newArrivals: any[]; settings?: any }>(cacheKey, MAX_AGE),
    [cacheKey]
  )

  const [products, setProducts] = useState<NewArrivalProduct[]>([])
  const [isVisible, setIsVisible] = useState(initialData?.settings?.isVisible ?? true)
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!companyId) {
        setProducts([])
        setIsVisible(false)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const data = await fetchWithCache<{ newArrivals: any[]; settings?: any }>(
          cacheKey,
          () => fetchNewArrivalsAPI(companyId),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setIsVisible(data?.settings?.isVisible ?? true)
        if (Array.isArray(data.newArrivals) && data.newArrivals.length > 0) {
          setProducts(
            data.newArrivals
              .slice(0, MAX_ITEMS)
              .map((arrival: any) => {
                const product = arrival.productId || arrival.product
                if (!product) return null
                return {
                  _id: arrival._id || `${companyId}-${product._id}`,
                  productId: {
  _id: product._id,
  name: product.name || "Product",
  price: product.price ?? 0,
  discountPrice: product.discountPrice,
  flashSale: product.flashSale ?? null,
},
                  title: arrival.title || product.name || "New Arrival",
                  image: arrival.image || product.image || "/nezallogo.jpg",
                  company: { _id: companyId, name: "", slug: companySlug },
                }
              })
              .filter(Boolean) as NewArrivalProduct[]
          )
        }
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [companyId, companySlug, cacheKey])

  if (!isVisible || (!loading && products.length === 0)) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #eaf0ea", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #f0f4f0" }}>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ background: "#e8f4ec", color: "#2d6a4f" }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#2d6a4f" }} />
          Fresh Drops
        </span>
        <h3 className="text-base font-bold mt-2" style={{ color: "#1a2e1a", letterSpacing: "-0.01em" }}>
          New Arrivals
        </h3>
      </div>

      {/* List */}
      <div className="p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: "#e8e8e4" }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 rounded" style={{ background: "#e8e8e4", width: "80%" }} />
                  <div className="h-3 rounded" style={{ background: "#e8e8e4", width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          products.map((product) => {
            const price = product.productId.price
            const finalPrice = product.productId.discountPrice ?? price

            return (
              <button
                key={product._id}
                onClick={() => router.push(`/shop/${product.company.slug}/product/${product.productId._id}`)}
                className="w-full flex gap-3 items-center p-2 rounded-xl transition-colors text-left group"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f7faf7")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative"
                  style={{ background: "#f0f5f0" }}
                >
                  <img
                    src={product.image || "/nezallogo.jpg"}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/nezallogo.jpg"
                    }}
                  />
                  <div
                    className="absolute top-0.5 left-0.5 text-white text-[7px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: "#2d6a4f" }}
                  >
                    New
                  </div>
                </div>

                <div className="flex-1 min-w-0">
  <p
    className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-[#2d6a4f] transition-colors"
    style={{ color: "#1a2e1a" }}
  >
    {product.title}
  </p>
  {price > 0 && (
    <p className="text-xs font-bold mt-1 flex items-center gap-1" style={{ color: "#2d6a4f" }}>
      ₹{finalPrice}
      {product.productId.flashSale && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
          style={{ background: "#E4432B" }}
        >
          SALE
        </span>
      )}
    </p>
  )}
</div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      {!loading && products.length > 0 && (
        <button
          onClick={() => router.push(`/shop/${companySlug}`)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-3 transition-colors"
          style={{ background: "#f7faf7", color: "#2d6a4f", borderTop: "1px solid #f0f4f0" }}
        >
          View All
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}