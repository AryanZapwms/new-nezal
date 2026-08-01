// app/cart/page.tsx
"use client"

import { useCartStore, Size } from "@/lib/store/cart-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Trash2, Phone, Zap, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BULK_ORDER_LIMIT } from "@/lib/config"

export default function CartPage() {
const { items, removeItem, removeRitual, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
 const { status } = useSession() 
  const totalPrice = getTotalPrice()
  const router = useRouter()
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)
  const [gstMap, setGstMap] = useState<Record<string, number>>({})

  // ── Free shipping ──────────────────────────────
  const [freeShipping, setFreeShipping] = useState<{ enabled: boolean; threshold: number } | null>(null)

  useEffect(() => {
    fetch("/api/admin/payment-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setFreeShipping({
            enabled: !!data.freeShippingEnabled,
            threshold: data.freeShippingThreshold ?? 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  const freeShippingApplied =
    !!freeShipping?.enabled && freeShipping.threshold > 0 && totalPrice >= freeShipping.threshold

  const amountLeftForFreeShipping =
    !!freeShipping?.enabled && freeShipping.threshold > 0
      ? Math.max(0, freeShipping.threshold - totalPrice)
      : 0


  useEffect(() => {
  if (items.length === 0) { setGstMap({}); return }
  const ids = items.map((i) => i.productId).join(",")
  fetch(`/api/products?ids=${ids}`)
    .then((res) => (res.ok ? res.json() : { products: [] }))
    .then((data) => {
      const map: Record<string, number> = {}
      ;(data.products || []).forEach((p: any) => {
        if (typeof p.gstPercent === "number") map[p._id] = p.gstPercent
      })
      setGstMap(map)
    })
    .catch(() => {})
}, [items.map((i) => i.productId).join(",")])

const totalGST = items.reduce((sum, item) => {
  const rate = gstMap[item.productId]
  if (!rate) return sum
  const itemTotal = (item.discountPrice || item.price) * item.quantity
  const base = itemTotal / (1 + rate / 100)
  return sum + (itemTotal - base)
}, 0)

  const totalSavings = items.reduce((sum, item) => {
        if (!item.discountPrice) return sum
        return sum + (item.price - item.discountPrice) * item.quantity
    }, 0)





// ===== Not logged in state =====
  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-background">
        <div className="container-nezal py-10">
          <h1 className="text-4xl font-bold text-foreground mb-8">Shopping Cart</h1>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-24 h-24 text-muted-foreground mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p className="text-lg text-muted-foreground mb-4">Please log in to view your cart</p>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => router.push("/auth/login?redirect=/cart")}
            >
              Log In
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // ===== Loading session state =====
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
          Loading cart...
        </div>
      </main>
    )
  }

  // ===== Empty cart state =====
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container-nezal py-10">
          <h1 className="text-4xl font-bold text-foreground mb-8">Shopping Cart</h1>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-24 h-24 text-muted-foreground mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p className="text-lg text-muted-foreground mb-4">Your cart is empty</p>
            <Link href="/shop">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container-nezal py-10">
        <h1 className="text-4xl font-bold text-foreground mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items – 2/3 width */}
          {/* Cart Items – 2/3 width */}
<div className="lg:col-span-2 space-y-4">
  {(() => {
    const nonRitualItems = items.filter((item) => !item.ritual)
    const ritualGroups = items.reduce<Record<string, { name: string; slug: string; items: typeof items }>>(
      (acc, item) => {
        if (item.ritual) {
          const key = item.ritual.slug
          if (!acc[key]) acc[key] = { name: item.ritual.name, slug: item.ritual.slug, items: [] }
          acc[key].items.push(item)
        }
        return acc
      },
      {}
    )

    return (
      <>
        {/* Individually-added items */}
        {nonRitualItems.map((item) => (
          <Card
            key={`${item.productId}-${item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}${item.selectedSize.unit}` : "default"}`}
            className="border border-border rounded-2xl shadow-none bg-card overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative w-24 h-24 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.company?.name ?? ""}</p>

                  {item.selectedSize && (
                    <p className="text-sm text-foreground/80 mt-1">
                      <span className="font-medium">Size:</span> {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                    </p>
                  )}

                  {item.flashSale && item.discountPrice && (
                    <div
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mt-2"
                      style={{ backgroundColor: "#E4432B", color: "#ffffff" }}
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      You're saving ₹{((item.price - item.discountPrice) * item.quantity).toFixed(0)} — {item.flashSale.discountPercent}% Flash Sale
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.selectedSize)}
                        className="px-3 py-1.5 text-foreground hover:bg-muted font-medium transition-colors"
                      >
                        −
                      </button>
                      <span className="px-4 py-1.5 font-semibold text-foreground border-x border-border">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (getTotalItems() >= BULK_ORDER_LIMIT) {
                            setShowBulkOrderModal(true)
                          } else {
                            updateQuantity(item.productId, item.quantity + 1, item.selectedSize)
                          }
                        }}
                        className="px-3 py-1.5 text-foreground hover:bg-muted font-medium transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.discountPrice || item.price} each
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.productId, item.selectedSize)}
                  className="self-start p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Ritual bundles — grouped, single delete for the whole set */}
        {Object.values(ritualGroups).map((group) => (
          <Card
            key={group.slug}
            className="border-2 rounded-2xl shadow-none bg-card overflow-hidden"
            style={{ borderColor: "#1e3a2840" }}
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <Link
                  href={`/rituals/${group.slug}`}
                  className="inline-flex items-center gap-2 font-bold text-sm"
                  style={{ color: "#1e3a28" }}
                >
                  <Sparkles className="w-4 h-4" />
                  {group.name}
                </Link>
                <button
                  onClick={() => removeRitual(group.slug)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border  hover:border-[#e60303] hover:text-[#ae1a1a] border-[#9b9999] px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Remove ${group.name} ritual from cart`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Ritual
                </button>
              </div>

              {group.items.map((item) => (
                <div
                  key={`${item.productId}-${item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}${item.selectedSize.unit}` : "default"}`}
                  className="flex gap-4"
                >
                  <div className="relative w-20 h-20 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.company?.name ?? ""}</p>

                    {item.selectedSize && (
                      <p className="text-sm text-foreground/80 mt-1">
                        <span className="font-medium">Size:</span> {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.selectedSize)}
                          className="px-3 py-1 text-foreground hover:bg-muted font-medium transition-colors"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 font-semibold text-foreground border-x border-border">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            if (getTotalItems() >= BULK_ORDER_LIMIT) {
                              setShowBulkOrderModal(true)
                            } else {
                              updateQuantity(item.productId, item.quantity + 1, item.selectedSize)
                            }
                          }}
                          className="px-3 py-1 text-foreground hover:bg-muted font-medium transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.discountPrice || item.price} each
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </>
    )
  })()}
</div>

          {/* Order Summary – 1/3 width, sticky */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 border border-border rounded-2xl shadow-sm bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
<div className="space-y-2 border-b border-border pb-4">
  {(() => {
    const taxableValue = totalPrice - totalGST

    const gstByRate = items.reduce((acc, item) => {
      const rate = gstMap[item.productId]
      if (!rate) return acc
      const itemTotal = (item.discountPrice || item.price) * item.quantity
      const base = itemTotal / (1 + rate / 100)
      acc[rate] = (acc[rate] || 0) + (itemTotal - base)
      return acc
    }, {} as Record<number, number>)

    const sortedRates = Object.keys(gstByRate).map(Number).sort((a, b) => a - b)

    return (
      <>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Product Cost</span>
          <span className="font-semibold text-foreground">₹{taxableValue.toFixed(2)}</span>
        </div>
        {sortedRates.map((rate) => (
          <div key={rate} className="flex justify-between text-sm pl-3">
            <span className="text-muted-foreground">GST {rate}%</span>
            <span className="font-medium text-foreground">₹{gstByRate[rate].toFixed(2)}</span>
          </div>
        ))}
        {/* <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total GST</span>
          <span className="font-semibold text-foreground">₹{totalGST.toFixed(2)}</span>
        </div> */}
        <div className="flex justify-between text-sm pt-2 border-t border-border">
          <span className="font-medium text-foreground">Total Product Cost</span>
          <span className="font-semibold text-foreground">
           ₹{totalPrice.toFixed(2)}
          </span>
        </div>
      </>
    )
  })()}

  {totalSavings > 0 && (
    <div className="flex justify-between text-sm border p-2 rounded-lg border-[#E4432B]">
      <span className="flex items-center gap-1" style={{ color: "#E4432B" }}>
        <Zap className="w-3.5 h-3.5 fill-current" />
        Flash Sale Savings
      </span>
      <span className="font-semibold" style={{ color: "#E4432B" }}>
        − ₹{totalSavings.toFixed(2)}
      </span>
    </div>
  )}

  <div className="flex justify-between text-sm pt-2">
    <span className="text-muted-foreground">Shipping Cost</span>
    {freeShippingApplied ? (
      <span className="font-semibold" style={{ color: "#2d8116" }}>FREE</span>
    ) : (
      <span className="font-thin italic">Calculated at checkout</span>
    )}
  </div>

  {!freeShippingApplied && amountLeftForFreeShipping > 0 && (
    <div className="text-xs font-medium rounded-lg px-3 py-2 border" style={{ color: "#2d8116", borderColor: "#2d811640", backgroundColor: "#ebffe6" }}>
      Add ₹{amountLeftForFreeShipping.toFixed(2)} more to get FREE shipping!
    </div>
  )}

  {freeShippingApplied && (
    <div className="text-xs font-medium rounded-lg px-3 py-2 border" style={{ color: "#2d8116", borderColor: "#2d811640", backgroundColor: "#ebffe6" }}>
      🎉 You've unlocked FREE shipping!
    </div>
  )}
</div>

                <div className="flex justify-between text-lg font-bold">
  <span className="text-foreground">Total</span>
  <span className="text-foreground">
    {freeShippingApplied
      ? `₹${totalPrice.toFixed(2)}`
      : `₹${totalPrice.toFixed(2)} + shipping`}
  </span>
</div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5 rounded-xl text-base"
                  onClick={() => router.push("/checkout")}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted font-medium py-4 rounded-xl"
                  onClick={() => router.push("/shop")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bulk Order Modal – updated colors */}
        <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-foreground">Want to do a bulk order?</DialogTitle>
              <DialogDescription className="text-center pt-4 text-muted-foreground">
                You've reached the maximum limit of {BULK_ORDER_LIMIT} products in your cart. For bulk orders, please contact our team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <a
                href="tel:+917710076400"
                className="flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-primary font-semibold">+91 7710076400</span>
              </a>
              
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-border" onClick={() => setShowBulkOrderModal(false)}>
                Continue Shopping
              </Button>
              <a href="tel:+917710076400">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}