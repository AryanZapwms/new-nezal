"use client"
// app/admin/collections/page.tsx

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Boxes, Plus, Pencil, Trash2, ExternalLink, GripVertical, Leaf, RefreshCw,
} from "lucide-react"

interface CollectionRow {
  _id: string
  name: string
  slug: string
  tagline?: string
  heroImage?: string
  navCategory: string
  subCategory: string
  sortOrder: number
  isActive: boolean
}

const NAV_CATEGORY_LABELS: Record<string, string> = {
  "face-care": "Face Care",
  "body-care": "Body Care",
  "hair-care": "Hair Care",
  "gift-kits": "Gift Kits",
}

const NAV_CATEGORY_ORDER = ["face-care", "body-care", "hair-care", "gift-kits"]

export default function AdminCollectionsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dragSlug, setDragSlug] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollectionRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login")
    if (status === "authenticated") fetchCollections()
  }, [status])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/collections")
      const data = await res.json()
      setCollections(data.collections || [])
    } catch (e) {
      console.error("Error fetching collections:", e)
    } finally {
      setLoading(false)
    }
  }

  const grouped = NAV_CATEGORY_ORDER.reduce<Record<string, CollectionRow[]>>((acc, cat) => {
    acc[cat] = collections.filter((c) => c.navCategory === cat).sort((a, b) => a.sortOrder - b.sortOrder)
    return acc
  }, {})

  const toggleActive = async (row: CollectionRow) => {
    setCollections((prev) => prev.map((c) => c.slug === row.slug ? { ...c, isActive: !c.isActive } : c))
    try {
      const res = await fetch(`/api/admin/collections/${row.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      })
      if (!res.ok) throw new Error()
    } catch {
      fetchCollections()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/collections/${deleteTarget.slug}`, { method: "DELETE" })
      setCollections((prev) => prev.filter((c) => c.slug !== deleteTarget.slug))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ── Drag reorder (scoped within a navCategory group) ──
  const handleDrop = async (cat: string, targetSlug: string) => {
    if (!dragSlug || dragSlug === targetSlug) return

    const group = [...grouped[cat]]
    const fromIdx = group.findIndex((c) => c.slug === dragSlug)
    const toIdx = group.findIndex((c) => c.slug === targetSlug)
    if (fromIdx === -1 || toIdx === -1) return

    const [moved] = group.splice(fromIdx, 1)
    group.splice(toIdx, 0, moved)
    const reordered = group.map((c, i) => ({ ...c, sortOrder: i }))

    setCollections((prev) => {
      const others = prev.filter((c) => c.navCategory !== cat)
      return [...others, ...reordered]
    })
    setDragSlug(null)

    try {
      await fetch("/api/admin/collections/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered.map((c) => ({ slug: c.slug, sortOrder: c.sortOrder })) }),
      })
    } catch {
      fetchCollections()
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading collections...
        </div>
      </main>
    )
  }

  const activeCount = collections.filter((c) => c.isActive).length
  const inactiveCount = collections.length - activeCount
  const categoryCount = NAV_CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
              <p className="text-sm text-gray-500 mt-0.5">Curate and manage the product collections shown across the site.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCollections}
              className="border-gray-200 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            <Link href="/admin/collections/add">
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Add Collection
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total collections", value: collections.length, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Active", value: activeCount, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Inactive", value: inactiveCount, color: "text-gray-500", dot: "bg-gray-400" },
            { label: "Categories", value: categoryCount, color: "text-amber-700", dot: "bg-amber-500" },
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

        {/* ── Grouped sections ─────────────────────────────── */}
        {collections.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Boxes className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No collections yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first collection to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {NAV_CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
              <div key={cat} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                  <h2 className="font-semibold text-gray-900">{NAV_CATEGORY_LABELS[cat]}</h2>
                  <span className="text-xs text-gray-400">{grouped[cat].length} collection{grouped[cat].length !== 1 ? "s" : ""}</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {grouped[cat].map((row) => (
                    <div
                      key={row.slug}
                      draggable
                      onDragStart={() => setDragSlug(row.slug)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(cat, row.slug)}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

                      <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {row.heroImage ? (
                          <Image src={row.heroImage} alt={row.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Leaf className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                        <p className="text-xs text-gray-400 truncate">/{row.slug} · {row.subCategory}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleActive(row)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                          row.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {row.isActive ? "Active" : "Inactive"}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`/collections/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview on site"
                        >
                          <Button size="icon" variant="ghost" className="text-gray-400 hover:text-gray-900 h-8 w-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>

                       <Link href={`/admin/collections/${row.slug}/products`} title="Manage products">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-amber-700 gap-1.5 h-8 px-2.5 border"
                        >
                            <Boxes className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Manage Products</span>
                        </Button>
                        </Link>

                      

                        <Link href={`/admin/collections/edit/${row.slug}`} title="Edit">
                          <Button size="icon" variant="ghost" className="text-gray-400 hover:text-emerald-700 h-8 w-8">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(row)}
                          className="text-gray-400 hover:text-red-600 h-8 w-8"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ─────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600" />
            </div>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong className="font-semibold text-gray-800">{deleteTarget?.name}</strong>.
              Products currently in this collection won't be deleted, but will no longer appear on its page.
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