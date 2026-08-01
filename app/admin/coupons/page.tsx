"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Ticket, Plus, Trash2, Edit2, RefreshCw, X, Percent, IndianRupee } from "lucide-react"

/* ─── Types ──────────────────────────────────────────────── */

interface Coupon {
  _id: string
  code: string
  discountType: "percentage" | "flat"
  discountValue: number
  maxUses: number
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  minOrderValue: number
  isActive: boolean
  createdAt: string
}

/* ─── Helpers ────────────────────────────────────────────── */

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getStatus(coupon: Coupon): { label: string; color: string; dot: string } {
  if (!coupon.isActive) return { label: "Disabled", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" }
  if (coupon.usedCount >= coupon.maxUses) return { label: "Exhausted", color: "bg-red-50 text-red-600", dot: "bg-red-500" }
  const now = new Date()
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return { label: "Upcoming", color: "bg-blue-50 text-blue-700", dot: "bg-blue-500" }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return { label: "Expired", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" }
  return { label: "Active", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" }
}

const EMPTY_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: "",
  maxUses: "",
  minOrderValue: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
}

/* ─── Coupon Form Modal ──────────────────────────────────── */

function CouponFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Coupon | null
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        discountType: editing.discountType,
        discountValue: String(editing.discountValue),
        maxUses: String(editing.maxUses),
        minOrderValue: String(editing.minOrderValue || ""),
        startsAt: editing.startsAt ? toLocalInputValue(new Date(editing.startsAt)) : "",
        expiresAt: editing.expiresAt ? toLocalInputValue(new Date(editing.expiresAt)) : "",
        isActive: editing.isActive,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError("")
  }, [editing, open])

  const set = (key: keyof typeof EMPTY_FORM, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim()) { setError("Code is required."); return }
    if (!form.discountValue || Number(form.discountValue) <= 0) { setError("Discount value must be greater than 0."); return }
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) { setError("Percentage can't exceed 100."); return }
    if (!form.maxUses || Number(form.maxUses) < 1) { setError("Max uses must be at least 1."); return }
    if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      setError("Expiry must be after start date."); return
    }

    setSubmitting(true); setError("")
    try {
      const url = editing ? `/api/coupons/${editing._id}` : "/api/coupons"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxUses: Number(form.maxUses),
          minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          isActive: form.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <DialogTitle>{editing ? "Edit coupon" : "Create coupon"}</DialogTitle>
          </div>
          <DialogDescription className="pl-10.5">
            {editing ? "Update the coupon details below." : "Fill in the details to create a new coupon code."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Code */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Coupon Code *</label>
            <Input
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="e.g. NEZAL25"
              className="uppercase font-mono"
              disabled={!!editing}  // can't change code after creation
            />
            {editing && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation.</p>}
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Discount Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "percentage", label: "% Off", icon: Percent },
                  { value: "flat", label: "₹ Flat", icon: IndianRupee },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("discountType", value)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-medium transition-all ${
                      form.discountType === value
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Value * {form.discountType === "percentage" ? "(%)" : "(₹)"}
              </label>
              <Input
                type="number"
                min={1}
                max={form.discountType === "percentage" ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
                placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 100"}
              />
            </div>
          </div>

          {/* Max uses + min order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Max Uses *</label>
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Min Order Value (₹)</label>
              <Input
                type="number"
                min={0}
                value={form.minOrderValue}
                onChange={(e) => set("minOrderValue", e.target.value)}
                placeholder="e.g. 499 (optional)"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Starts At (optional)</label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Expires At (optional)</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-emerald-700"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-800">Active</label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800">
              {submitting ? "Saving..." : editing ? "Update coupon" : "Create coupon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function AdminCouponsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login")
    if (status === "authenticated") fetchCoupons()
  }, [status])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/coupons")
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (e) {
      console.error("Error fetching coupons:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/coupons/${deleteTarget._id}`, { method: "DELETE" })
      await fetchCoupons()
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (c: Coupon) => { setEditing(c); setFormOpen(true) }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading coupons...
        </div>
      </main>
    )
  }

  const activeCount = coupons.filter((c) => getStatus(c).label === "Active").length
  const exhaustedCount = coupons.filter((c) => getStatus(c).label === "Exhausted").length
  const disabledCount = coupons.filter((c) => !c.isActive).length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes for checkout.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCoupons}
              className="border-gray-200 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            <Button onClick={openCreate} className="bg-emerald-700 hover:bg-emerald-800">
              <Plus className="w-4 h-4 mr-2" /> Create coupon
            </Button>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total coupons", value: coupons.length, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Active", value: activeCount, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Exhausted", value: exhaustedCount, color: "text-red-600", dot: "bg-red-500" },
            { label: "Disabled", value: disabledCount, color: "text-gray-500", dot: "bg-gray-400" },
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
            <h2 className="font-semibold text-gray-900">All coupons</h2>
            <span className="text-xs text-gray-400">{coupons.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-3 px-6">Code</th>
                  <th className="py-3 px-3">Discount</th>
                  <th className="py-3 px-3">Uses</th>
                  <th className="py-3 px-3">Min order</th>
                  <th className="py-3 px-3">Validity</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Ticket className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No coupons yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first coupon code to get started.</p>
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => {
                    const st = getStatus(coupon)
                    return (
                      <tr key={coupon._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">

                        {/* Code */}
                        <td className="py-3.5 px-6">
                          <span className="font-mono font-bold text-sm bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
                            {coupon.code}
                          </span>
                        </td>

                        {/* Discount */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-sm text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% off`
                              : `₹${coupon.discountValue} off`}
                          </span>
                        </td>

                        {/* Uses */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-16 shrink-0">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%`,
                                  backgroundColor: coupon.usedCount >= coupon.maxUses ? "#ef4444" : "#1e6636",
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                              {coupon.usedCount} / {coupon.maxUses}
                            </span>
                          </div>
                        </td>

                        {/* Min order */}
                        <td className="py-3.5 px-3 text-sm text-gray-500">
                          {coupon.minOrderValue > 0 ? `₹${coupon.minOrderValue}` : "—"}
                        </td>

                        {/* Validity */}
                        <td className="py-3.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {coupon.startsAt || coupon.expiresAt ? (
                            <>
                              {coupon.startsAt
                                ? new Date(coupon.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                                : "Always"}
                              {" → "}
                              {coupon.expiresAt
                                ? new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                                : "No expiry"}
                            </>
                          ) : (
                            "No expiry"
                          )}
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
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(coupon)} className="text-gray-400 hover:text-emerald-700" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(coupon)} className="text-gray-400 hover:text-red-600" title="Delete">
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

      {/* Create / Edit modal */}
      <CouponFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchCoupons}
        editing={editing}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600" />
            </div>
            <DialogTitle>Delete coupon?</DialogTitle>
            <DialogDescription>
              This will permanently delete coupon{" "}
              <strong className="font-mono text-gray-800">{deleteTarget?.code}</strong>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}