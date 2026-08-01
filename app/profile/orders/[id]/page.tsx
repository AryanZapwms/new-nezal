// app/profile/orders/[id]/page.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleX,
  CreditCard,
  MapPin,
  Package,
  Truck,
  Clock,
  Receipt,
  ShoppingBag,
  Wallet,
  Calendar,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { BRAND } from "@/lib/config"

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
const numberFormatter = new Intl.NumberFormat("en-IN")

const statusLabelMap: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  canceled: "Cancelled",
}

const statusSteps = [
  { key: "pending", label: "Pending", description: "Order received successfully.", icon: Clock },
  { key: "processing", label: "Processing", description: "Your items are being prepared.", icon: Package },
  { key: "shipped", label: "Shipped", description: "Package has left the warehouse.", icon: Truck },
  { key: "delivered", label: "Delivered", description: "Order delivered to your address.", icon: CheckCircle2 },
]

const getStatusBadgeColor = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-800 border-gray-200"
  switch (status.toLowerCase()) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200"
    case "processing": return "bg-blue-50 text-blue-700 border-blue-200"
    case "shipped": return "bg-purple-50 text-purple-700 border-purple-200"
    case "delivered": return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "cancelled":
    case "canceled": return "bg-rose-50 text-rose-700 border-rose-200"
    default: return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

interface ShippingAddress {
  name?: string
  phone?: string
  street?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  pincode?: string
  country?: string
}

interface OrderItem {
  product?: {
    _id?: string
    name?: string
    slug?: string
    image?: string
    company?: { slug?: string; name?: string }
  }
  productId?: string
  productName?: string
  quantity?: number
  price?: number
  selectedSize?: {
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
  }
}

interface OrderDetail {
  _id: string
  orderNumber?: string
  items: OrderItem[]
  totalAmount: number
  orderStatus?: string
  paymentStatus?: string
  paymentMethod?: string
  createdAt?: string
  updatedAt?: string
  shippingAddress?: ShippingAddress
  razorpayOrderId?: string
  razorpayPaymentId?: string
  cancellation?: {
  status: "none" | "requested" | "approved" | "rejected" | "completed"
  type?: "cancel" | "return" | null
  reason?: string
  note?: string
  requestedAt?: string
  processedAt?: string
  adminNote?: string
  refund?: {
    status: "none" | "not_applicable" | "initiated" | "success" | "failed"
    amount?: number
    initiatedAt?: string
    completedAt?: string
  }
}
}

export default function OrderDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params?.id ?? ""
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const CANCELLATION_REASONS = [
  "Changed my mind", "Ordered by mistake", "Found a better price elsewhere",
  "Delivery taking too long", "Product is defective/damaged", "Other",
]
const [showCancelDialog, setShowCancelDialog] = useState(false)
const [cancelReason, setCancelReason] = useState("")
const [cancelNote, setCancelNote] = useState("")
const [cancelSubmitting, setCancelSubmitting] = useState(false)
const [cancelError, setCancelError] = useState<string | null>(null)

const handleSubmitCancellation = async () => {
  if (!cancelReason) { setCancelError("Please select a reason"); return }
  setCancelSubmitting(true); setCancelError(null)
  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason, note: cancelNote }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to submit request")
    setShowCancelDialog(false); setCancelReason(""); setCancelNote("")
    await fetchOrder()
  } catch (err: any) {
    setCancelError(err.message)
  } finally {
    setCancelSubmitting(false)
  }
}

const canRequestCancellation =
  order &&
  order.orderStatus?.toLowerCase() !== "cancelled" &&
  (!order.cancellation || ["none", "rejected"].includes(order.cancellation.status))


  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError("Order not found")
      setOrder(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error("Failed to fetch order details")
      const data: Record<string, any> = await res.json()
      const normalizedItems: OrderItem[] = Array.isArray(data.items)
        ? data.items.map((item: Record<string, any>) => {
            const product = item.product ?? undefined
            const productCompany = product?.company && typeof product.company === "object" ? product.company : undefined
            return {
              product: productCompany ? { ...product, company: productCompany } : product,
              productId: product?._id?.toString?.() ?? item.productId?.toString?.(),
              productName: product?.name ?? item.productName,
              quantity: Number(item.quantity ?? 0),
              price: Number(item.price ?? 0),
              selectedSize: item.selectedSize,
            }
          })
        : []
      const normalized: OrderDetail = {
        _id: data._id,
        orderNumber: data.orderNumber,
        items: normalizedItems,
        totalAmount: Number(data.totalAmount ?? 0),
        orderStatus: data.orderStatus ?? data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        shippingAddress: data.shippingAddress,
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        cancellation: data.cancellation,
      }
      setOrder(normalized)
    } catch (fetchError: any) {
      console.error("Error fetching order detail:", fetchError)
      setOrder(null)
      setError(fetchError?.message ?? "Failed to fetch order details")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    if (!session) return
    fetchOrder()
  }, [status, session, router, fetchOrder])

  const statusInfo = useMemo(() => {
    if (!order?.orderStatus) {
      return {
        label: "Unknown",
        normalized: "",
        steps: statusSteps.map((step) => ({ ...step, completed: false, current: false, reached: false })),
        cancelled: false,
      }
    }
    const normalized = order.orderStatus.toLowerCase()
    const cancelled = normalized === "cancelled" || normalized === "canceled"
    const activeIndex = cancelled ? -1 : statusSteps.findIndex((step) => step.key === normalized)
    return {
      label: statusLabelMap[normalized] ?? order.orderStatus,
      normalized,
      steps: statusSteps.map((step, index) => {
        const reached = activeIndex !== -1 && index <= activeIndex
        const current = activeIndex !== -1 && index === activeIndex
        const completed = activeIndex !== -1 && index < activeIndex
        return { ...step, reached, current, completed }
      }),
      cancelled,
    }
  }, [order])

  const itemCount = useMemo(() => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  }, [order])

  const itemsSubtotal = useMemo(() => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.price ?? 0), 0)
  }, [order])

  const createdAt = order?.createdAt ? new Date(order.createdAt) : null
  const updatedAt = order?.updatedAt ? new Date(order.updatedAt) : null

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg-page] to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[--color-brand-primary] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[--color-text-muted]">Loading order details...</p>
        </div>
      </main>
    )
  }

  if (status === "unauthenticated") return null

  if (error) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl rounded-2xl max-w-md w-full">
          <CardContent className="py-8 text-center space-y-4">
            <CircleX className="h-12 w-12 text-rose-500 mx-auto" />
            <p className="text-[--color-text-heading] font-medium">{error}</p>
            <Button
              onClick={fetchOrder}
              className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white rounded-xl"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <p className="text-[--color-text-muted]">Order not found.</p>
      </main>
    )
  }

  const statusBadge = getStatusBadgeColor(order.orderStatus)
  const statusLabel = statusInfo.label

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg-page] to-white">
      <div className="container-nezal py-8 md:py-12 space-y-8">
        {/* Header with back button and status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => router.push("/profile/orders")}
            className="w-fit justify-start text-[--color-text-heading] hover:text-[--color-brand-primary] group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Orders
          </Button>
          <div className="flex items-center gap-3">
            <Badge className={`${statusBadge} px-4 py-1.5 text-sm font-semibold border rounded-full`}>
              {statusLabel}
            </Badge>
            {order.orderStatus?.toLowerCase() === "delivered" && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
              </Badge>
            )}

            {canRequestCancellation && (
  <Button
    variant="outline"
    onClick={() => setShowCancelDialog(true)}
    className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-full"
  >
    Cancel / Return order
  </Button>
)}
          </div>
        </motion.div>


        {order.cancellation && order.cancellation.status !== "none" && (
  <Card className="border-0 shadow-md rounded-2xl bg-amber-50 overflow-hidden">
    <CardContent className="p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800">
            {order.cancellation.type === "return" ? "Return request" : "Cancellation"}{" "}
            {order.cancellation.status === "requested" && "submitted — pending review"}
            {order.cancellation.status === "approved" && "approved — awaiting pickup/refund"}
            {order.cancellation.status === "rejected" && "request rejected"}
            {order.cancellation.status === "completed" && "completed"}
          </p>
          <p className="text-sm text-amber-700 mt-0.5">Reason: {order.cancellation.reason}</p>
          {order.cancellation.adminNote && (
            <p className="text-sm text-amber-700 mt-0.5">Note from support: {order.cancellation.adminNote}</p>
          )}
        </div>
      </div>

      {order.cancellation.refund && order.cancellation.refund.status !== "none" && (
        <div className="ml-8 pl-3 border-l-2 border-amber-300 space-y-1">
          {order.cancellation.refund.status === "initiated" && (
            <p className="text-sm text-amber-700">
              💳 Refund of {currencyFormatter.format(order.cancellation.refund.amount || 0)} initiated —
              usually reflects in 5–7 business days.
            </p>
          )}
          {order.cancellation.refund.status === "success" && (
            <p className="text-sm text-emerald-700 font-medium">
              ✅ Refund of {currencyFormatter.format(order.cancellation.refund.amount || 0)} completed
              {order.cancellation.refund.completedAt &&
                ` on ${new Date(order.cancellation.refund.completedAt).toLocaleDateString()}`}.
            </p>
          )}
          {order.cancellation.refund.status === "failed" && (
            <p className="text-sm text-rose-700 font-medium">
              ⚠️ We had trouble processing your refund automatically. Our team has been notified — reach
              out below if you don't hear from us within 2 business days.
            </p>
          )}
          {order.cancellation.refund.status === "not_applicable" && (
            <p className="text-sm text-amber-700">No payment was collected on this order, so no refund is due.</p>
          )}
        </div>
      )}

      <div className="ml-8 pl-3 pt-1 border-t border-amber-200/60 flex items-center gap-3 text-sm">
        <span className="text-amber-700">Need help with this?</span>
        <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-amber-900 hover:underline">
          Email support
        </a>
        <span className="text-amber-300">·</span>
        <a href={`tel:${BRAND.whatsapp.primary}`} className="font-medium text-amber-900 hover:underline">
          Call us
        </a>
      </div>
    </CardContent>
  </Card>
)}

        {/* Order summary cards - modern stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-muted]">Order #{order.orderNumber?.slice(-8) ?? order._id.slice(-8)}</p>
                  <p className="text-2xl font-bold text-[--color-text-heading] mt-1">{currencyFormatter.format(order.totalAmount)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-[--color-brand-primary]" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-[--color-text-muted]">
                <Calendar className="h-3 w-3 mr-1" />
                {createdAt ? createdAt.toLocaleDateString() : "—"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-muted]">Total Items</p>
                  <p className="text-2xl font-bold text-[--color-text-heading] mt-1">{numberFormatter.format(itemCount)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-[--color-text-muted] mt-3">Subtotal {currencyFormatter.format(itemsSubtotal)}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-muted]">Payment</p>
                  <p className="text-lg font-semibold text-[--color-text-heading] mt-1">{order.paymentMethod?.toUpperCase() ?? "—"}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <Badge variant="outline" className="mt-3 text-xs rounded-full bg-blue-50 border-blue-200">
                {order.paymentStatus ?? "Unknown"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[--color-text-muted]">Last updated</p>
                  <p className="text-sm font-medium text-[--color-text-heading] mt-1">{updatedAt ? updatedAt.toLocaleDateString() : "—"}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delivery Progress - Timeline style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-[--color-border] bg-gradient-to-r from-[--color-brand-primary]/5 to-transparent">
              <CardTitle className="text-lg font-bold text-[--color-text-heading] flex items-center gap-2">
                <Truck className="h-5 w-5 text-[--color-brand-primary]" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {statusInfo.cancelled ? (
                <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <CircleX className="h-8 w-8 text-rose-500" />
                  <div>
                    <p className="font-semibold text-rose-700">Order Cancelled</p>
                    <p className="text-sm text-rose-600">This order has been cancelled. For any queries, please contact support.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Desktop horizontal stepper (hidden on mobile) */}
                  <div className="hidden md:flex justify-between">
                    {statusInfo.steps.map((step, idx) => {
                      const isActive = step.current
                      const isCompleted = step.completed
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="flex-1 relative">
                          <div className="flex flex-col items-center text-center">
                            <div
                              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                                isCompleted
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isActive
                                  ? "border-[--color-brand-primary] bg-[--color-brand-primary] text-white shadow-md"
                                  : "border-gray-300 bg-white text-gray-400"
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                            </div>
                            <p
                              className={`mt-3 font-semibold text-sm ${
                                isCompleted || isActive ? "text-[--color-text-heading]" : "text-[--color-text-muted]"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-[--color-text-muted] max-w-[140px]">{step.description}</p>
                          </div>
                          {idx < statusInfo.steps.length - 1 && (
                            <div
                              className={`absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] h-0.5 ${
                                step.completed ? "bg-emerald-500" : "bg-gray-200"
                              }`}
                              style={{ transform: "translateY(-50%)" }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Mobile vertical timeline */}
                  <div className="md:hidden space-y-6">
                    {statusInfo.steps.map((step, idx) => {
                      const isActive = step.current
                      const isCompleted = step.completed
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                isCompleted
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isActive
                                  ? "border-[--color-brand-primary] bg-[--color-brand-primary] text-white"
                                  : "border-gray-300 bg-white text-gray-400"
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                            </div>
                            {idx < statusInfo.steps.length - 1 && (
                              <div className={`w-0.5 h-8 mt-1 ${step.completed ? "bg-emerald-500" : "bg-gray-200"}`} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className={`font-semibold ${isActive ? "text-[--color-brand-primary]" : "text-[--color-text-heading]"}`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-[--color-text-muted]">{step.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-[--color-border] bg-gradient-to-r from-[--color-brand-primary]/5 to-transparent">
              <CardTitle className="text-lg font-bold text-[--color-text-heading] flex items-center gap-2">
                <Package className="h-5 w-5 text-[--color-brand-primary]" />
                Items in this order
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[--color-border]">
              {order.items.length ? (
                order.items.map((item, idx) => {
                  const quantity = Number(item.quantity ?? 0)
                  const price = Number(item.price ?? 0)
                  const subtotal = quantity * price
                  const productName = item.productName ?? item.product?.name ?? `Item ${idx + 1}`
                  const productImage = item.product?.image
                  const companyName = item.product?.company && typeof item.product.company === "object" ? item.product.company.name : undefined
                  const companySlug = item.product?.company && typeof item.product.company === "object" ? item.product.company.slug : undefined
                  const productSlug = item.product?.slug
                  const productHref = productSlug && companySlug ? `/shop/${companySlug}/product/${productSlug}` : undefined

                  return (
                    <div key={`${item.productId ?? idx}-${idx}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center hover:bg-[--color-bg-page]/50 transition-colors">
                      <div className="shrink-0">
                        {productImage ? (
                          <Image
                            src={productImage}
                            alt={productName}
                            width={96}
                            height={96}
                            className="h-24 w-24 rounded-xl object-cover border border-[--color-border] bg-white"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-xl bg-[--color-bg-cream] flex items-center justify-center text-xs text-[--color-text-muted] border border-[--color-border]">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {productHref ? (
                          <Link
                            href={productHref}
                            className="text-base font-semibold text-[--color-text-heading] hover:text-[--color-brand-primary] hover:underline line-clamp-1"
                          >
                            {productName}
                          </Link>
                        ) : (
                          <p className="text-base font-semibold text-[--color-text-heading]">{productName}</p>
                        )}
                        {companyName && <p className="text-xs text-[--color-text-muted]">{companyName}</p>}
                        {item.selectedSize && (
                          <p className="text-xs text-[--color-text-muted]">
                            Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[--color-text-heading]">Qty: {numberFormatter.format(quantity)}</span>
                          <span className="text-[--color-text-muted]">× {currencyFormatter.format(price)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-[--color-text-heading]">{currencyFormatter.format(subtotal)}</p>
                        <p className="text-xs text-[--color-text-muted]">Subtotal</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-[--color-text-muted]">No items available for this order.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Shipping & Payment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {/* Shipping Address Card */}
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-[--color-border] bg-gradient-to-r from-[--color-brand-primary]/5 to-transparent">
              <CardTitle className="text-lg font-bold text-[--color-text-heading] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[--color-brand-primary]" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {order.shippingAddress ? (
                <div className="space-y-2 text-sm">
                  {order.shippingAddress.name && (
                    <p className="font-semibold text-[--color-text-heading]">{order.shippingAddress.name}</p>
                  )}
                  {order.shippingAddress.phone && (
                    <p className="text-[--color-text-body] flex items-center gap-1">
                      <span className="text-[--color-text-muted]">Phone:</span> {order.shippingAddress.phone}
                    </p>
                  )}
                  <div className="text-[--color-text-body] space-y-1 pt-1">
  {(() => {
    const line = order.shippingAddress.address || order.shippingAddress.street;
    return line ? <p>{line}</p> : null;
  })()}
  <p>
    {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}
  </p>
  <p>
    {[order.shippingAddress.pincode ?? order.shippingAddress.zipCode, order.shippingAddress.country]
      .filter(Boolean)
      .join(" ")}
  </p>
</div>
                </div>
              ) : (
                <p className="text-sm text-[--color-text-muted]">No shipping address available.</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Details Card */}
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-[--color-border] bg-gradient-to-r from-[--color-brand-primary]/5 to-transparent">
              <CardTitle className="text-lg font-bold text-[--color-text-heading] flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[--color-brand-primary]" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[--color-text-muted]">Payment status</span>
                <Badge variant="outline" className="rounded-full border-[--color-border]">
                  {order.paymentStatus ?? "Unknown"}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-[--color-text-muted]">Method</span>
                <span className="font-medium text-[--color-text-heading]">{order.paymentMethod?.toUpperCase() ?? "—"}</span>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-[--color-text-muted]">Transaction ID</span>
                  <span className="font-mono text-xs text-[--color-text-heading]">{order.razorpayPaymentId.slice(-12)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Order total</span>
                <span className="text-[--color-brand-primary]">{currencyFormatter.format(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
  <DialogContent className="max-w-md rounded-2xl">
    <DialogHeader><DialogTitle>Cancel or return this order</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[--color-text-heading] mb-1.5 block">Reason</label>
        <select
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[--color-border] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-brand-primary]"
        >
          <option value="">Select a reason</option>
          {CANCELLATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-[--color-text-heading] mb-1.5 block">Additional details (optional)</label>
        <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={3} placeholder="Anything else we should know?" />
      </div>
      {cancelError && <p className="text-sm text-rose-600">{cancelError}</p>}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Close</Button>
      <Button onClick={handleSubmitCancellation} disabled={cancelSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white">
        {cancelSubmitting ? "Submitting..." : "Submit request"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </main>
  )
}