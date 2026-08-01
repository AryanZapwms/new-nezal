"use client"
// app/admin/hero-products/page.tsx

import { useEffect, useState, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Eye, GripVertical, Crown, RefreshCw, Power, Search, Loader2, Plus, Check } from "lucide-react"
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
import { invalidateHeroProductsCache } from "@/components/hero-products"

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image?: string
  sku?: string
  company?: { name: string; slug: string }
}

interface HeroProductItem {
  _id: string
  productId: Product
  sortOrder: number
  isActive: boolean
}

function SortableRow({
  hero,
  children,
}: {
  hero: HeroProductItem
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: hero._id })

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

export default function AdminHeroProductsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [heroProducts, setHeroProducts] = useState<HeroProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<HeroProductItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  // ── Live server-side product search (fuzzy, via /api/products?search=) ──
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") { router.replace("/auth/login"); return }
    fetchHeroProducts()
  }, [status])

  const fetchHeroProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/hero-products?all=true")
      const data = await res.json()
      setHeroProducts(data.heroProducts || [])
    } catch (e) {
      console.error("Error fetching hero products:", e)
    } finally {
      setLoading(false)
    }
  }

  // Search products server-side — empty query returns a recent/default batch
  const searchProducts = async (query: string) => {
    setSearching(true)
    try {
      const params = new URLSearchParams({
        limit: "20",
        includeInactive: "true",
        sort: "newest",
      })
      if (query.trim()) params.set("search", query.trim())

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data.products) ? data.products : [])
    } catch (e) {
      console.error("Error searching products:", e)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Debounce search as the admin types
  useEffect(() => {
    if (!showSearch) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, showSearch])

  const openSearch = () => {
    setSearchQuery("")
    setShowSearch(true)
    searchProducts("") // load an initial batch immediately
  }

  const isAlreadyHero = (productId: string) =>
    heroProducts.some((h) => h.productId._id === productId)

  // Click a search result → add it immediately, no extra fields needed
  const handleAddProduct = async (product: Product) => {
    if (isAlreadyHero(product._id) || addingId) return
    setAddingId(product._id)
    try {
      const res = await fetch("/api/hero-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to add product")
      }
      await fetchHeroProducts()
      invalidateHeroProductsCache()
    } catch (e) {
      console.error("Error adding hero product:", e)
      alert(e instanceof Error ? e.message : "Failed to add product")
    } finally {
      setAddingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/hero-products/${deleteTarget._id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchHeroProducts()
      invalidateHeroProductsCache()
    } catch (e) {
      console.error("Error deleting hero product:", e)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = async (hero: HeroProductItem) => {
    setTogglingId(hero._id)
    try {
      const res = await fetch(`/api/hero-products/${hero._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !hero.isActive }),
      })
      if (!res.ok) throw new Error("Failed to toggle")
      await fetchHeroProducts()
      invalidateHeroProductsCache()
    } catch (e) {
      console.error("Error toggling hero product:", e)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = heroProducts.findIndex((h) => h._id === active.id)
    const newIndex = heroProducts.findIndex((h) => h._id === over.id)
    const reordered = arrayMove(heroProducts, oldIndex, newIndex)

    setHeroProducts(reordered)
    setSavingOrder(true)

    try {
      const res = await fetch("/api/hero-products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroProductIds: reordered.map((h) => h._id) }),
      })
      if (!res.ok) throw new Error("Failed to save order")
      const data = await res.json()
      setHeroProducts(data.heroProducts)
      invalidateHeroProductsCache()
    } catch (e) {
      console.error("Error saving hero product order:", e)
      fetchHeroProducts()
    } finally {
      setSavingOrder(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading hero products...
        </div>
      </main>
    )
  }

  const activeCount = heroProducts.filter((h) => h.isActive).length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hero Products</h1>
              <p className="text-sm text-gray-500 mt-0.5">Search, select, done — shown using each product's own image & price.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savingOrder && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Saving order...
              </span>
            )}
            <Button onClick={openSearch} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" /> Add products
            </Button>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <p className="text-xs font-medium text-gray-500">Total hero products</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-gray-900">{heroProducts.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="text-xs font-medium text-gray-500">Active</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-700">{activeCount}</p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">All hero products</h2>
            <span className="text-xs text-gray-400">Drag the handle to reorder — first is the main spotlight</span>
          </div>

          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={heroProducts.map((h) => h._id)} strategy={verticalListSortingStrategy}>
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="py-3 pl-6 pr-1 w-10"></th>
                      <th className="py-3 px-3 w-20">Image</th>
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <Crown className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">No hero products yet</p>
                          <p className="text-xs text-gray-400 mt-1 mb-4">Search and select a few standout products to spotlight.</p>
                          <Button onClick={openSearch} className="bg-amber-600 hover:bg-amber-700">
                            <Plus className="w-4 h-4 mr-2" /> Add products
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      heroProducts.map((hero) => (
                        <SortableRow key={hero._id} hero={hero}>
                          <td className="py-3.5 px-3">
                            <div className="w-16 h-11 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                              {hero.productId?.image ? (
                                <Image src={hero.productId.image} alt={hero.productId.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No image</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-medium text-sm text-gray-900 truncate max-w-[200px]">{hero.productId?.name || "—"}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            {hero.productId?.price != null && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-900">
                                  ₹{hero.productId.discountPrice ?? hero.productId.price}
                                </span>
                                {hero.productId.discountPrice && hero.productId.discountPrice < hero.productId.price && (
                                  <span className="text-xs text-gray-400 line-through">₹{hero.productId.price}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              hero.isActive ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${hero.isActive ? "bg-amber-500" : "bg-gray-400"}`} />
                              {hero.isActive ? "Active" : "Draft"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex gap-1.5 justify-end items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(hero)}
                                disabled={togglingId === hero._id}
                                className={`h-8 text-xs ${
                                  hero.isActive
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                <Power className="w-3 h-3 mr-1" />
                                {togglingId === hero._id ? "..." : hero.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              {hero.productId?.company?.slug && (
                                <Link href={`/shop/${hero.productId.company.slug}/product/${hero.productId._id}`} target="_blank">
                                  <Button size="icon" variant="ghost" className="text-gray-400 hover:text-blue-700" title="View product">
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(hero)} className="text-gray-400 hover:text-red-600" title="Remove">
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

      {/* ── Search / add dialog ───────────────────────────── */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-white" />
              </div>
              <DialogTitle>Search & add products</DialogTitle>
            </div>
            <DialogDescription>Click a product to add it. Its own image, name, and price are used automatically.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by product name or SKU... (typo-tolerant)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-10 pr-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            <div className="border border-gray-200 rounded-xl max-h-96 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {searching ? "Searching..." : "No matching products found"}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {searchResults.map((product) => {
                    const added = isAlreadyHero(product._id)
                    const isAdding = addingId === product._id
                    return (
                      <div
                        key={product._id}
                        onClick={() => handleAddProduct(product)}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          added ? "bg-amber-50/60" : "cursor-pointer hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {product.image && (
                            <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate text-sm">{product.name}</h4>
                            <p className="text-xs text-gray-400">
                              {product.sku && `SKU: ${product.sku} · `}₹{product.discountPrice ?? product.price}
                            </p>
                          </div>
                        </div>
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                        ) : added ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 shrink-0">
                            <Check className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0">
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={() => setShowSearch(false)} variant="outline">Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600" />
            </div>
            <DialogTitle>Remove hero product?</DialogTitle>
            <DialogDescription>
              This will remove <strong className="text-gray-800">{deleteTarget?.productId?.name}</strong> from the spotlight. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}