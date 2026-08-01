"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Star, Check, X, Trash2, MessageCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "pending" | "approved" | "rejected" | "all"

interface Review {
  _id: string
  productName: string
  productImage: string
  company: string
  userName: string
  userEmail: string
  rating: number
  comment: string
  status: Status
  reply?: { message: string }
  createdAt: string
  product?: { name: string; image: string }
}

const STATUS_META: Record<string, { color: string; dot: string }> = {
  pending: { color: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  approved: { color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { color: "bg-red-50 text-red-600", dot: "bg-red-500" },
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Status>("pending")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [acting, setActing] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews?status=${activeTab}&page=${page}`)
      const data = await res.json()
      setReviews(data.reviews || [])
      setTotalPages(data.totalPages || 1)
    } finally { setLoading(false) }
  }, [activeTab, page])

  // Fetch counts for tab badges
  const fetchCounts = async () => {
    const [p, a, r] = await Promise.all([
      fetch("/api/admin/reviews?status=pending&limit=1").then(r => r.json()),
      fetch("/api/admin/reviews?status=approved&limit=1").then(r => r.json()),
      fetch("/api/admin/reviews?status=rejected&limit=1").then(r => r.json()),
    ])
    setCounts({ pending: p.total || 0, approved: a.total || 0, rejected: r.total || 0 })
  }

  useEffect(() => { fetchReviews(); fetchCounts() }, [fetchReviews])
  useEffect(() => { setPage(1) }, [activeTab])

  const act = async (id: string, action: "approve" | "reject") => {
    setActing(id)
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setActing(null)
    fetchReviews()
    fetchCounts()
  }

  const del = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return
    setActing(id)
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
    setActing(null)
    fetchReviews()
    fetchCounts()
  }

  const tabs: { key: Status; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ]

  const totalCount = counts.pending + counts.approved + counts.rejected

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
              <p className="text-sm text-gray-500 mt-0.5">Approve, reject, or remove customer product reviews.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { fetchReviews(); fetchCounts() }}
            className="border-gray-200 text-gray-500 hover:text-gray-900"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </Button>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total reviews", value: totalCount, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Pending", value: counts.pending, color: "text-amber-700", dot: "bg-amber-500" },
            { label: "Approved", value: counts.approved, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Rejected", value: counts.rejected, color: "text-red-600", dot: "bg-red-500" },
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

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            const meta = tab.key !== "all" ? STATUS_META[tab.key] : null
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {meta && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    active ? "bg-white/70 text-emerald-800" : meta.color
                  }`}>
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Reviews list ─────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No {activeTab === "all" ? "" : activeTab} reviews</p>
            <p className="text-xs text-gray-400 mt-1">Reviews matching this filter will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reviews.map((review) => {
              const st = STATUS_META[review.status] || STATUS_META.pending
              return (
                <div key={review._id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 items-start"
                >
                  {/* Product image */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    <Image
                      src={review.product?.image || "/placeholder.jpg"}
                      alt={review.product?.name || "Product"}
                      fill className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{review.product?.name}</p>
                        <p className="text-xs text-gray-400">{review.userName} · {review.userEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Stars rating={review.rating} />
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {review.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm italic text-gray-700 mt-2">
                      "{review.comment}"
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row gap-1.5 flex-shrink-0">
                    {review.status !== "approved" && (
                      <button onClick={() => act(review._id, "approve")}
                        disabled={acting === review._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Check size={12} /> Approve
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button onClick={() => act(review._id, "reject")}
                        disabled={acting === review._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <X size={12} /> Reject
                      </button>
                    )}
                    <button onClick={() => del(review._id)}
                      disabled={acting === review._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium border-2 transition-all ${
                  page === p
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}