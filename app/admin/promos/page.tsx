"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Megaphone, Plus, Pencil, Trash2, X, Link2, Palette, ArrowUpDown, Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/* ─── Types ──────────────────────────────────────────────── */

interface Promo {
  _id: string
  title: string
  message: string
  link?: string
  linkText?: string
  backgroundColor: string
  textColor: string
  isActive: boolean
  priority: number
  createdAt: string
}

const EMPTY_FORM = {
  title: "",
  message: "",
  link: "",
  linkText: "",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  isActive: true,
  priority: 0,
}

export default function PromosPage() {
  const { toast } = useToast()
  const [promos, setPromos] = useState<Promo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    fetchPromos()
  }, [])

  const fetchPromos = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/promos")
      if (res.ok) {
        const data = await res.json()
        setPromos(data)
      } else {
        toast({ title: "Failed to load promos", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error fetching promos:", error)
      toast({ title: "Failed to load promos", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.link && !formData.link.startsWith("/") && !formData.link.startsWith("http")) {
      toast({
        title: "Invalid link",
        description: "Link must start with / (internal page) or http(s):// (external URL)",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingPromo ? `/api/promos/${editingPromo._id}` : "/api/promos"
      const method = editingPromo ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast({ title: editingPromo ? "Promo updated" : "Promo created" })
        resetForm()
        fetchPromos()
      } else {
        const error = await res.json()
        toast({ title: "Error", description: error.error || "Failed to save promo", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving promo:", error)
      toast({ title: "Error", description: "Failed to save promo", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo)
    setFormData({
      title: promo.title,
      message: promo.message,
      link: promo.link || "",
      linkText: promo.linkText || "",
      backgroundColor: promo.backgroundColor,
      textColor: promo.textColor,
      isActive: promo.isActive,
      priority: promo.priority,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/promos/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Promo deleted" })
        fetchPromos()
      } else {
        toast({ title: "Failed to delete promo", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting promo:", error)
      toast({ title: "Failed to delete promo", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setEditingPromo(null)
    setShowForm(false)
  }

  const activeCount = promos.filter((p) => p.isActive).length
  const sortedPromos = [...promos].sort((a, b) => b.priority - a.priority)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading promos...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Promo Bar</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage the promotional banners shown site-wide.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {promos.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-gray-800">{activeCount}</span> active
                <span className="text-gray-300">·</span>
                <span className="font-medium text-gray-800">{promos.length}</span> total
              </div>
            )}
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Add promo
              </Button>
            )}
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                  {editingPromo ? <Pencil className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                </div>
                <h2 className="font-semibold text-gray-900">
                  {editingPromo ? "Edit promo" : "Add a new promo"}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-500 hover:text-gray-900">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                    Title <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Monsoon Sale"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                    Priority
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">Higher numbers show first.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Message *
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={3}
                  placeholder="e.g. Free shipping on all orders above ₹499"
                />
              </div>

              {/* Link */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Link (optional)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">URL</label>
                    <Input
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="/shop/nezal-herbocare or https://..."
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Link text</label>
                    <Input
                      value={formData.linkText}
                      onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                      placeholder="Shop now"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Palette className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Colors
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Background</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="w-11 h-10 p-1 bg-white shrink-0"
                      />
                      <Input
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 bg-white font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Text</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="w-11 h-10 p-1 bg-white shrink-0"
                      />
                      <Input
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1 bg-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <div>
                    <Label className="text-sm font-medium text-gray-900">Active</Label>
                    <p className="text-xs text-gray-400">Visible across the site</p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
                  Preview
                </label>
                <div
                  className="rounded-xl px-4 py-3.5 text-center text-sm"
                  style={{ backgroundColor: formData.backgroundColor, color: formData.textColor }}
                >
                  {formData.title && <p className="">{formData.title}</p>}
                  <p>{formData.message || "Your promo message will appear here"}</p>
                  {formData.link && formData.linkText && (
                    <p className="mt-1 underline underline-offset-2 cursor-pointer">{formData.linkText}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : editingPromo ? (
                    "Update promo"
                  ) : (
                    "Create promo"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Promo list ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">All promos</h2>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <ArrowUpDown className="w-3 h-3" /> Sorted by priority
            </span>
          </div>

          {sortedPromos.length === 0 ? (
            <div className="text-center bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No promos yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first promo bar using the button above.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedPromos.map((promo) => (
                <div
                  key={promo._id}
                  className={`group flex items-center gap-4 bg-white border rounded-xl p-3 transition-all ${
                    promo.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50/60"
                  }`}
                >
                  {/* Swatch preview */}
                  <div
                    className={`w-28 h-[70px] rounded-lg border border-gray-200 shrink-0 flex flex-col items-center justify-center px-2 text-center overflow-hidden ${
                      !promo.isActive ? "opacity-60" : ""
                    }`}
                    style={{ backgroundColor: promo.backgroundColor, color: promo.textColor }}
                  >
                    {promo.title && (
                      <p className="text-[10px] font-semibold truncate w-full leading-tight">{promo.title}</p>
                    )}
                    <p className="text-[10px] line-clamp-2 leading-tight mt-0.5">{promo.message}</p>
                  </div>

                  {/* Text info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {promo.title || <span className="text-gray-400 italic">Untitled promo</span>}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        promo.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${promo.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {promo.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        Priority {promo.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">{promo.message}</p>
                    {promo.link && promo.linkText && (
                      <p className="text-xs text-blue-700 truncate mt-1 flex items-center gap-1">
                        <Link2 className="w-3 h-3 shrink-0" /> {promo.linkText} → {promo.link}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      Created {new Date(promo.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)} className="text-gray-400 hover:text-emerald-700" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(promo._id)} className="text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}