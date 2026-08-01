// app/orders-and-returns/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronDown,
  Package,
  Truck,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Star,
  MoreHorizontal,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  _id: string
  name: string
  label?: string
  description?: string
  price: number
  quantity: number
  size?: string
  image?: string
  rating?: number
  productId?: string
  category?: string
}

interface Order {
  _id: string
  createdAt: string
  status: string
  estimatedDelivery?: string
  carrier?: string
  trackingNumber?: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  promoCode?: string
  promoDiscount?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
const CARRIER_OPTIONS = ["All Carriers", "FedEx", "Blue Dart", "DTDC", "Delhivery", "Ekart"]
const ITEMS_PER_PAGE = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function fmtCurrency(amount: number) {
  return `₹${amount.toFixed(2)}`
}

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "delivered": return "text-green-600 bg-green-50 border-green-200"
    case "shipped":   return "text-blue-600 bg-blue-50 border-blue-200"
    case "processing":return "text-amber-600 bg-amber-50 border-amber-200"
    case "pending":   return "text-gray-600 bg-gray-50 border-gray-200"
    case "cancelled": return "text-red-600 bg-red-50 border-red-200"
    default:          return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterDropdown({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ElementType
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E0D8CC] bg-white text-sm font-medium text-[#1A1A1A] hover:border-[#1B6B2F] transition-colors min-w-[140px]"
      >
        <Icon className="w-4 h-4 text-[#888888] shrink-0" />
        <span className="flex-1 text-left truncate">{value || label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#888888] shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 min-w-full bg-white rounded-lg border border-[#E0D8CC] shadow-lg overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F5F0E8] transition-colors ${
                  value === opt ? "text-[#1B6B2F] font-semibold bg-[#F5F0E8]" : "text-[#1A1A1A]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          fill={i < Math.round(rating) ? "#F5C842" : "#D1D5DB"}
          stroke={i < Math.round(rating) ? "#F5C842" : "#D1D5DB"}
        />
      ))}
      <span className="ml-1 text-xs text-[#888888]">{rating.toFixed(1)}</span>
    </div>
  )
}

function OrderItemRow({ item, companySlug }: { item: OrderItem; companySlug?: string }) {
  const router = useRouter()
  const sizes = item.size ? item.size.split(",").map((s) => s.trim()) : ["6:30", "6:00", "6:30"]

  return (
    <div className="border border-[#E0D8CC] rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        {/* Left: product info */}
        <div className="flex gap-3 flex-1 min-w-0">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#E0D8CC]"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#F5F0E8] shrink-0 flex items-center justify-center">
              <Package className="w-6 h-6 text-[#888888]" />
            </div>
          )}

          <div className="min-w-0">
            <p className="font-semibold text-[#1A1A1A] text-sm leading-tight truncate">{item.name}</p>
            {item.description && (
              <p className="text-xs text-[#888888] mt-0.5">{item.description}</p>
            )}
            {item.category && (
              <span className="inline-block mt-1 text-[11px] font-medium text-[#1B6B2F] bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                {item.category}
              </span>
            )}
          </div>
        </div>

        {/* Right: rating */}
        {item.rating && (
          <div className="shrink-0">
            <StarRating rating={item.rating} />
          </div>
        )}
      </div>

      {/* Size pills */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {sizes.map((size, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-lg bg-[#111111] text-white text-xs font-medium"
          >
            {size}
          </span>
        ))}
        <button className="p-1 rounded-lg bg-[#111111] text-white">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {companySlug && item.productId && (
          <button
            onClick={() => router.push(`/shop/${companySlug}/product/${item.productId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-medium hover:bg-[#333] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </button>
        )}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-medium hover:bg-[#333] transition-colors">
          <RotateCcw className="w-3 h-3" />
          Reorder
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-medium hover:bg-[#333] transition-colors">
          <Star className="w-3 h-3" />
          Review
        </button>
        <button className="p-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#333] transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function OrderSummaryCard({
  order,
  promoInput,
  setPromoInput,
  onApplyPromo,
}: {
  order: Order | null
  promoInput: string
  setPromoInput: (v: string) => void
  onApplyPromo: () => void
}) {
  const subtotal  = order?.subtotal  ?? 150
  const shipping  = order?.shipping  ?? 5
  const tax       = order?.tax       ?? 5
  const total     = order?.total     ?? 160

  return (
    <div className="bg-white border border-[#E0D8CC] rounded-2xl p-5 sticky top-4">
      <h3 className="font-bold text-[#1A1A1A] text-base mb-4">Order Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-[#444444]">
          <span>Subtotal</span>
          <span>{fmtCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[#444444]">
          <span>Shipping</span>
          <span>{fmtCurrency(shipping)}</span>
        </div>
        <div className="flex justify-between text-[#444444]">
          <span>Estimated tax</span>
          <span>{fmtCurrency(tax)}</span>
        </div>
        {order?.promoDiscount && order.promoDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo discount</span>
            <span>-{fmtCurrency(order.promoDiscount)}</span>
          </div>
        )}
        <div className="pt-3 border-t border-[#E0D8CC] flex justify-between font-bold text-[#1A1A1A] text-base">
          <span>Total</span>
          <span>{fmtCurrency(total)}</span>
        </div>
      </div>

      <a
        href="/checkout"
        className="mt-5 block w-full text-center py-3 rounded-xl bg-[#111111] text-white font-semibold text-sm hover:bg-[#333] transition-colors"
      >
        Check out
      </a>

      <p className="text-center text-xs text-[#888888] mt-3">Use promo code for discounts</p>

      <div className="mt-3">
        <p className="text-xs font-medium text-[#444444] mb-1.5">Promo code</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter code"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-[#E0D8CC] rounded-lg focus:outline-none focus:border-[#1B6B2F] transition-colors"
          />
          <button
            onClick={onApplyPromo}
            className="px-4 py-2 text-sm font-semibold bg-[#1B6B2F] text-white rounded-lg hover:bg-[#14501F] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersAndReturns() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orders, setOrders]             = useState<Order[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterDate, setFilterDate]     = useState("May 24, 2024")
  const [filterStatus, setFilterStatus] = useState("Shipped")
  const [filterDelivery, setFilterDelivery] = useState("Oct 10, 2023")
  const [filterCarrier, setFilterCarrier]   = useState("FedEx")
  const [currentPage, setCurrentPage]   = useState(1)
  const [promoInput, setPromoInput]     = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login")
  }, [status, router])

  // Fetch orders
  useEffect(() => {
    if (status !== "authenticated") return
    let mounted = true
    async function loadOrders() {
      setLoading(true)
      try {
        const res = await fetch("/api/orders")
        if (!res.ok) throw new Error("Failed to fetch orders")
        const data = await res.json()
        const raw: Order[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
          ? data.orders
          : []
        if (!mounted) return
        setOrders(raw)
        if (raw.length > 0) setSelectedOrder(raw[0])
      } catch (err) {
        console.error("Error fetching orders:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadOrders()
    return () => { mounted = false }
  }, [status])

  // Derive all items from all orders for the list view
  const allItems = orders.flatMap((o) =>
    o.items.map((item) => ({ ...item, orderId: o._id, orderStatus: o.status }))
  )

  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE))
  const pagedItems = allItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleApplyPromo = () => {
    // Promo logic handled server-side; this just shows intent
    if (!promoInput.trim()) return
    alert(`Promo code "${promoInput}" will be applied at checkout.`)
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container-nezal py-10">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
            <div className="h-80 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container-nezal py-8">

        {/* ── Page title ── */}
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center mb-8">
          Track Order
        </h1>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <FilterDropdown
            icon={Calendar}
            label="Date"
            value={filterDate}
            options={["May 24, 2024", "Apr 10, 2024", "Mar 01, 2024"]}
            onChange={setFilterDate}
          />
          <FilterDropdown
            icon={Package}
            label="Status"
            value={filterStatus}
            options={STATUS_OPTIONS}
            onChange={setFilterStatus}
          />
          <FilterDropdown
            icon={Truck}
            label="Est. Delivery"
            value={filterDelivery}
            options={["Oct 10, 2023", "Nov 15, 2023", "Dec 01, 2023"]}
            onChange={setFilterDelivery}
          />
          <FilterDropdown
            icon={Tag}
            label="Carrier"
            value={filterCarrier}
            options={CARRIER_OPTIONS}
            onChange={setFilterCarrier}
          />
          <button className="ml-auto px-5 py-2 rounded-lg bg-[#111111] text-white text-sm font-semibold hover:bg-[#333] transition-colors">
            Track Package
          </button>
        </div>

        {/* ── Main layout: items list + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* Left: order items */}
          <div>
            <h2 className="text-sm font-semibold text-[#444444] mb-4">Order Details</h2>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="w-16 h-16 text-[#E0D8CC] mb-4" />
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">No orders yet</h3>
                <p className="text-sm text-[#888888] mb-6">
                  When you place orders, they&apos;ll appear here for tracking.
                </p>
                <a
                  href="/shop"
                  className="px-6 py-2.5 rounded-xl bg-[#1B6B2F] text-white text-sm font-semibold hover:bg-[#14501F] transition-colors"
                >
                  Start Shopping
                </a>
              </div>
            ) : pagedItems.length === 0 ? (
              <div className="text-center py-12 text-[#888888] text-sm">
                No items match the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {pagedItems.map((item) => (
                  <OrderItemRow
                    key={`${item.orderId}-${item._id}`}
                    item={item}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 mt-6 justify-center">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-[#E0D8CC] disabled:opacity-40 hover:border-[#1B6B2F] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pg: number
                  if (totalPages <= 5) pg = i + 1
                  else if (currentPage <= 3) pg = i + 1
                  else if (currentPage >= totalPages - 2) pg = totalPages - 4 + i
                  else pg = currentPage - 2 + i
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        pg === currentPage
                          ? "bg-[#111111] text-white"
                          : "border border-[#E0D8CC] text-[#444444] hover:border-[#1B6B2F]"
                      }`}
                    >
                      {pg}
                    </button>
                  )
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-[#E0D8CC] disabled:opacity-40 hover:border-[#1B6B2F] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <div>
            <OrderSummaryCard
              order={selectedOrder}
              promoInput={promoInput}
              setPromoInput={setPromoInput}
              onApplyPromo={handleApplyPromo}
            />
          </div>
        </div>
      </div>
    </main>
  )
}