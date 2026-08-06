// app/checkout/page.tsx
"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/lib/store/cart-store"
import { CheckoutForm } from "@/components/checkout-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trackInitiateCheckout } from "@/lib/facebook-pixel"
import { Zap } from "lucide-react"
import Image from "next/image"
import { Tag, Truck, ShoppingBag } from "lucide-react"
import { useCheckoutStore } from "@/lib/store/checkout-store"
import { trackInitiateCheckout, trackAddPaymentInfo } from "@/lib/facebook-pixel"

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentSettings {
  enableCOD: boolean
  enableRazorpay: boolean
  enableCCAvenue?: boolean
  freeShippingEnabled?: boolean
  freeShippingThreshold?: number
  codFeeEnabled?: boolean
  codFeeType?: "flat" | "percentage"
  codFeeValue?: number
  codFeeMin?: number
  useRealTimeCodCharge?: boolean 
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
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <div className="text-lg text-[--color-text-muted] flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[--color-text-muted] border-t-[--color-brand-primary] rounded-full animate-spin" />
          Loading checkout...
        </div>
      </main>
    }>
      <CheckoutPageInner />
    </Suspense>
  )
}

function CheckoutPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [shippingRate, setShippingRate] = useState<number | null>(null)
    
    const [shippingLoading, setShippingLoading] = useState(false)
    const [shippingError, setShippingError] = useState<string | null>(null)
    const [currentPincode, setCurrentPincode] = useState<string | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")

  const [couponCode, setCouponCode] = useState("")
  const [couponInput, setCouponInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponData, setCouponData] = useState<{
    code: string
    discountType: "percentage" | "flat"
    discountValue: number
    discountAmount: number
  } | null>(null)
  const [gstMap, setGstMap] = useState<Record<string, number>>({})

  const [shippingBreakdown, setShippingBreakdown] = useState<any>(null)
  const [shippingCodCharge, setShippingCodCharge] = useState<number>(0)

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


  const { pendingOrder, setPendingOrder, clearPendingOrder } = useCheckoutStore()

  useEffect(() => {
    if (items.length > 0) {
      const productIds = items.map(item => item.productId)
      trackInitiateCheckout(getTotalPrice(), items.length, productIds)
    }
  }, [])

  useEffect(() => {
  if (!pendingOrder) return

  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const check = async () => {
    try {
      const res = await fetch(`/api/orders/${pendingOrder.orderId}/check-abandonment`, {
        method: "POST",
      })
      const data = await res.json()
      if (cancelled) return

      if (!data.stillPending) {
        clearPendingOrder()
        return
      }

      if (data.tooSoon) {
        timer = setTimeout(check, data.remainingMs + 1000)
        return
      }

      // Email just sent, or was already sent on a previous visit — done tracking it.
      clearPendingOrder()
    } catch (err) {
      console.error("Abandonment check failed:", err)
    }
  }

  check()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}, [pendingOrder])

  // Surface CCAvenue failure/cancel redirects (?error=...) as a visible message
  useEffect(() => {
    const error = searchParams?.get("error")
    if (error) {
      setCheckoutError(decodeURIComponent(error.replace(/_/g, " ")))
    }
  }, [searchParams])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login?redirect=/checkout")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await fetch("/api/admin/payment-settings")
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setPaymentSettings(data)
        } else {
          setPaymentSettings({ enableCOD: true, enableRazorpay: false, enableCCAvenue: true })
        }

        const profileRes = await fetch("/api/users/profile")
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setUserData(profileData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setPaymentSettings({ enableCOD: true, enableRazorpay: false, enableCCAvenue: true })
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

const fetchShippingRate = async (pincode: string) => {
  if (items.length === 0) return
  setShippingLoading(true)
  setShippingError(null)
  try {
    const res = await fetch("/api/shipping-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  pincode,
  items: items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    selectedSize: i.selectedSize,   // ← add this
  })),
  cod: true,
}),
    })
    const data = await res.json()
    if (!data.serviceable) {
      setShippingRate(null)
      setShippingBreakdown(null)
      setShippingCodCharge(0)
      setShippingError(data.error || "This pincode isn't serviceable.")
    } else {
      // Use the clean freight charge (no COD baked in) + the same buffer the
      // backend adds to `rate`, so the base shipping cost is payment-method-agnostic.
      const buffer = (data.breakdown?.smartOrderFee ?? 0) + (data.breakdown?.rateDriftBuffer ?? 0)
      setShippingRate(data.freightCharge + buffer)
      setShippingBreakdown(data.breakdown ?? null)
      setShippingCodCharge(data.codCharge ?? 0)
    }
  } catch {
    setShippingError("Couldn't fetch shipping rate.")
  } finally {
    setShippingLoading(false)
  }
}

useEffect(() => {
  if (!currentPincode) return
  fetchShippingRate(currentPincode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPincode])


  const totalPrice = getTotalPrice()

  const flashSavings = items.reduce((sum, item) => {
    if (!item.flashSale || !item.discountPrice) return sum
    return sum + (item.price - item.discountPrice) * item.quantity
  }, 0)

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) { setCouponError("Enter a coupon code."); return }
    setCouponLoading(true); setCouponError("")
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cartTotal: totalPrice }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Invalid coupon.")
        setCouponData(null)
        return
      }
      setCouponData({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      })
      setCouponCode(data.code)
      setCouponError("")
    } catch {
      setCouponError("Could not validate coupon. Try again.")
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCouponData(null)
    setCouponCode("")
    setCouponInput("")
    setCouponError("")
  }

const discountAmount = couponData?.discountAmount ?? 0
const orderSubtotal = Math.max(0, totalPrice - discountAmount)

// Free shipping is earned on the raw cart subtotal — a coupon applied later
// doesn't take it away, it's just an extra benefit stacked on top.
const freeShippingApplied =
  !!paymentSettings?.freeShippingEnabled &&
  (paymentSettings?.freeShippingThreshold ?? 0) > 0 &&
  totalPrice >= (paymentSettings!.freeShippingThreshold as number)

const shippingCharge = freeShippingApplied ? 0 : (shippingRate ?? 0)

const codSurcharge = (() => {
  if (selectedPaymentMethod !== "cod" || !paymentSettings?.codFeeEnabled) return 0

  if (paymentSettings.useRealTimeCodCharge) {
    return shippingCodCharge // real per-shipment Shiprocket quote
  }

  // existing static admin-configured logic, unchanged
  if (paymentSettings.codFeeType === "percentage") {
    const pct = (paymentSettings.codFeeValue ?? 0) / 100
    const computed = orderSubtotal * pct
    return Math.max(computed, paymentSettings.codFeeMin ?? 0)
  }
  return paymentSettings.codFeeValue ?? 0
})()

const finalTotal = orderSubtotal + shippingCharge + codSurcharge

const amountLeftForFreeShipping =
  !!paymentSettings?.freeShippingEnabled && (paymentSettings?.freeShippingThreshold ?? 0) > 0
    ? Math.max(0, (paymentSettings!.freeShippingThreshold as number) - totalPrice)
    : 0

  const handleCheckout = async (shippingAddress: any, paymentMethod: string) => {
    setIsLoading(true)
    setCheckoutError(null)
     trackAddPaymentInfo(finalTotal, items.map((item) => item.productId))
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
  totalAmount: finalTotal,
  shippingAmount: shippingCharge,
  shippingBreakdown: freeShippingApplied ? null : shippingBreakdown,  // ← add this line
  codCharge: codSurcharge,
  couponCode: couponCode || undefined,
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

      if (paymentMethod === "ccavenue") {
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
            totalAmount: finalTotal,
            shippingAmount: shippingCharge,
            couponCode: couponCode || undefined,
            paymentMethod: "ccavenue",
            paymentStatus: "pending",
          }),
        })

        const orderData = await orderResponse.json()
        if (!orderResponse.ok) throw new Error(orderData.error || "Failed to create order")

          setPendingOrder({ orderId: orderData.orderId, createdAt: Date.now() })

        const initiateResponse = await fetch("/api/ccavenue/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderData.orderId,
            amount: finalTotal,
            billingName: shippingAddress.name,
            billingEmail: shippingAddress.email || session?.user?.email,
            billingPhone: shippingAddress.phone,
            billingAddress: shippingAddress.street,
            billingCity: shippingAddress.city,
            billingState: shippingAddress.state,
            billingZip: shippingAddress.zipCode,
            billingCountry: shippingAddress.country,
          }),
        })

        const initiateData = await initiateResponse.json()
        if (!initiateResponse.ok) throw new Error(initiateData.error || "Failed to initiate payment")

        
        const form = document.createElement("form")
        form.method = "POST"
        form.action = initiateData.actionUrl

        const encRequestInput = document.createElement("input")
        encRequestInput.type = "hidden"
        encRequestInput.name = "encRequest"
        encRequestInput.value = initiateData.encRequest
        form.appendChild(encRequestInput)

        const accessCodeInput = document.createElement("input")
        accessCodeInput.type = "hidden"
        accessCodeInput.name = "access_code"
        accessCodeInput.value = initiateData.accessCode
        form.appendChild(accessCodeInput)

        document.body.appendChild(form)
        form.submit()
        return
      }

      if (paymentMethod === "razorpay") {
        const razorpayResponse = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: finalTotal }),
        })

        const razorpayOrder = await razorpayResponse.json()
        if (!razorpayResponse.ok) throw new Error(razorpayOrder.error || "Failed to create Razorpay order")

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Nezal",
          description: "Skincare Products",
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
                  totalAmount: finalTotal,
                  shippingAmount: shippingCharge,
                  couponCode: couponCode || undefined,
                }),
              })

              const verifyData = await verifyResponse.json()
              if (verifyResponse.ok && verifyData.orderId) {
                clearCart()
                setIsLoading(false)
                router.push(`/order-success/${verifyData.orderId}`)
              } else {
                 try {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "payment-failed",
            to: shippingAddress.email || session?.user?.email,
            subject: "Payment Verification Failed - Nezal",
            data: {
              customerName: shippingAddress.name || session?.user?.name || "Customer",
              totalAmount: finalTotal,
              reason: "We couldn't verify your payment. If money was deducted, it will be refunded automatically.",
            },
          }),
        })
      } catch (emailErr) {
        console.error("Failed to send payment-failed email:", emailErr)
      }
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
  ondismiss: async () => {
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment-failed",
          to: shippingAddress.email || session?.user?.email,
          subject: "Payment Cancelled - Nezal",
          data: {
            customerName: shippingAddress.name || session?.user?.name || "Customer",
            totalAmount: finalTotal,
            reason: "You cancelled the payment window before completing it.",
          },
        }),
      })
    } catch (emailErr) {
      console.error("Failed to send payment-cancelled email:", emailErr)
    }
    alert("Payment cancelled. Your order was not created.")
    setIsLoading(false)
  },
},
          prefill: {
            email: session?.user?.email || shippingAddress?.email,
            name: session?.user?.name || shippingAddress?.name,
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
    if (!paymentSettings) return ["ccavenue", "cod"]
    const methods: string[] = []
    if (paymentSettings.enableCCAvenue) methods.push("ccavenue")
    if (paymentSettings.enableRazorpay) methods.push("razorpay")
    if (paymentSettings.enableCOD) methods.push("cod")
    return methods.length > 0 ? methods : ["ccavenue"]
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

  const availablePaymentMethods = getAvailablePaymentMethods()

  return (
    <main className="min-h-screen bg-[--color-bg-page] ">
      <TopProgressBar visible={isLoading} />

      <div className="container-nezal py-10">
        <h1 className="text-4xl font-bold text-[--color-text-heading] mb-8">Checkout</h1>

        {checkoutError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Payment was not completed: {checkoutError}. Please try again.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form – 2/3 */}
          <div className="lg:col-span-2">
            <CheckoutForm
              totalAmount={finalTotal}
              onSubmit={handleCheckout}
              onZipCodeChange={setCurrentPincode}
              onPaymentMethodChange={setSelectedPaymentMethod}
              availablePaymentMethods={availablePaymentMethods}
              initialData={{
                name: userData?.name || session?.user?.name || "",
                email: userData?.email || session?.user?.email || "",
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
  <Card className="sticky top-20 border border-[#2d8116] rounded-2xl shadow-sm bg-white overflow-hidden">
    <CardHeader className="pb-4 flex-row items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#2d8116]/10 flex items-center justify-center text-[#2d8116] flex-shrink-0">
        <ShoppingBag className="w-4 h-4" />
      </div>
      <CardTitle className="text-base font-semibold text-[#2d8116]">
        Order Summary
        <span className="ml-2 text-xs font-normal text-[#2d8116]">
          ({items.reduce((n, i) => n + i.quantity, 0)} {items.reduce((n, i) => n + i.quantity, 0) === 1 ? "item" : "items"})
        </span>
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-5">

     {/* Items */}
<div className="space-y-3">
  {items.map((item) => (
    <div
      key={item.productId}
      className="flex items-start gap-3 rounded-xl border border-[#2d8116] bg-[#ebffe6] p-3"
    >
      {/* Product Image */}
      <div className="relative flex-shrink-0">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#2d8116]/20 bg-[#f5faf3]">
          {item.image && (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          )}
        </div>

        {/* Quantity Badge */}
        <span className="absolute -top-2 -right-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#2d8116] px-1.5 text-[11px] font-bold text-white shadow-md ring-2 ring-white">
          {item.quantity}
        </span>
      </div>

      {/* Product Details */}
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-sm font-semibold text-[#2d8116]">
          {item.name}
        </h4>

        {item.selectedSize && (
          <p className="mt-1 text-xs text-[#222421]">
            {item.selectedSize.size} • {item.selectedSize.quantity}
            {item.selectedSize.unit}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.ritual && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2d8116]/10 px-2 py-1 text-[10px] font-semibold text-[#2d8116]">
              ✨ {item.ritual.name}
            </span>
          )}

          {item.flashSale && item.discountPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E4432B] px-2 py-1 text-[10px] font-bold text-white">
              <Zap className="h-3 w-3 fill-current" />
              {item.flashSale.discountPercent}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-base font-bold text-[#2d8116]">
          ₹{((item.discountPrice || item.price) * item.quantity).toFixed(2)}
        </span>

        {item.discountPrice && (
          <span className="mt-1 text-xs text-[#2d8116] line-through">
            ₹{(item.price * item.quantity).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  ))}
</div>

      {/* Coupon input */}
      <div className="border-t border-[#2d8116] pt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#2d8116] mb-2">
          <Tag className="w-3 h-3" /> Coupon Code
        </p>

        {couponData ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-green-700 font-mono">{couponData.code}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {couponData.discountType === "percentage"
                  ? `${couponData.discountValue}% off applied`
                  : `₹${couponData.discountValue} off applied`}
              </p>
            </div>
            <button
              onClick={removeCoupon}
              className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors ml-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon() } }}
                placeholder="Enter code e.g. NEZAL25"
                className="flex-1 h-10 px-3 text-sm font-mono uppercase rounded-xl border border-[#2d8116] focus:outline-none focus:border-[#2d8116] transition-colors bg-white"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="px-4 h-10 rounded-xl text-sm font-semibold text-white bg-[#09813b] transition-all disabled:opacity-50 flex-shrink-0"
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>✕</span> {couponError}
              </p>
            )}
          </div>
        )}
      </div>

<div className="border-t border-[#2d8116] pt-4 space-y-2.5">
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
          <span className="text-[#a4a4a4]">Product Cost</span>
          <span className="font-medium text-[#2d8116]">₹{taxableValue.toFixed(2)}</span>
        </div>
        {sortedRates.map((rate) => (
          <div key={rate} className="flex justify-between text-sm pl-3">
            <span className="text-[#a4a4a4]">GST {rate}%</span>
            <span className="font-medium text-[#2d8116]">₹{gstByRate[rate].toFixed(2)}</span>
          </div>
        ))}
        {/* <div className="flex justify-between text-sm">
          <span className="text-[#a4a4a4]">Total GST</span>
          <span className="font-medium text-[#2d8116]">₹{totalGST.toFixed(2)}</span>
        </div> */}
        <div className="flex justify-between text-sm pt-1.5 border-t border-[#2d8116]/20">
          <span className="font-semibold text-[#024a21]">Total Product Cost</span>
          <span className="font-semibold text-[#2d8116]">
              ₹{totalPrice.toFixed(2)}
          </span>
        </div>
      </>
    )
  })()}

  {flashSavings > 0 && (
    <div className="flex justify-between text-sm">
      <span className="flex items-center gap-1" style={{ color: "#E4432B" }}>
        <Zap className="w-3.5 h-3.5 fill-current" />
        Flash Sale Savings
      </span>
      <span className="font-medium" style={{ color: "#E4432B" }}>
        − ₹{flashSavings.toFixed(2)}
      </span>
    </div>
  )}

  {couponData && (
    <div className="flex justify-between text-sm">
      <span className="text-green-600 font-medium">Coupon ({couponData.code})</span>
      <span className="font-medium text-green-600">−₹{discountAmount.toFixed(2)}</span>
    </div>
  )}

  <div className="flex justify-between items-center text-sm">
    <span className="flex items-center gap-1.5 text-[#858585]">
      <Truck className="w-3.5 h-3.5" /> Shipping Cost
    </span>
    {shippingLoading ? (
      <span className="text-xs text-[#858585] animate-pulse">Calculating…</span>
    ) : freeShippingApplied ? (
      <span className="font-medium text-[#2d8116]">FREE</span>
    ) : shippingRate !== null ? (
      <span className="font-medium text-[#2d8116]">₹{shippingRate.toFixed(2)}</span>
    ) : (
      <span className="text-xs text-[#858585]">Enter pincode to calculate</span>
    )}
  </div>
  {shippingError && <p className="text-xs text-red-500"><span className="border">+</span>{shippingError}</p>}

{selectedPaymentMethod === "cod" && codSurcharge > 0 && (
  <div className="flex justify-between items-center text-sm">
    <span className="text-[#858585]">COD Handling Charge</span>
    <span className="font-medium text-[#2d8116]">₹{codSurcharge.toFixed(2)}</span>
  </div>
)}
{selectedPaymentMethod === "cod" && codSurcharge > 0 && (
  <p className="text-xs text-[#ffffff] bg-[#396336] border p-2 rounded-lg">
   * Cash on Delivery orders include a small handling fee.
  </p>
)}

  {!freeShippingApplied && amountLeftForFreeShipping > 0 && (
    <p className="text-xs text-[#2d8116] bg-[#ebffe6] border border-[#2d8116]/30 rounded-lg px-3 py-2">
      Add ₹{amountLeftForFreeShipping.toFixed(2)} more to get FREE shipping!
    </p>
  )}
</div>

      {/* Final total */}
      <div className="rounded-xl bg-[--color-bg-cream] px-4 py-3.5 flex justify-between items-center">
        <span className="font-semibold text-[#024a21]">Total</span>
        <div className="text-right">
          {couponData && (
            <p className="text-xs line-through text-[#858585] font-normal leading-none mb-0.5">
              ₹{totalPrice.toFixed(2)}
            </p>
          )}
          <span className="text-xl font-bold text-[#2d8116]">₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>

    </CardContent>
  </Card>
</div>

        </div>
      </div>

      {isLoading && <FullPageLoader message="Redirecting to payment..." />}
    </main>
  )
}