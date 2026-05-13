// app/profile/orders/page.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

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

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800"
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "processing": return "bg-blue-100 text-blue-800"
      case "shipped": return "bg-purple-100 text-purple-800"
      case "delivered": return "bg-green-100 text-green-800"
      case "cancelled":
      case "canceled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg">Loading orders...</p>
      </main>
    )
  }

  if (status === "unauthenticated") return null

  if (error) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <Card className="border border-[--color-border] rounded-2xl">
          <CardContent className="py-8 text-center">
            <p className="text-[--color-brand-red] font-medium mb-2">Failed to load orders</p>
            <p className="text-sm text-[--color-text-muted] mb-4">{error}</p>
            <Button onClick={fetchOrders} className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white">Retry</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[--color-text-heading] mb-2">My Orders</h1>
          <p className="text-[--color-text-body]">View and track your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card className="border border-[--color-border] rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-[--color-text-muted] mb-4">You haven't placed any orders yet.</p>
              <Link href="/shop">
                <Button className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white">Start Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items ?? []
              const createdAt = order.createdAt ? new Date(order.createdAt) : null
              const total = Number(order.totalAmount ?? 0)
              const statusLabel = order.orderStatus ?? "Unknown"
              const paymentStatusLabel = order.paymentStatus ?? "Unknown"

              return (
                <Card key={order._id} className="border border-[--color-border] rounded-2xl shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-[--color-text-heading]">
                          Order #{order.orderNumber ?? order._id}
                        </CardTitle>
                        <p className="text-sm text-[--color-text-muted] mt-1">
                          {createdAt ? createdAt.toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center justify-end">
                        <Badge className={`${getStatusColor(statusLabel)} px-2 py-1 rounded-full text-xs`}>{statusLabel}</Badge>
                        <Badge variant="outline" className="px-2 py-1 rounded-full text-xs border-[--color-border]">{paymentStatusLabel}</Badge>
                        {order.paymentMethod ? (
                          <Badge variant="secondary" className="px-2 py-1 rounded-full text-xs">{order.paymentMethod.toUpperCase()}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-[--color-text-heading] mb-2">Items</h4>
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <p className="text-sm text-[--color-text-muted]">No items found for this order.</p>
                          ) : (
                            items.map((item, idx) => {
                              const quantity = Number(item.quantity ?? 0)
                              const price = Number(item.price ?? 0)
                              const productName = item.productName ?? item.product?.name ?? "Item"
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-[--color-text-body]">{productName} x {quantity}</span>
                                    <span className="font-medium text-[--color-text-heading]">₹{(price * quantity).toFixed(2)}</span>
                                  </div>
                                  {item.selectedSize && (
                                    <p className="text-xs text-[--color-text-muted] ml-0">
                                      Size: {item.selectedSize.size} ({item.selectedSize.quantity}{item.selectedSize.unit})
                                    </p>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>

                      <div className="border-t border-[--color-border] pt-4 flex justify-between">
                        <span className="font-semibold text-[--color-text-heading]">Total Amount</span>
                        <span className="font-bold text-lg text-[--color-text-heading]">₹{total.toFixed(2)}</span>
                      </div>

                      <Link href={`/profile/orders/${order._id}`}>
                        <Button variant="outline" className="w-full border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream]">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
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