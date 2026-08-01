// app/order-success/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Package, Truck, Mail, ArrowRight, Copy, Check } from "lucide-react"
import { trackPurchase } from "@/lib/facebook-pixel"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"
import { useCheckoutStore } from "@/lib/store/checkout-store"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

interface OrderItem {
  product?: { _id?: string; name?: string; image?: string }
  productName?: string
  image?: string
  quantity?: number
  price?: number
  selectedSize?: { size: string; unit: string }
}

interface OrderData {
  _id: string
  items?: OrderItem[]
  totalAmount?: number
  paymentMethod?: string
  shippingAddress?: { name?: string; city?: string; state?: string }
  user?: { email?: string }
  guestEmail?: string
}

export default function OrderSuccessPage() {
  const params = useParams()
  const orderId = params.id as string
  const { data: session } = useSession()
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [copied, setCopied] = useState(false)
  const { clearCart } = useCartStore()
  const { clearPendingOrder } = useCheckoutStore()

  // Landing on this page at all means the order succeeded — clear unconditionally.
  useEffect(() => {
    clearCart()
    clearPendingOrder()
  }, [])

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-602275335/U1R3CO3tn6wbEIf8l58C',
        'transaction_id': orderId
      })
    }
  }, [orderId])

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrderData(data)

          if (data?.items && data?.totalAmount) {
            const productIds = data.items.map((item: any) => item.product?._id || item.product)
            trackPurchase(
              orderId,
              data.totalAmount,
              data.items.length,
              productIds,
              session?.user?.email
            )
          }
        }
      } catch (error) {
        console.error('Error fetching order data:', error)
      }
    }

    if (orderId) {
      fetchOrderData()
    }
  }, [orderId, session?.user?.email])

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const itemCount = orderData?.items?.length || 0
  const customerEmail = orderData?.user?.email || orderData?.guestEmail

  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={{ backgroundColor: "#f7faf7" }}>
      <div className="max-w-2xl mx-auto">

        {/* ── Success header ─────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative"
            style={{ backgroundColor: "#e0f0e4" }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ backgroundColor: "#2a5c3a", animationDuration: "2s", animationIterationCount: "2" }}
            />
            <CheckCircle2 className="w-11 h-11 relative" style={{ color: "#1e6636" }} strokeWidth={2} />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
            Order placed successfully!
          </h1>
          <p className="text-sm lg:text-base" style={{ color: "#6b7c70" }}>
            Thank you for shopping with us — your order has been confirmed.
          </p>
        </div>

        {/* ── Order ID card ──────────────────────────────── */}
        <div
          className="rounded-2xl border p-5 mb-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
        >
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#6b7c70" }}>Order ID</p>
            <p className="font-mono font-bold text-lg" style={{ color: "#1e3a28" }}>{orderId}</p>
          </div>
          <button
            onClick={handleCopyOrderId}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors shrink-0"
            style={{
              borderColor: copied ? "#1e6636" : "#c8dac9",
              backgroundColor: copied ? "#e0f0e4" : "#ffffff",
              color: copied ? "#1e6636" : "#1e3a28",
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* ── Order summary (only if data loaded) ───────── */}
        {orderData && itemCount > 0 && (
          <div
            className="rounded-2xl border p-5 mb-5"
            style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4" style={{ color: "#1e3a28" }} />
              <h2 className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
                Order summary · {itemCount} item{itemCount !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="space-y-3">
              {orderData.items!.slice(0, 4).map((item, idx) => {
                const image = item.image || item.product?.image
                const name = item.productName || item.product?.name || `Item ${idx + 1}`
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg overflow-hidden border shrink-0 relative bg-gray-50"
                      style={{ borderColor: "#dde8de" }}
                    >
                      {image ? (
                        <Image src={image} alt={name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1e3a28" }}>{name}</p>
                      <p className="text-xs" style={{ color: "#9cad9e" }}>
                        Qty {item.quantity || 1}
                        {item.selectedSize ? ` · ${item.selectedSize.size}${item.selectedSize.unit}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold shrink-0" style={{ color: "#1e3a28" }}>
                      ₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                    </p>
                  </div>
                )
              })}
              {itemCount > 4 && (
                <p className="text-xs text-center pt-1" style={{ color: "#9cad9e" }}>
                  +{itemCount - 4} more item{itemCount - 4 !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: "#e8f0e9" }}>
              <span className="text-sm font-medium" style={{ color: "#6b7c70" }}>Total paid</span>
              <span className="text-lg font-bold" style={{ color: "#1e3a28" }}>
                ₹{(orderData.totalAmount || 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* ── What happens next ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className="rounded-2xl border p-4 flex flex-col items-center text-center gap-2"
            style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e0f0e4" }}>
              <Mail className="w-4 h-4" style={{ color: "#1e3a28" }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#1e3a28" }}>Confirmation email</p>
              <p className="text-xs mt-0.5" style={{ color: "#9cad9e" }}>
                {customerEmail ? `Sent to ${customerEmail}` : "On its way to your inbox"}
              </p>
            </div>
          </div>
          <div
            className="rounded-2xl border p-4 flex flex-col items-center text-center gap-2"
            style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e0f0e4" }}>
              <Truck className="w-4 h-4" style={{ color: "#1e3a28" }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#1e3a28" }}>Tracking details</p>
              <p className="text-xs mt-0.5" style={{ color: "#9cad9e" }}>Shared once shipped</p>
            </div>
          </div>
        </div>

        {/* ── CTAs ────────────────────────────────────────── */}
        <div className="space-y-3">
          <Link href={`/profile/orders/${orderId}`} className="block">
            <Button
              className="w-full py-6 rounded-xl text-base font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
            >
              View order details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/shop" className="block">
            <Button
              variant="outline"
              className="w-full py-5 rounded-xl text-base font-semibold"
              style={{ borderColor: "#1e3a28", color: "#1e3a28" }}
            >
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}