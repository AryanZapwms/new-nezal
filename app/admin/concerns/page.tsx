"use client"
// app/admin/concerns/page.tsx

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Trash2, Edit2, Eye, Plus, GripVertical, Sparkles, RefreshCw, Power } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Concern {
  _id: string
  label: string
  slug: string
  heroImage: string
  sortOrder: number
  isActive: boolean
}

function SortableRow({
  concern,
  children,
}: {
  concern: Concern
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: concern._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "rgb(249 250 251)" : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      <td className="py-3.5 pl-6 pr-1 w-10 text-gray-300 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </td>
      {children}
    </tr>
  )
}

export default function AdminConcernsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Concern | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") { router.replace("/auth/login"); return }
    fetchConcerns()
  }, [status])

  const fetchConcerns = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/concerns?all=true")
      const data = await res.json()
      setConcerns(data.concerns || [])
    } catch (e) {
      console.error("Error fetching concerns:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/concerns/${deleteTarget.slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchConcerns()
    } catch (e) {
      console.error("Error deleting concern:", e)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = async (concern: Concern) => {
    setTogglingId(concern._id)
    try {
      const res = await fetch(`/api/concerns/${concern.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !concern.isActive }),
      })
      if (!res.ok) throw new Error("Failed to toggle")
      await fetchConcerns()
    } catch (e) {
      console.error("Error toggling concern:", e)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = concerns.findIndex((c) => c._id === active.id)
    const newIndex = concerns.findIndex((c) => c._id === over.id)
    const reordered = arrayMove(concerns, oldIndex, newIndex)

    // Optimistic update so the UI feels instant
    setConcerns(reordered)
    setSavingOrder(true)

    try {
      const res = await fetch("/api/concerns/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernIds: reordered.map((c) => c._id) }),
      })
      if (!res.ok) throw new Error("Failed to save order")
      const data = await res.json()
      setConcerns(data.concerns)
    } catch (e) {
      console.error("Error saving concern order:", e)
      // Roll back on failure
      fetchConcerns()
    } finally {
      setSavingOrder(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading concerns...
        </div>
      </main>
    )
  }

  const activeCount = concerns.filter((c) => c.isActive).length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Concerns</h1>
              <p className="text-sm text-gray-500 mt-0.5">Shop-by-concern landing pages, in the order they appear.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savingOrder && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Saving order...
              </span>
            )}
            <Link href="/admin/concerns/add">
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Add concern
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <p className="text-xs font-medium text-gray-500">Total concerns</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-gray-900">{concerns.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-gray-500">Active</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">{activeCount}</p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">All concerns</h2>
            <span className="text-xs text-gray-400">Drag the handle to reorder</span>
          </div>

          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={concerns.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="py-3 pl-6 pr-1 w-10"></th>
                      <th className="py-3 px-3 w-20">Image</th>
                      <th className="py-3 px-3">Label</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concerns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <Sparkles className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">No concerns yet</p>
                          <p className="text-xs text-gray-400 mt-1">Create your first concern page to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      concerns.map((concern) => (
                        <SortableRow key={concern._id} concern={concern}>
                          <td className="py-3.5 px-3">
                            <div className="w-16 h-11 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                              {concern.heroImage ? (
                                <Image src={concern.heroImage} alt={concern.label} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No image</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-medium text-sm text-gray-900">{concern.label}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              concern.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${concern.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                              {concern.isActive ? "Active" : "Draft"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex gap-1.5 justify-end items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(concern)}
                                disabled={togglingId === concern._id}
                                className={`h-8 text-xs ${
                                  concern.isActive
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                <Power className="w-3 h-3 mr-1" />
                                {togglingId === concern._id ? "..." : concern.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Link href={`/concerns/${concern.slug}`} target="_blank">
                                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-blue-700" title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                              <Link href={`/admin/concerns/edit/${concern.slug}`}>
                                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-emerald-700" title="Edit">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(concern)} className="text-gray-400 hover:text-red-600" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </SortableRow>
                      ))
                    )}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
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
            <DialogTitle>Delete concern?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong className="text-gray-800">{deleteTarget?.label}</strong>. This cannot be undone.
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