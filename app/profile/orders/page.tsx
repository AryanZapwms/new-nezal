"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Package, CreditCard, Calendar, ChevronRight } from "lucide-react"

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

interface Order {
  _id: string
  orderNumber?: string
  items?: OrderItem[]
  totalAmount?: number
  orderStatus?: string
  paymentStatus?: string
  createdAt?: string
  updatedAt?: string
  paymentMethod?: string
}

const getStatusColor = (status?: string) => {
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

const getStatusIcon = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "delivered": return <Package className="h-4 w-4" />
    case "shipped": return <Package className="h-4 w-4" />
    default: return <Calendar className="h-4 w-4" />
  }
}

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" })

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    if (!session) return
    fetchOrders()
  }, [status, session, router])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/orders?userOrders=true")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      if (Array.isArray(data)) {
        const normalized: Order[] = data.map((order: Order & { status?: string; items?: unknown }) => {
          const { status: legacyStatus, items, ...rest } = order
          return {
            ...rest,
            items: Array.isArray(items) ? (items as OrderItem[]) : [],
            orderStatus: rest.orderStatus ?? legacyStatus,
          }
        })
        setOrders(normalized)
      } else {
        setOrders([])
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err)
      setError(err?.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[--color-bg-page] to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[--color-brand-primary] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[--color-text-muted]">Loading your orders...</p>
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
            <div className="text-rose-500 mb-2">
              <Package className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-[--color-text-heading] font-medium">Failed to load orders</p>
            <p className="text-sm text-[--color-text-muted]">{error}</p>
            <Button
              onClick={fetchOrders}
              className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white rounded-xl"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg-page] to-white">
      <div className="container-nezal py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[--color-text-heading] mb-2">My Orders</h1>
          <p className="text-[--color-text-muted]">
            {orders.length === 0
              ? "You haven't placed any orders yet."
              : `You have ${orders.length} order${orders.length > 1 ? "s" : ""} with us`}
          </p>
        </motion.div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-md rounded-2xl bg-white text-center">
              <CardContent className="py-16 space-y-4">
                <Package className="h-16 w-16 text-[--color-text-muted] mx-auto" />
                <p className="text-[--color-text-muted]">No orders yet</p>
                <Link href="/shop">
                  <Button className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white rounded-xl px-8">
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            {orders.map((order) => {
              const items = order.items ?? []
              const createdAt = order.createdAt ? new Date(order.createdAt) : null
              const total = Number(order.totalAmount ?? 0)
              const statusLabel = order.orderStatus ?? "Unknown"
              const paymentStatusLabel = order.paymentStatus ?? "Unknown"
              const itemCount = items.reduce((sum, i) => sum + Number(i.quantity ?? 0), 0)

              // Get first item for preview
              const firstItem = items[0]
              const firstItemName = firstItem?.productName ?? firstItem?.product?.name ?? "Item"
              const remainingCount = itemCount - 1

              return (
                <motion.div key={order._id} variants={cardVariants}>
                  <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden hover:shadow-lg transition-all duration-300">
                    {/* Card Header with gradient background */}
                    <div className="bg-gradient-to-r from-[--color-brand-primary]/5 to-transparent border-b border-[--color-border] px-6 py-4">
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-[--color-text-muted] mb-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {createdAt ? dateFormatter.format(createdAt) : "—"}
                          </div>
                          <CardTitle className="text-lg font-bold text-[--color-text-heading]">
                            Order #{order.orderNumber ?? order._id.slice(-8)}
                          </CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${getStatusColor(statusLabel)} px-3 py-1 rounded-full text-xs font-medium border`}>
                            {getStatusIcon(statusLabel)}
                            <span className="ml-1">{statusLabel}</span>
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-[--color-border] bg-white">
                            {paymentStatusLabel}
                          </Badge>
                          {order.paymentMethod && (
                            <Badge variant="secondary" className="rounded-full bg-gray-100 text-gray-700">
                              {order.paymentMethod.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {/* Items preview */}
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[--color-text-heading] mb-2">
                          <Package className="h-4 w-4 text-[--color-brand-primary]" />
                          Items ({itemCount})
                        </div>
                        <div className="text-sm text-[--color-text-body]">
                          {firstItem ? (
                            <div className="flex justify-between items-center">
                              <span className="truncate">{firstItemName}</span>
                              {remainingCount > 0 && (
                                <span className="text-[--color-text-muted] text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                  +{remainingCount} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[--color-text-muted]">No items</span>
                          )}
                        </div>
                      </div>

                      {/* Total and action */}
                      <div className="flex justify-between items-center pt-2 border-t border-[--color-border]">
                        <div>
                          <p className="text-xs text-[--color-text-muted]">Total amount</p>
                          <p className="text-xl font-bold text-[--color-text-heading]">
                            {currencyFormatter.format(total)}
                          </p>
                        </div>
                        <Link href={`/profile/orders/${order._id}`}>
                          <Button
                            variant="outline"
                            className="border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream] rounded-xl gap-2"
                          >
                            View Details
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </main>
  )
}