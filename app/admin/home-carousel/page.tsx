"use client"
// app/admin/home-carousel/page.tsx

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import {
  Loader2, Trash2, ArrowUp, ArrowDown, Pencil, X,
  ImageIcon, Link2, Package, LayoutGrid, ExternalLink, GripVertical, Plus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Banner {
  _id: string
  url: string
  title?: string
  description?: string
  linkType: "product" | "collection" | "custom" | "none"
  link?: string
  linkLabel?: string
  order: number
  isActive: boolean
}

interface ProductResult {
  _id: string
  name: string
  slug: string
  image?: string
  company?: { _id: string; name: string; slug: string }
}

interface Collection {
  _id: string
  name: string
  slug: string
}

const emptyForm = {
  url: "",
  title: "",
  description: "",
  linkType: "none" as Banner["linkType"],
  link: "",
  linkLabel: "",
  isActive: true,
}

const LINK_TYPE_META: Record<Banner["linkType"], { label: string; icon: typeof Link2; color: string }> = {
  none:       { label: "No link",    icon: X,          color: "text-gray-400 bg-gray-100" },
  product:    { label: "Product",    icon: Package,     color: "text-emerald-700 bg-emerald-50" },
  collection: { label: "Collection", icon: LayoutGrid,  color: "text-blue-700 bg-blue-50" },
  custom:     { label: "Custom URL", icon: ExternalLink, color: "text-amber-700 bg-amber-50" },
}

export default function HomeCarouselAdminPage() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Product picker state
  const [productQuery, setProductQuery] = useState("")
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)

  // Collection picker state
  const [collections, setCollections] = useState<Collection[]>([])

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/home-carousel")
      const data = await res.json()
      setBanners(Array.isArray(data) ? data.sort((a: Banner, b: Banner) => a.order - b.order) : [])
    } catch (err) {
      toast({ title: "Failed to load banners", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  useEffect(() => {
    if (form.linkType !== "collection") return
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => setCollections(Array.isArray(data) ? data : data.collections || []))
      .catch(() => setCollections([]))
  }, [form.linkType])

  // Debounced product search
  useEffect(() => {
    if (form.linkType !== "product") return
    const handle = setTimeout(async () => {
      setSearchingProducts(true)
      try {
        const res = await fetch(`/api/admin/home-carousel/search-products?q=${encodeURIComponent(productQuery)}`)
        const data = await res.json()
        setProductResults(Array.isArray(data) ? data : [])
      } catch {
        setProductResults([])
      } finally {
        setSearchingProducts(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [productQuery, form.linkType])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setProductQuery("")
    setProductResults([])
  }

  const startEdit = (banner: Banner) => {
    setEditingId(banner._id)
    setForm({
      url: banner.url,
      title: banner.title || "",
      description: banner.description || "",
      linkType: banner.linkType || "none",
      link: banner.link || "",
      linkLabel: banner.linkLabel || "",
      isActive: banner.isActive,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSelectProduct = (product: ProductResult) => {
    const companySlug = product.company?.slug || "nezal"
    setForm((f) => ({
      ...f,
      link: `/shop/${companySlug}/product/${product._id}`,
      linkLabel: `Product: ${product.name}`,
    }))
    setProductResults([])
    setProductQuery(product.name)
  }

  const handleSelectCollection = (slug: string) => {
    const collection = collections.find((c) => c.slug === slug)
    setForm((f) => ({
      ...f,
      link: `/collections/${slug}`,
      linkLabel: collection ? `Collection: ${collection.name}` : `Collection: ${slug}`,
    }))
  }

  const handleSubmit = async () => {
    if (!form.url) {
      toast({ title: "An image is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        url: form.url,
        title: form.title,
        description: form.description,
        linkType: form.linkType,
        link: form.linkType === "none" ? "" : form.link,
        linkLabel: form.linkType === "none" ? "" : form.linkLabel,
        isActive: form.isActive,
      }

      const res = await fetch(
        editingId ? `/api/home-carousel/${editingId}` : "/api/home-carousel",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Save failed")
      }

      toast({ title: editingId ? "Banner updated" : "Banner added" })
      resetForm()
      fetchBanners()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/home-carousel/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Banner deleted" })
      fetchBanners()
    } catch {
      toast({ title: "Failed to delete banner", variant: "destructive" })
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      await fetch(`/api/home-carousel/${banner._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      })
      fetchBanners()
    } catch {
      toast({ title: "Failed to update banner", variant: "destructive" })
    }
  }

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= banners.length) return

    const reordered = [...banners]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setBanners(reordered)

    try {
      await fetch("/api/home-carousel/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: reordered.map((b, i) => ({ id: b._id, order: i })),
        }),
      })
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" })
      fetchBanners()
    }
  }

  const activeCount = banners.filter((b) => b.isActive).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Home Carousel</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Manage the hero banners shown at the top of the homepage. Each banner can link to a
              product, a collection, a custom URL, or nothing at all.
            </p>
          </div>
          {!loading && banners.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-full px-4 py-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-gray-800">{activeCount}</span> active
              <span className="text-gray-300">·</span>
              <span className="font-medium text-gray-800">{banners.length}</span> total
            </div>
          )}
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                {editingId ? <Pencil className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
              </div>
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Edit banner" : "Add a new banner"}
              </h2>
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-500 hover:text-gray-900">
                <X className="w-4 h-4 mr-1" /> Cancel edit
              </Button>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
                Banner image
              </Label>
              <ImageUploadField
                label=""
                value={form.url}
                onChange={(url) => setForm((f) => ({ ...f, url }))}
                folder="carousel"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Title <span className="font-normal normal-case text-gray-400">(optional)</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monsoon Skincare Sale"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Description <span className="font-normal normal-case text-gray-400">(optional)</span>
                </Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Up to 30% off"
                />
              </div>
            </div>

            {/* Link type selector — segmented buttons instead of a plain dropdown */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
                Link this banner to
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(LINK_TYPE_META) as Banner["linkType"][]).map((type) => {
                  const meta = LINK_TYPE_META[type]
                  const Icon = meta.icon
                  const active = form.linkType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, linkType: type, link: "", linkLabel: "" }))}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {form.linkType === "product" && (
              <div className="relative bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Search products
                </Label>
                <div className="relative">
                  <Input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Type a product name..."
                    className="bg-white"
                  />
                  {searchingProducts && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
                {productResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto bg-white shadow-md">
                    {productResults.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center gap-3 text-sm border-b border-gray-100 last:border-0 transition-colors"
                      >
                        {p.image ? (
                          <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.company?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {form.linkLabel && (
                  <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selected: {form.linkLabel}
                  </p>
                )}
              </div>
            )}

            {form.linkType === "collection" && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Select collection
                </Label>
                <Select onValueChange={handleSelectCollection}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c._id} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.linkLabel && (
                  <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selected: {form.linkLabel}
                  </p>
                )}
              </div>
            )}

            {form.linkType === "custom" && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Custom URL
                </Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value, linkLabel: e.target.value }))}
                  placeholder="/shop or https://..."
                  className="bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 pt-5">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <div>
                  <Label className="text-sm font-medium text-gray-900">Active</Label>
                  <p className="text-xs text-gray-400">Visible on the homepage carousel</p>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : editingId ? (
                  "Update banner"
                ) : (
                  "Add banner"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Banner list ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Current banners</h2>
            <span className="text-xs text-gray-400">Reorder with the arrows — order shown here matches the live homepage</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl py-16">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No banners yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first banner using the form above.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {banners.map((banner, idx) => {
                const meta = LINK_TYPE_META[banner.linkType] || LINK_TYPE_META.none
                const Icon = meta.icon
                return (
                  <div
                    key={banner._id}
                    className={`group flex items-center gap-4 bg-white border rounded-xl p-3 transition-all ${
                      banner.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50/60"
                    }`}
                  >
                    {/* Order badge + drag affordance */}
                    <div className="flex flex-col items-center gap-1 shrink-0 w-6">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{idx + 1}</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative shrink-0">
                      <img
                        src={banner.url}
                        alt=""
                        className={`w-28 h-[70px] object-cover rounded-lg border border-gray-200 ${!banner.isActive ? "grayscale opacity-60" : ""}`}
                      />
                      {!banner.isActive && (
                        <span className="absolute -top-1.5 -right-1.5 text-[10px] font-semibold bg-gray-700 text-white px-1.5 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>

                    {/* Text info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {banner.title || <span className="text-gray-400 italic">Untitled banner</span>}
                      </p>
                      {banner.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{banner.description}</p>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        {banner.linkType === "none" ? "No link" : (banner.linkLabel || banner.link)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => moveBanner(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-900">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => moveBanner(idx, 1)} disabled={idx === banners.length - 1} className="text-gray-400 hover:text-gray-900">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <Switch checked={banner.isActive} onCheckedChange={() => handleToggleActive(banner)} />
                      <Button variant="ghost" size="icon" onClick={() => startEdit(banner)} className="text-gray-400 hover:text-emerald-700">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(banner._id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}