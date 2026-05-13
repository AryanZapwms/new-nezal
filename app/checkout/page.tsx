// app/checkout/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"
import { CheckoutForm } from "@/components/checkout-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trackInitiateCheckout } from "@/lib/facebook-pixel"

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentSettings {
  enableCOD: boolean
  enableRazorpay: boolean
}

// ===== Loader components (unchanged) =====
function TopProgressBar({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed top-0 left-0 right-0 h-1 z-50 ${visible ? "block" : "hidden"}`}>
      <div className="h-1 bg-gradient-to-r from-transparent via-[--color-brand-primary]/80 to-transparent animate-[progress_2s_linear_infinite]" />
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

function FullPageLoader({ message = "Processing your request..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white shadow-2xl rounded-2xl p-6 flex items-center gap-4">
        <svg className="w-10 h-10 animate-spin text-[--color-brand-primary]" viewBox="0 0 50 50" aria-hidden>
          <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" strokeOpacity="0.15" stroke="currentColor" />
          <path d="M45 25a20 20 0 00-20-20" fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor" />
        </svg>
        <div>
          <p className="font-medium text-sm text-[--color-text-heading]">{message}</p>
          <p className="text-xs text-[--color-text-muted]">Please don't close or reload the page.</p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)

  // ===== ALL LOGIC UNCHANGED =====
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (items.length > 0) {
      const productIds = items.map(item => item.productId)
      trackInitiateCheckout(getTotalPrice(), items.length, productIds)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await fetch("/api/admin/payment-settings")
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setPaymentSettings(data)
        } else {
          setPaymentSettings({ enableCOD: true, enableRazorpay: true })
        }

        const profileRes = await fetch("/api/users/profile")
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setUserData(profileData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setPaymentSettings({ enableCOD: true, enableRazorpay: true })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      try {
        document.body.removeChild(script)
      } catch (e) {}
    }
  }, [])

  const handleCheckout = async (shippingAddress: any, paymentMethod: string) => {
    setIsLoading(true)

    try {
      if (paymentMethod === "cod") {
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              product: item.productId,
              quantity: item.quantity,
              price: item.discountPrice || item.price,
              selectedSize: item.selectedSize,
            })),
            shippingAddress,
            totalAmount: getTotalPrice(),
            paymentMethod: "cod",
            paymentStatus: "pending",
          }),
        })

        const orderData = await orderResponse.json()
        if (!orderResponse.ok) throw new Error(orderData.error)

        clearCart()
        setIsLoading(false)
        router.push(`/order-success/${orderData.orderId}`)
        return
      }

      if (paymentMethod === "razorpay") {
        const razorpayResponse = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: getTotalPrice() }),
        })

        const razorpayOrder = await razorpayResponse.json()
        if (!razorpayResponse.ok) throw new Error(razorpayOrder.error || "Failed to create Razorpay order")

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Nezal",
          description: "Premium Skincare Products",
          handler: async (response: any) => {
            try {
              const verifyResponse = await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  items: items.map((item) => ({
                    product: item.productId,
                    quantity: item.quantity,
                    price: item.discountPrice || item.price,
                    selectedSize: item.selectedSize,
                  })),
                  shippingAddress,
                  totalAmount: getTotalPrice(),
                }),
              })

              const verifyData = await verifyResponse.json()
              if (verifyResponse.ok && verifyData.orderId) {
                clearCart()
                setIsLoading(false)
                router.push(`/order-success/${verifyData.orderId}`)
              } else {
                setIsLoading(false)
                alert("Payment verification failed. Please contact support.")
              }
            } catch (error) {
              console.error("Payment verification error:", error)
              setIsLoading(false)
              alert("Payment verification failed. Please try again.")
            }
          },
          modal: {
            ondismiss: () => {
              alert("Payment cancelled. Your order was not created.")
              setIsLoading(false)
            },
          },
          prefill: {
            email: session?.user?.email,
            name: session?.user?.name,
          },
        }

        const razorpay = new window.Razorpay(options)
        razorpay.open()
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : "Please try again."}`)
      setIsLoading(false)
    }
  }

  const getAvailablePaymentMethods = (): string[] => {
    if (!paymentSettings) return ["razorpay"]
    const methods: string[] = []
    if (paymentSettings.enableRazorpay) methods.push("razorpay")
    if (paymentSettings.enableCOD) methods.push("cod")
    return methods.length > 0 ? methods : ["razorpay"]
  }

  // ===== Loading states =====
  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <div className="text-lg text-[--color-text-muted] flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[--color-text-muted] border-t-[--color-brand-primary] rounded-full animate-spin" />
          Loading checkout...
        </div>
      </main>
    )
  }

  if (status === "unauthenticated") return null

  const totalPrice = getTotalPrice()
  const availablePaymentMethods = getAvailablePaymentMethods()

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <TopProgressBar visible={isLoading} />

      <div className="container-nezal py-10">
        <h1 className="text-4xl font-bold text-[--color-text-heading] mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form – 2/3 */}
          <div className="lg:col-span-2">
            <CheckoutForm
              totalAmount={totalPrice}
              onSubmit={handleCheckout}
              availablePaymentMethods={availablePaymentMethods}
              initialData={{
                name: userData?.name || session?.user?.name || "",
                phone: userData?.phone || "",
                street: userData?.address || "",
                city: userData?.city || "",
                state: userData?.state || "",
                zipCode: userData?.pincode || "",
                country: "India",
              }}
              isSubmitting={isLoading}
            />
          </div>

          {/* Order Summary – 1/3 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 border border-[--color-border] rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-[--color-text-heading]">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="text-sm border-b border-[--color-border] pb-3 last:border-b-0">
                    <div className="flex justify-between">
                      <span className="text-[--color-text-body]">{item.name} x {item.quantity}</span>
                      <span className="font-semibold text-[--color-text-heading]">
                        ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {item.selectedSize && (
                      <div className="text-xs text-[--color-text-muted] mt-1">
                        Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t border-[--color-border] pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Subtotal</span>
                    <span className="font-semibold text-[--color-text-heading]">₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Shipping</span>
                    <span className="font-semibold text-[--color-brand-primary]">Free</span>
                  </div>
                </div>

                <div className="border-t border-[--color-border] pt-4 flex justify-between text-lg font-bold">
                  <span className="text-[--color-text-heading]">Total</span>
                  <span className="text-[--color-text-heading]">₹{totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isLoading && <FullPageLoader message="Processing your payment..." />}
    </main>
  )
}