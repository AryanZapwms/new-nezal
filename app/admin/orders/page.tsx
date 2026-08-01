// app/admin/orders/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, MapPin, CreditCard, Package, Truck, ExternalLink, Search, ShoppingBag, RefreshCw, Ban, RotateCw } from "lucide-react"

interface OrderItem {
  product?: {
    _id?: string
    name?: string
    sizes?: Array<{
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }>
  }
  productId?: string
  productName?: string
  quantity?: number
  price?: number
  gstPercent?: number
  taxableValue?: number
  gstAmount?: number
  selectedSize?: {
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
  }
}

interface ShippingAddress {
  name?: string
  phone?: string
  street?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  zipCode?: string
  country?: string
}

interface Order {
  _id: string
  orderNumber?: string
  user?: { _id?: string; name?: string; email?: string; phone?: string }
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  items: OrderItem[]
  shippingAddress?: ShippingAddress
  shippingBreakdown?: {
    baseCourierRate?: number
    smartOrderFee?: number
    rateDriftBuffer?: number
    courierNameQuoted?: string
  }
  totalAmount: number
  shippingAmount?: number
  codCharge?: number   // ← add
  totalTaxableValue?: number
  totalGstAmount?: number
  paymentStatus?: string
  paymentMethod?: string
  orderStatus?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  createdAt?: string
  shiprocketOrderId?: number
  shiprocketShipmentId?: number
  awbCode?: string
  courierName?: string
  trackingUrl?: string
  shippingStatus?: string
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
    failureReason?: string
  }
}
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [shippingId, setShippingId] = useState<string | null>(null)
  const [shipError, setShipError] = useState<Record<string, string>>({})
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")


  const [cancellationActionId, setCancellationActionId] = useState<string | null>(null)
const [adminNoteInput, setAdminNoteInput] = useState("")

const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
const [cancelReason, setCancelReason] = useState("")
const [cancellingId, setCancellingId] = useState<string | null>(null)

  const [syncingId, setSyncingId] = useState<string | null>(null)

const handleSyncShiprocket = async (orderId: string) => {
  setSyncingId(orderId)
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/sync-shiprocket`, { method: "POST" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Sync failed")
    await fetchOrders()
    if (selectedOrder && selectedOrder._id === orderId) {
      setSelectedOrder({ ...selectedOrder, ...data.order })
    }
  } catch (error: any) {
    console.error("Error syncing with Shiprocket:", error)
    alert(error.message || "Sync failed")
  } finally {
    setSyncingId(null)
  }
}


const handleAdminCancel = async (orderId: string) => {
  setCancellingId(orderId)
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/cancellation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin_cancel", adminNote: cancelReason }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to cancel order")
    await fetchOrders()
    if (selectedOrder && selectedOrder._id === orderId) {
      setSelectedOrder({ ...selectedOrder, ...data.order })
    }
    setCancelTarget(null)
    setCancelReason("")
  } catch (error: any) {
    console.error("Error cancelling order:", error)
    alert(error.message || "Failed to cancel order")
  } finally {
    setCancellingId(null)
  }
}

const handleCancellationAction = async (orderId: string, action: "approve" | "reject" | "complete") => {
  setCancellationActionId(orderId)
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/cancellation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote: adminNoteInput }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error("Failed to update")
    await fetchOrders()
    if (selectedOrder && selectedOrder._id === orderId) setSelectedOrder({ ...selectedOrder, ...data.order })
    setAdminNoteInput("")
  } catch (error) {
    console.error("Error updating cancellation:", error)
  } finally {
    setCancellationActionId(null)
  }
}

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }
    if ((session.user as any)?.role !== "admin") {
      router.push("/")
      return
    }
    fetchOrders()
  }, [session, router])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : data.orders || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update order")
      await fetchOrders()
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: newStatus })
      }
    } catch (error) {
      console.error("Error updating order:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update payment status")
      await fetchOrders()
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newStatus })
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleShipOrder = async (orderId: string) => {
    setShippingId(orderId)
    setShipError((prev) => ({ ...prev, [orderId]: "" }))
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ship`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Shipment creation failed")
      await fetchOrders()
      if (selectedOrder && selectedOrder._id === orderId) {
        const updated = orders.find((o) => o._id === orderId)
        if (updated) setSelectedOrder({ ...updated, ...data })
      }
    } catch (err: any) {
      setShipError((prev) => ({ ...prev, [orderId]: err.message }))
    } finally {
      setShippingId(null)
    }
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowDetails(true)
  }

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    const orderId = (order.orderNumber || order._id).toLowerCase()
    const customerName = (order.user?.name || order.guestName || "").toLowerCase()
    const customerEmail = (order.user?.email || order.guestEmail || "").toLowerCase()
    return orderId.includes(query) || customerName.includes(query) || customerEmail.includes(query)
  })

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading orders...
        </div>
      </main>
    )
  }

  const completedCount = orders.filter((o) => o.paymentStatus === "completed").length
  const pendingCount = orders.filter((o) => o.paymentStatus !== "completed" && o.paymentStatus !== "failed").length
  const shippedCount = orders.filter((o) => !!o.shiprocketOrderId).length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
              <p className="text-sm text-gray-500 mt-0.5">Track payments, fulfillment, and shipping</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchOrders}
            className="border-gray-200 text-gray-500 hover:text-gray-900"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total orders", value: orders.length, dot: "bg-gray-400", color: "text-gray-900" },
            { label: "Payment completed", value: completedCount, dot: "bg-emerald-500", color: "text-emerald-700" },
            { label: "Payment pending", value: pendingCount, dot: "bg-amber-500", color: "text-amber-700" },
            { label: "Shipped", value: shippedCount, dot: "bg-blue-500", color: "text-blue-700" },
            {
  label: "Fees collected (shipping)",
  value: `₹${orders.reduce((sum, o) => sum + ((o.shippingBreakdown?.smartOrderFee ?? 0) + (o.shippingBreakdown?.rateDriftBuffer ?? 0)), 0).toFixed(2)}`,
  dot: "bg-purple-500",
  color: "text-purple-700",
}
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Table card ───────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">
              All orders ({searchQuery ? filteredOrders.length : orders.length})
            </h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID or customer name..."
                className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              />
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No orders found</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-700">No orders match "{searchQuery}"</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
    <th className="py-3 px-3 sticky text-center left-0 bg-gray-50/60 z-10 border">Actions</th>
    <th className="py-3 px-6 border text-center">Order ID</th>
    <th className="py-3 px-3 border text-center">Customer</th>
    <th className="py-3 px-3 border text-center">Items</th>
    <th className="py-3 px-3 border text-center">Amount</th>
    <th className="py-3 px-3 border text-center">Payment</th>
    <th className="py-3 px-3 border text-center">Method</th>
    <th className="py-3 px-3 border text-center">GST</th>
    <th className="py-3 px-3 border text-center">Shipping</th>
    <th className="py-3 px-3 border text-center">COD Fee</th>
    <th className="py-3 px-3 border text-center">Date</th>
    <th className="py-3 px-3 border text-center">Return/Cancel</th>
  </tr>
</thead>
                <tbody>
  {filteredOrders.map((order) => (
    <tr key={order._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors border">
      <td className="py-3.5 px-3 sticky left-0 bg-white hover:bg-gray-50/60 z-10 border-gray-300 border">
        <div className="flex items-center gap-1">
          {order.shiprocketOrderId && order.cancellation?.status !== "completed" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSyncShiprocket(order._id)}
              disabled={syncingId === order._id}
              className="text-gray-400 hover:text-blue-600 border"
              title="Sync status from Shiprocket"
            >
              <RotateCw className={`w-4 h-4 ${syncingId === order._id ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewDetails(order)}
            className="text-gray-400 hover:text-emerald-700 border"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {order.orderStatus !== "cancelled" && order.orderStatus !== "delivered" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCancelTarget(order)}
              className="text-gray-400 hover:text-rose-60 border bg-[#fb6c6c] hover:bg-[#a90303] text-white"
              title="Cancel order"
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-gray-700 border-gray-300 border">
        {order.orderNumber || order._id.slice(-6)}
      </td>
      <td className="py-3.5 px-3 border-gray-300 border">
        <p className="font-medium text-sm text-gray-900">{order.user?.name || order.guestName || "Guest"}</p>
        <p className="text-xs text-gray-400">{order.user?.email || order.guestEmail}</p>
      </td>
      <td className="py-3.5 px-3 text-xs border-gray-300 border">
        <Badge variant="outline" className="border-gray-200 text-gray-600">{order.items?.length || 0} items</Badge>
      </td>
      <td className="py-3.5 px-3 font-semibold text-sm text-gray-900 border-gray-300 border">₹{(order.totalAmount || 0).toFixed(2)}</td>
      <td className="py-3.5 px-3 border-gray-300 border">
        <Badge
          className={
            order.paymentStatus === "completed"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : order.paymentStatus === "failed"
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }
        >
          {order.paymentStatus === "completed" ? "Completed" : order.paymentStatus === "failed" ? "Failed" : "Pending"}
        </Badge>
      </td>
      <td className="py-3.5 px-3 border-gray-300 border">
        <Badge
          variant={order.paymentMethod === "cod" ? "secondary" : order.paymentMethod === "ccavenue" ? "outline" : "default"}
          className={order.paymentMethod !== "cod" && order.paymentMethod !== "ccavenue" ? "bg-emerald-700 hover:bg-emerald-700" : ""}
        >
          {order.paymentMethod === "cod" ? "COD" : order.paymentMethod === "ccavenue" ? "CCAvenue" : "Razorpay"}
        </Badge>
      </td>
      <td className="py-3.5 px-3 text-xs text-gray-500 border-gray-300 border">₹{(order.totalGstAmount ?? 0).toFixed(2)}</td>
      <td className="py-3.5 px-3 border-gray-300 border">
        {order.shiprocketOrderId ? (
          <div className="space-y-1">
            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs">Shipped</Badge>
            {order.awbCode && <p className="text-xs text-gray-400 font-mono">AWB: {order.awbCode}</p>}
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:underline flex items-center gap-1 hover:bg-emerald-700 hover:text-white border px-2 py-1 rounded-xl"
              >
                Track <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : order.paymentStatus === "completed" || order.paymentMethod === "cod" ? (
          <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">Processing…</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">Awaiting payment</Badge>
        )}
      </td>
      <td className="py-3.5 px-3 text-xs text-gray-500 border-gray-300 border">
        {order.paymentMethod === "cod" && (order.codCharge ?? 0) > 0
          ? `₹${(order.codCharge ?? 0).toFixed(2)}`
          : "—"}
      </td>
      <td className="py-3.5 px-3 text-xs text-gray-400 border-gray-300 border">
        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="py-3.5 px-3 border-gray-300 border">
        {order.cancellation && order.cancellation.status !== "none" ? (
          <Badge className={
            order.cancellation.status === "requested" ? "bg-amber-50 text-amber-700 border-amber-100 text-xs" :
            order.cancellation.status === "approved" ? "bg-blue-50 text-blue-700 border-blue-100 text-xs" :
            order.cancellation.status === "completed" ? "bg-rose-50 text-rose-700 border-rose-100 text-xs" :
            "bg-gray-50 text-gray-600 border-gray-100 text-xs"
          }>
            {order.cancellation.type === "return" ? "Return" : "Cancel"} · {order.cancellation.status}
          </Badge>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Order Details Modal ──────────────────────────── */}
      {selectedOrder && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <DialogTitle>Order {selectedOrder.orderNumber || selectedOrder._id}</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              {/* Customer Information */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Customer information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="font-medium text-sm text-gray-900">{selectedOrder.user?.name || selectedOrder.guestName || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium text-sm text-gray-900">{selectedOrder.user?.email || selectedOrder.guestEmail || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-medium text-sm text-gray-900">{selectedOrder.user?.phone || selectedOrder.guestPhone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order date</p>
                    <p className="font-medium text-sm text-gray-900">
                      {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="space-y-2.5">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="font-medium text-sm text-gray-900">{item.productName || item.product?.name || `Item ${idx + 1}`}</p>
                      {(() => {
                        const sel = item.selectedSize ?? item.product?.sizes?.[0]
                        if (!sel) return null
                        return (
                          <p className="text-xs text-gray-400 mt-1">
                            Size: {sel.size} ({sel.quantity}{sel.unit})
                          </p>
                        )
                      })()}
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-500">Qty: {item.quantity} × ₹{(item.price || 0).toFixed(2)}</span>
                        <span className="font-medium text-gray-900">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
                      </div>
                      {typeof item.gstPercent === "number" && item.gstPercent > 0 && (
                        <div className="flex justify-between text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
                          <span>Taxable: ₹{(item.taxableValue ?? 0).toFixed(2)} + GST {item.gstPercent}%</span>
                          <span>GST: ₹{(item.gstAmount ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Shipping address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="font-medium text-gray-900">
                        {Array.from(
                          new Set(
                            [selectedOrder.shippingAddress.street, selectedOrder.shippingAddress.address].filter(Boolean)
                          )
                        ).join(", ") || "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">City</p>
                        <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.city || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">State</p>
                        <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.state || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">PIN code</p>
                        <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.pincode || selectedOrder.shippingAddress.zipCode || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment information
                </h3>

                <div className="space-y-1.5 text-sm mb-4 pb-4 border-b border-gray-200">
  <div className="flex justify-between text-gray-600">
    <span>Taxable value</span>
    <span>₹{(selectedOrder.totalTaxableValue ?? 0).toFixed(2)}</span>
  </div>
  <div className="flex justify-between text-gray-600">
    <span>GST</span>
    <span>₹{(selectedOrder.totalGstAmount ?? 0).toFixed(2)}</span>
  </div>
  <div className="flex justify-between text-gray-600">
  <span>Shipping</span>
  <span>₹{(selectedOrder.shippingAmount ?? 0).toFixed(2)}</span>
</div>
{selectedOrder.shippingBreakdown && (
  <div className="pl-3 space-y-1 text-xs text-gray-400 border-l-2 border-gray-200 ml-1">
    <div className="flex justify-between">
      <span>Courier base rate {selectedOrder.shippingBreakdown.courierNameQuoted ? `(${selectedOrder.shippingBreakdown.courierNameQuoted})` : ""}</span>
      <span>₹{(selectedOrder.shippingBreakdown.baseCourierRate ?? 0).toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Smart Order fee</span>
      <span>₹{(selectedOrder.shippingBreakdown.smartOrderFee ?? 0).toFixed(2)}</span>
    </div>
    <div className="flex justify-between">
      <span>Rate-drift buffer</span>
      <span>₹{(selectedOrder.shippingBreakdown.rateDriftBuffer ?? 0).toFixed(2)}</span>
    </div>
  </div>
)}
  {selectedOrder.paymentMethod === "cod" && (selectedOrder.codCharge ?? 0) > 0 && (
    <div className="flex justify-between text-gray-600">
      <span>COD handling charge</span>
      <span>₹{(selectedOrder.codCharge ?? 0).toFixed(2)}</span>
    </div>
  )}
  <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
    <span>Total</span>
    <span>₹{(selectedOrder.totalAmount || 0).toFixed(2)}</span>
  </div>
</div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Payment method</p>
                    <p className="font-medium text-sm text-gray-900">
                      {selectedOrder.paymentMethod === "cod" ? "Cash on Delivery" : selectedOrder.paymentMethod === "ccavenue" ? "CCAvenue" : "Razorpay"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment status</p>
                    <Badge variant="outline" className="border-gray-200 bg-gray-600 text-white mt-0.5 ">{selectedOrder.paymentStatus || "pending"}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Order status</p>
                    <Badge variant="outline" className="border-gray-200 bg-gray-600 text-white mt-0.5">{selectedOrder.orderStatus || "pending"}</Badge>
                  </div>
                </div>
              </div>

              {/* Shiprocket / Shipping Info */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  Shiprocket
                </h3>
                {selectedOrder.shiprocketOrderId ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">Shiprocket order ID</p>
                      <p className="font-medium font-mono text-gray-900">{selectedOrder.shiprocketOrderId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Shipment ID</p>
                      <p className="font-medium font-mono text-gray-900">{selectedOrder.shiprocketShipmentId}</p>
                    </div>
                    {selectedOrder.awbCode && (
                      <div>
                        <p className="text-xs text-gray-400">AWB code</p>
                        <p className="font-medium font-mono text-gray-900">{selectedOrder.awbCode}</p>
                      </div>
                    )}
                    {selectedOrder.courierName && (
                      <div>
                        <p className="text-xs text-gray-400">Courier</p>
                        <p className="font-medium text-gray-900">{selectedOrder.courierName}</p>
                      </div>
                    )}
                    {selectedOrder.trackingUrl && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-1">Tracking</p>
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline flex items-center gap-1 text-sm font-medium"
                        >
                          Track shipment <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Shipment will be created automatically once payment is confirmed.
                  </p>
                )}
              </div>

              {selectedOrder.cancellation && selectedOrder.cancellation.status !== "none" && (
  <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700 mb-3">
      {selectedOrder.cancellation.type === "return" ? "Return request" : "Cancellation"}
    </h3>
    <div className="space-y-1.5 text-sm mb-3">
      <p><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{selectedOrder.cancellation.status}</span></p>
      <p><span className="text-gray-500">Reason:</span> {selectedOrder.cancellation.reason}</p>
      {selectedOrder.cancellation.note && <p><span className="text-gray-500">Note:</span> {selectedOrder.cancellation.note}</p>}
      {selectedOrder.cancellation.requestedAt && (
        <p><span className="text-gray-500">Requested:</span> {new Date(selectedOrder.cancellation.requestedAt).toLocaleString()}</p>
      )}
    </div>
    {selectedOrder.cancellation.status === "requested" && (
      <div className="space-y-2">
        <input type="text" placeholder="Admin note (optional)" value={adminNoteInput}
          onChange={(e) => setAdminNoteInput(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200" />
        <div className="flex gap-2">
          <Button size="sm" disabled={cancellationActionId === selectedOrder._id}
            onClick={() => handleCancellationAction(selectedOrder._id, "approve")}
            className="bg-emerald-700 hover:bg-emerald-800">Approve</Button>
          <Button size="sm" variant="outline" disabled={cancellationActionId === selectedOrder._id}
            onClick={() => handleCancellationAction(selectedOrder._id, "reject")}
            className="border-gray-200">Reject</Button>
        </div>
      </div>
    )}
    {selectedOrder.cancellation.status === "approved" && (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Once the item is picked up/returned and refunded, mark complete to close the order.</p>
        <Button size="sm" disabled={cancellationActionId === selectedOrder._id}
          onClick={() => handleCancellationAction(selectedOrder._id, "complete")}
          className="bg-rose-600 hover:bg-rose-700">Mark returned & cancel order</Button>
      </div>
    )}
  </div>
)}

{selectedOrder.cancellation?.refund && selectedOrder.cancellation.refund.status !== "none" && (
  <div className="mt-3 pt-3 border-t border-rose-200 text-sm">
    <span className="text-gray-500">Refund:</span>{" "}
    {selectedOrder.cancellation.refund.status === "success" && (
      <span className="text-emerald-700 font-medium">
        ✅ ₹{(selectedOrder.cancellation.refund.amount ?? 0).toFixed(2)} refunded successfully
      </span>
    )}
    {selectedOrder.cancellation.refund.status === "initiated" && (
      <span className="text-amber-700 font-medium">⏳ Refund initiated, awaiting confirmation</span>
    )}
    {selectedOrder.cancellation.refund.status === "failed" && (
      <span className="text-rose-700 font-medium">
        ⚠️ Refund failed — {selectedOrder.cancellation.refund.failureReason || "check logs"}. Needs manual refund.
      </span>
    )}
    {selectedOrder.cancellation.refund.status === "not_applicable" && (
      <span className="text-gray-500">No refund needed (no payment collected)</span>
    )}
  </div>
)}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {cancelTarget && (
  <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason("") } }}>
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4 text-white" />
          </div>
          <DialogTitle>Cancel order {cancelTarget.orderNumber || cancelTarget._id.slice(-6)}?</DialogTitle>
        </div>
      </DialogHeader>

      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This will mark the order as <span className="font-medium text-gray-900">cancelled</span>,
          cancel its Shiprocket shipment (if any), and can't be undone from here.
        </p>

        {cancelTarget.paymentStatus === "completed" && (
  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
    {cancelTarget.paymentMethod === "ccavenue" ? (
      <>Payment was already collected via CCAvenue. Cancelling will automatically attempt a refund of ₹{cancelTarget.totalAmount.toFixed(2)} to the original payment method.</>
    ) : cancelTarget.paymentMethod === "cod" ? (
      <>This is a COD order — no payment was collected, so no refund is needed.</>
    ) : (
      <>Payment was already collected via {cancelTarget.paymentMethod}. Cancelling here does <b>not</b> issue a refund automatically — you'll need to refund manually.</>
    )}
  </div>
)}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Reason (optional, visible to you only)</label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Out of stock, customer requested by phone..."
            className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            className="border-gray-200"
            onClick={() => { setCancelTarget(null); setCancelReason("") }}
          >
            Keep order
          </Button>
          <Button
            disabled={cancellingId === cancelTarget._id}
            onClick={() => handleAdminCancel(cancelTarget._id)}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {cancellingId === cancelTarget._id ? "Cancelling..." : "Cancel order"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
    </main>
  )
}