// app/cart/page.tsx
"use client"

import { useCartStore, Size } from "@/lib/store/cart-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Trash2, Phone } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
  const totalPrice = getTotalPrice()
  const router = useRouter()
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false)

  // ===== Empty cart state =====
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[--color-bg-page]">
        <div className="container-nezal py-10">
          <h1 className="text-4xl font-bold text-[--color-text-heading] mb-8">Shopping Cart</h1>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-24 h-24 text-[--color-text-muted] mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p className="text-lg text-[--color-text-body] mb-4">Your cart is empty</p>
            <Link href="/shop">
              <Button className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-10">
        <h1 className="text-4xl font-bold text-[--color-text-heading] mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items – 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card
                key={`${item.productId}-${item.selectedSize ? `${item.selectedSize.size}-${item.selectedSize.quantity}${item.selectedSize.unit}` : "default"}`}
                className="border border-[--color-border] rounded-2xl shadow-none bg-white overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative w-24 h-24 bg-[--color-bg-cream] rounded-xl overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[--color-text-muted]">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[--color-text-heading] truncate">{item.name}</h3>
                      <p className="text-sm text-[--color-text-muted]">{item.company.name}</p>

                      {item.selectedSize && (
                        <p className="text-sm text-[--color-text-body] mt-1">
                          <span className="font-medium">Size:</span> {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-[--color-border] rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.selectedSize)}
                            className="px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-bg-cream] font-medium transition-colors"
                          >
                            −
                          </button>
                          <span className="px-4 py-1.5 font-semibold text-[--color-text-heading] border-x border-[--color-border]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (getTotalItems() >= 5) {
                                setShowBulkOrderModal(true)
                              } else {
                                updateQuantity(item.productId, item.quantity + 1, item.selectedSize)
                              }
                            }}
                            className="px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-bg-cream] font-medium transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-bold text-[--color-text-heading]">
                            ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-[--color-text-muted]">
                            ₹{item.discountPrice || item.price} each
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.productId, item.selectedSize)}
                      className="self-start p-2 rounded-lg text-[--color-text-muted] hover:bg-red-50 hover:text-[--color-brand-red] transition-colors"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary – 1/3 width, sticky */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 border border-[--color-border] rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-[--color-text-heading]">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 border-b border-[--color-border] pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Subtotal</span>
                    <span className="font-semibold text-[--color-text-heading]">₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Shipping</span>
                    <span className="font-semibold text-[--color-brand-primary]">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Tax</span>
                    <span className="font-semibold text-[--color-text-heading]">₹0</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span className="text-[--color-text-heading]">Total</span>
                  <span className="text-[--color-text-heading]">₹{totalPrice.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-semibold py-5 rounded-xl text-base"
                  onClick={() => router.push("/checkout")}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream] font-medium py-4 rounded-xl"
                  onClick={() => router.push("/shop")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bulk Order Modal (unchanged logic, restyled) */}
        <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-[--color-text-heading]">Want to do a bulk order?</DialogTitle>
              <DialogDescription className="text-center pt-4 text-[--color-text-body]">
                You've reached the maximum limit of 5 products in your cart. For bulk orders, please contact our team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <a
                href="tel:+919820623835"
                className="flex items-center gap-3 p-3 border border-[--color-border] rounded-xl hover:bg-[--color-bg-cream] transition-colors"
              >
                <Phone className="w-5 h-5 text-[--color-brand-primary]" />
                <span className="text-[--color-brand-primary] font-semibold">+91 9820623835</span>
              </a>
              <a
                href="tel:+919819079079"
                className="flex items-center gap-3 p-3 border border-[--color-border] rounded-xl hover:bg-[--color-bg-cream] transition-colors"
              >
                <Phone className="w-5 h-5 text-[--color-brand-primary]" />
                <span className="text-[--color-brand-primary] font-semibold">+91 9819079079</span>
              </a>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-[--color-border]" onClick={() => setShowBulkOrderModal(false)}>
                Continue Shopping
              </Button>
              <a href="tel:+919820623835">
                <Button className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white">
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