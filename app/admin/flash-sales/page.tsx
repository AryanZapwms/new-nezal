"use client"
// app/admin/flash-sales/page.tsx

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, Plus, Zap, RefreshCw, Power } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FlashSale {
  _id: string
  name: string
  discountPercent: number
  startsAt: string
  endsAt: string
  products: { _id: string; name: string }[]
  isActive: boolean
}

function getStatus(sale: FlashSale): { label: string; color: string; dot: string } {
  const now = new Date()
  const start = new Date(sale.startsAt)
  const end = new Date(sale.endsAt)
  if (!sale.isActive) return { label: "Disabled", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" }
  if (now < start) return { label: "Upcoming", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" }
  if (now > end) return { label: "Ended", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" }
  return { label: "Live now", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" }
}

export default function AdminFlashSalesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<FlashSale | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") { router.replace("/auth/login"); return }
    fetchSales()
  }, [status])

  const fetchSales = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/flash-sales?all=true")
      const data = await res.json()
      setSales(data.sales || [])
    } catch (e) {
      console.error("Error fetching flash sales:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (sale: FlashSale) => {
    setTogglingId(sale._id)
    try {
      const res = await fetch(`/api/flash-sales/${sale._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sale.isActive }),
      })
      if (!res.ok) throw new Error("Failed to toggle")
      await fetchSales()
    } catch (e) {
      console.error("Error toggling flash sale:", e)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/flash-sales/${deleteTarget._id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchSales()
    } catch (e) {
      console.error("Error deleting flash sale:", e)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading flash sales...
        </div>
      </main>
    )
  }

  const liveCount = sales.filter((s) => getStatus(s).label === "Live now").length
  const upcomingCount = sales.filter((s) => getStatus(s).label === "Upcoming").length
  const endedCount = sales.filter((s) => getStatus(s).label === "Ended").length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Flash Sales</h1>
              <p className="text-sm text-gray-500 mt-0.5">Time-boxed discounts across selected products.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSales}
              className="border-gray-200 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            <Link href="/admin/flash-sales/add">
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Create flash sale
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total sales", value: sales.length, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Live now", value: liveCount, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Upcoming", value: upcomingCount, color: "text-blue-700", dot: "bg-blue-500" },
            { label: "Ended", value: endedCount, color: "text-gray-500", dot: "bg-gray-400" },
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

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">All flash sales</h2>
            <span className="text-xs text-gray-400">{sales.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-3">Discount</th>
                  <th className="py-3 px-3">Products</th>
                  <th className="py-3 px-3">Window</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No flash sales yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first flash sale to get started.</p>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => {
                    const st = getStatus(sale)
                    return (
                      <tr key={sale._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">

                        {/* Name */}
                        <td className="py-3.5 px-6">
                          <p className="font-medium text-sm text-gray-900">{sale.name}</p>
                        </td>

                        {/* Discount */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-sm text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            {sale.discountPercent}% off
                          </span>
                        </td>

                        {/* Products */}
                        <td className="py-3.5 px-3 text-sm text-gray-500">
                          {sale.products.length} product{sale.products.length !== 1 ? "s" : ""}
                        </td>

                        {/* Window */}
                        <td className="py-3.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(sale.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                          {" → "}
                          {new Date(sale.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-6">
                          <div className="flex gap-1.5 justify-end items-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActive(sale)}
                              disabled={togglingId === sale._id}
                              className={`h-8 text-xs ${
                                sale.isActive
                                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="w-3 h-3 mr-1" />
                              {togglingId === sale._id ? "..." : sale.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Link href={`/admin/flash-sales/edit/${sale._id}`}>
                              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-emerald-700" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(sale)} className="text-gray-400 hover:text-red-600" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600" />
            </div>
            <DialogTitle>Delete flash sale?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong className="text-gray-800">{deleteTarget?.name}</strong>.
              Products will return to their normal price immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}