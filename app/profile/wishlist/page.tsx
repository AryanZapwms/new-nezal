// app/profile/wishlist/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart, Trash2, PackageOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWishlistStore } from "@/lib/store/wishlist-store"
import { useCartStore } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"

interface Product {
  _id: string
  name: string
  slug: string
  image?: string
  images?: string[]
  price?: number
  discountPrice?: number
  company?: { name: string; slug: string }
  sizes?: Array<{
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
  }>
  category?: string
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

export default function WishlistPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { items: wishlistIds, toggle, setItems } = useWishlistStore()
  const addToCart = useCartStore((s) => s.addItem)
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  // Sync wishlist from server on mount
  useEffect(() => {
    if (status !== "authenticated") return

    async function syncWishlist() {
      try {
        const res = await fetch("/api/wishlist")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.wishlist)) {
          setItems(data.wishlist)
        }
      } catch {}
    }

    syncWishlist()
  }, [status, setItems])

  // Fetch product details for all wishlist IDs
  useEffect(() => {
    if (!wishlistIds.length) {
      setProducts([])
      setLoading(false)
      return
    }

    async function fetchProducts() {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?ids=${wishlistIds.join(",")}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.products ?? []
        // Keep order matching wishlistIds
        const map = new Map(list.map((p: Product) => [p._id, p]))
        setProducts(wishlistIds.map((id) => map.get(id)).filter(Boolean) as Product[])
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [wishlistIds])

  async function handleRemove(productId: string) {
    toggle(productId) // optimistic remove from store
    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      toast({ title: "Removed from wishlist" })
    } catch {
      toggle(productId) // revert
    }
  }

function handleAddToCart(product: Product) {
  const size = product.sizes?.[0]
  if (!size) {
    addToCart({
      productId: product._id,
      name: product.name,
      image: product.image || product.images?.[0] || "",
      price: product.price ?? 0,
      discountPrice: product.discountPrice,
      quantity: 1,
    })
    toast({ title: "Added to cart", description: product.name })
    return
  }
  addToCart({
    productId: product._id,
    name: product.name,
    price: size.price,
    discountPrice: size.discountPrice,
    image: product.image || product.images?.[0] || "",
    selectedSize: size,
    quantity: 1,
  })
  toast({ title: "Added to cart", description: product.name })
}

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading your wishlist...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? "item" : "items"} saved
            </p>
          </div>
        </div>

        {/* Empty state */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-4">
              <PackageOpen className="h-10 w-10 text-red-300" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Save products you love by tapping the heart icon on any product.
            </p>
            <Button asChild>
              <Link href="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => {
              const size = product.sizes?.[0]
              const price = size ? (size.discountPrice ?? size.price) : (product.discountPrice ?? product.price)
              const originalPrice = size
                ? (size.discountPrice ? size.price : undefined)
                : (product.discountPrice ? product.price : undefined)
              const discount = originalPrice && price
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : null
              const image = product.image || product.images?.[0] || ""

              return (
                <Card key={product._id} className="group overflow-hidden border border-border hover:shadow-md transition-shadow duration-200">
                  {/* Image */}
                  <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
                    {image ? (
                      <Image
                        src={image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                    {discount && (
                      <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs">
                        {discount}% off
                      </Badge>
                    )}
                    {product.flashSale && !size && (
                      <Badge
                        className="absolute top-2 left-2 text-white text-xs"
                        style={{ backgroundColor: "#E4432B", marginTop: discount ? "1.75rem" : 0 }}
                      >
                        ⚡ Flash Sale
                      </Badge>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>

                  <CardContent className="p-3 space-y-2">
                    {product.company && (
                      <p className="text-xs text-muted-foreground truncate">{product.company.name}</p>
                    )}
                    <Link
                      href={`/shop/${product.company?.slug}/${product.slug}`}
                      className="block text-sm font-semibold text-foreground hover:text-[var(--color-brand-primary)] line-clamp-2 leading-snug"
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    {price !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">₹{price}</span>
                        {originalPrice && (
                          <span className="text-xs text-muted-foreground line-through">₹{originalPrice}</span>
                        )}
                      </div>
                    )}

                    {/* Add to cart */}
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 mt-1"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}