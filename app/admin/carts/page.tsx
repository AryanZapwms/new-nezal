// app/admin/carts/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ShoppingBasket, Search, Eye, RefreshCw, Clock, IndianRupee, Flame } from "lucide-react"
import Image from "next/image"

interface CartItem {
  productId: string
  name: string
  image?: string
  quantity: number
  selectedSize?: { size?: string; unit?: string }
  price: number
}

interface AdminCart {
  _id: string
  status: "active" | "abandoned" | "converted" | "merged"
  derivedStatus: "active" | "abandoned" | "converted" | "merged"
  lastActivityAt: string
  createdAt: string
  cartTotal: number
  itemCount: number
  items: CartItem[]
  customer: { type: "user" | "guest"; name: string; email: string | null; phone: string | null }
}

interface TopProduct {
  productId: string
  name: string
  image?: string
  cartCount: number
}

const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "abandoned", label: "Abandoned (24h+)" },
  { value: "converted", label: "Converted" },
  { value: "all", label: "All" },
]

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function statusBadge(status: AdminCart["derivedStatus"]) {
  switch (status) {
    case "abandoned":
      return <Badge className="bg-amber-50 text-amber-700 border-amber-100">Abandoned</Badge>
    case "converted":
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Converted</Badge>
    case "merged":
      return <Badge variant="outline" className="border-gray-200 text-gray-500">Merged</Badge>
    default:
      return <Badge className="bg-blue-50 text-blue-700 border-blue-100">Active</Badge>
  }
}

export default function AdminCartsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [carts, setCarts] = useState<AdminCart[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCart, setSelectedCart] = useState<AdminCart | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")

  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ activeCarts: 0, abandonedCarts: 0, potentialRevenue: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }
    if ((session.user as any)?.role !== "admin") {
      router.push("/")
      return
    }
  }, [session, router])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    if (!session || (session.user as any)?.role !== "admin") return
    fetchCarts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, page, searchQuery, statusFilter])

  const fetchCarts = async () => {
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(PAGE_SIZE))
      params.set("status", statusFilter)
      if (searchQuery) params.set("search", searchQuery)
      const res = await fetch(`/api/admin/carts?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch carts")
      const data = await res.json()
      setCarts(data.carts || [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
      if (data.stats) setStats(data.stats)
      if (data.topAbandonedProducts) setTopProducts(data.topAbandonedProducts)
    } catch (error) {
      console.error("Error fetching carts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const handleViewDetails = (cart: AdminCart) => {
    setSelectedCart(cart)
    setShowDetails(true)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingBasket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Abandoned Carts</h1>
              <p className="text-sm text-gray-500 mt-0.5">Customers with products in their cart who haven't checked out</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchCarts}
            className="border-gray-200 text-gray-500 hover:text-gray-900"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <p className="text-xs font-medium text-gray-500">Active carts</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-blue-700">{stats.activeCarts}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-medium text-gray-500">Abandoned (24h+ idle)</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-700">{stats.abandonedCarts}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs font-medium text-gray-500">Potential revenue (abandoned)</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-purple-700">₹{stats.potentialRevenue.toFixed(2)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Value of items sitting in abandoned carts — not guaranteed revenue.</p>
          </div>
        </div>

        {/* Most abandoned products */}
        {topProducts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Most abandoned products</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {topProducts.map((p) => (
                <div key={p.productId} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0">
                    {p.image && <Image src={p.image} alt={p.name} fill sizes="32px" className="object-cover" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-1 max-w-[160px]">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.cartCount} abandoned carts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Carts ({total})</h2>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by customer name or email..."
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === tab.value ? "bg-emerald-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading carts…</div>
          ) : total === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ShoppingBasket className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {searchQuery ? `No carts match "${searchQuery}"` : "No carts found for this filter"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="py-3 px-3 text-center border">Actions</th>
                      <th className="py-3 px-6 border text-center">Customer</th>
                      <th className="py-3 px-3 border text-center">Products</th>
                      <th className="py-3 px-3 border text-center">Cart Value</th>
                      <th className="py-3 px-3 border text-center">Last Activity</th>
                      <th className="py-3 px-3 border text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map((cart) => (
                      <tr key={cart._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors border">
                        <td className="py-3.5 px-3 text-center border-gray-300 border">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(cart)}
                            className="text-gray-400 hover:text-emerald-700 border"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                        <td className="py-3.5 px-3 border-gray-300 border">
                          <p className="font-medium text-sm text-gray-900">{cart.customer.name}</p>
                          {cart.customer.email && <p className="text-xs text-gray-400">{cart.customer.email}</p>}
                        </td>
                        <td className="py-3.5 px-3 text-xs border-gray-300 border">
                          <Badge variant="outline" className="border-gray-200 text-gray-600">
                            {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-sm text-gray-900 border-gray-300 border">
                          ₹{cart.cartTotal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-gray-500 border-gray-300 border">
                          {formatRelativeTime(cart.lastActivityAt)}
                        </td>
                        <td className="py-3.5 px-3 border-gray-300 border">{statusBadge(cart.derivedStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-gray-200"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let n = i + 1
                      if (totalPages > 5) {
                        if (page <= 3) n = i + 1
                        else if (page >= totalPages - 2) n = totalPages - 4 + i
                        else n = page - 2 + i
                      }
                      return (
                        <Button
                          key={n}
                          variant={n === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(n)}
                          className={n === page ? "bg-emerald-700 hover:bg-emerald-700" : "border-gray-200"}
                        >
                          {n}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="border-gray-200"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Details Modal */}
      {selectedCart && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                  <ShoppingBasket className="w-4 h-4 text-white" />
                </div>
                <DialogTitle>{selectedCart.customer.name}'s cart</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Customer</p>
                  <p className="font-medium text-gray-900">{selectedCart.customer.name}</p>
                  {selectedCart.customer.email && <p className="text-xs text-gray-500">{selectedCart.customer.email}</p>}
                  {selectedCart.customer.phone && <p className="text-xs text-gray-500">{selectedCart.customer.phone}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  {statusBadge(selectedCart.derivedStatus)}
                  <p className="text-xs text-gray-500 mt-1.5">Last activity: {formatRelativeTime(selectedCart.lastActivityAt)}</p>
                  <p className="text-xs text-gray-500">Created: {new Date(selectedCart.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Products ({selectedCart.itemCount})
                </p>
                <div className="space-y-2">
                  {selectedCart.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-xl p-2.5">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                        {item.image && <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.selectedSize?.size && (
                          <p className="text-xs text-gray-400">
                            {item.selectedSize.size}
                            {item.selectedSize.unit}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Qty {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center bg-emerald-50 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-emerald-800">Cart total</span>
                <span className="text-lg font-bold text-emerald-800">₹{selectedCart.cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}
