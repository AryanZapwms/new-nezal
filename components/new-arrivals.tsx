// components/new-arrivals.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCachedSync, fetchWithCache, invalidateCache } from "@/lib/cacheClient"

// Types unchanged
interface NewArrivalProduct {
  _id: string
  productId: {
    _id: string
    name: string
    price: number
    discountPrice?: number
  }
  title: string
  image: string
  description?: string
  company: {
    _id: string
    name: string
    slug: string
  }
}

interface NewArrivalsProps {
  companyId: string
  companySlug: string
  companyName: string
}

// Cache config unchanged
const TTL = 1000 * 60 * 5
const MAX_AGE = 1000 * 60 * 60 * 24

function getCacheKey(companyId: string) {
  return `newArrivals:${companyId}`
}

async function fetchNewArrivalsAPI(companyId: string): Promise<{ newArrivals: any[]; settings?: any }> {
  const res = await fetch(`/api/companies/${companyId}/new-arrivals`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch new arrivals for ${companyId}`)
  const json = await res.json()
  return {
    newArrivals: Array.isArray(json?.newArrivals) ? json.newArrivals : Array.isArray(json) ? json : json?.data ?? [],
    settings: json?.settings ?? {},
  }
}

export function invalidateNewArrivalsCache(companyId?: string) {
  if (companyId) invalidateCache(getCacheKey(companyId))
  else invalidateCache("newArrivals:")
}

// ============================
// Component (logic preserved)
// ============================
export function NewArrivals({ companyId, companySlug, companyName }: NewArrivalsProps) {
  const router = useRouter()
  const cacheKey = getCacheKey(companyId)
  const initialData = useMemo(() => getCachedSync<{ newArrivals: any[]; settings?: any }>(cacheKey, MAX_AGE), [cacheKey])

  const [products, setProducts] = useState<NewArrivalProduct[]>([])
  const [isVisible, setIsVisible] = useState(initialData?.settings?.isVisible ?? true)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

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
      setError(null)
      try {
        const data = await fetchWithCache<{ newArrivals: any[]; settings?: any }>(
          cacheKey,
          () => fetchNewArrivalsAPI(companyId),
          { ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true }
        )
        if (!mounted) return
        setIsVisible(data?.settings?.isVisible ?? true)
        if (Array.isArray(data.newArrivals) && data.newArrivals.length > 0) {
          const arrivals: NewArrivalProduct[] = data.newArrivals
            .map((arrival: any) => {
              const product = arrival.productId || arrival.product
              if (!product) return null
              return {
                _id: arrival._id || arrival.id || `${companyId}-${product._id}`,
                productId: {
                  _id: product._id || product.id,
                  name: product.name || product.title || "Product",
                  price: product.price ?? 0,
                  discountPrice: product.discountPrice,
                },
                title: arrival.title || product.name || product.title || "New Arrival",
                image: arrival.image || product.image || product.imageUrl || "/companylogo.png",
                description: arrival.description || product.description || "",
                company: { _id: companyId, name: companyName, slug: companySlug },
              }
            })
            .filter((p: any) => p !== null)
          setProducts(arrivals as NewArrivalProduct[])
        } else {
          setProducts([])
        }
      } catch (err) {
        console.error("Error fetching new arrivals:", err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load new arrivals")
        setProducts([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [companyId, companySlug, companyName, cacheKey])

  if (!isVisible || products.length === 0) return null
  if (error) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container-nezal">
        {/* Section heading with leaf emoji */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[--color-text-heading] flex items-center justify-center gap-3">
            <span className="text-[--color-brand-accent]">🌿</span>
            New Arrivals
            <span className="text-[--color-brand-accent]">🌿</span>
          </h2>
        </div>

        {/* Grid of cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="flex flex-col bg-white rounded-2xl overflow-hidden border border-[--color-border] hover:shadow-lg transition-all duration-300 group"
            >
              {/* Image */}
              <div className="w-full h-[260px] overflow-hidden bg-[--color-bg-cream]">
                <img
                  src={product.image || "/companylogo.png"}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col items-center p-5 bg-[--color-bg-cream] gap-3">
                <h3 className="text-base font-semibold text-[--color-text-heading] leading-snug text-center">
                  {product.title}
                </h3>
                <Button
                  onClick={() =>
                    router.push(`/shop/${product.company.slug}/product/${product.productId._id}`)
                  }
                  className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white text-sm px-6 py-2 rounded-full font-semibold transition-all duration-200 hover:scale-105"
                >
                  Shop now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}