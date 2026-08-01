// app/admin/companies/[id]/shop-by-concern/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, GripVertical, HeartPulse, Plus, Search, Settings, Trash2, RefreshCw, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploadField } from "@/components/admin/image-upload-field"

interface Product {
    _id: string
    name: string
    price?: number
    image?: string
    sku?: string
    slug?: string
}

interface ConcernItem {
    _id: string
    title: string
    image: string
    description?: string
    isActive: boolean
    priority: number
    product: Product | string
}

interface ShopByConcernSettings {
    isVisible: boolean
    limit: number
}

export default function ShopByConcernPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const companyId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined)

    const [items, setItems] = useState<ConcernItem[]>([])
    const [settings, setSettings] = useState<ShopByConcernSettings>({ isVisible: true, limit: 6 })
    const [loading, setLoading] = useState(true)
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)

    const [selectedItem, setSelectedItem] = useState<ConcernItem | null>(null)

    const [searchQuery, setSearchQuery] = useState("")
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

    const [newConcern, setNewConcern] = useState({
        title: "",
        image: "",
        description: "",
        productId: "",
        isActive: true,
    })

    const [tempSettings, setTempSettings] = useState<ShopByConcernSettings>({ isVisible: true, limit: 6 })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }
        if (!companyId) return
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, companyId])

    useEffect(() => {
        const filtered = availableProducts.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setFilteredProducts(filtered)
    }, [searchQuery, availableProducts])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern?all=true`)
            if (!res.ok) throw new Error("Failed to fetch shop by concern")
            const data = await res.json()

            const mappedItems = Array.isArray(data.items)
                ? data.items.map((item: any) => ({
                    _id: item._id,
                    title: item.title,
                    image: item.image,
                    description: item.description,
                    isActive: item.isActive ?? true,
                    priority: item.priority ?? 0,
                    product: item.product,
                }))
                : []

            setItems(mappedItems)
            setSettings(data.settings || { isVisible: true, limit: 6 })
            setTempSettings(data.settings || { isVisible: true, limit: 6 })

            const productsRes = await fetch(`/api/products?company=${companyId}`)
            if (!productsRes.ok) throw new Error("Failed to fetch products")
            const productsData = await productsRes.json()
            const products = Array.isArray(productsData) ? productsData : productsData.products || []
            setAvailableProducts(products)
            setFilteredProducts(products)
        } catch (error) {
            console.error("Error fetching data:", error)
            alert("Failed to load shop by concern data")
        } finally {
            setLoading(false)
        }
    }

    const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items])

    const handleAddConcern = async () => {
        if (!newConcern.title || !newConcern.image || !newConcern.productId) {
            alert("Please fill in title, image, and select a product")
            return
        }
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newConcern.title,
                    image: newConcern.image,
                    description: newConcern.description,
                    productId: newConcern.productId,
                    isActive: newConcern.isActive,
                }),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to add concern")
            }
            await fetchData()
            setShowAddDialog(false)
            setNewConcern({ title: "", image: "", description: "", productId: "", isActive: true })
        } catch (error) {
            console.error("Error adding concern:", error)
            alert(error instanceof Error ? error.message : "Failed to add concern")
        }
    }

    const handleEditConcern = async () => {
        if (!selectedItem) return
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${selectedItem._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: selectedItem.title,
                    image: selectedItem.image,
                    description: selectedItem.description,
                    productId: typeof selectedItem.product === "object" ? (selectedItem.product as Product)._id : selectedItem.product,
                    isActive: selectedItem.isActive,
                }),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to update concern")
            }
            await fetchData()
            setShowEditDialog(false)
            setSelectedItem(null)
        } catch (error) {
            console.error("Error updating concern:", error)
            alert(error instanceof Error ? error.message : "Failed to update concern")
        }
    }

    const handleDeleteConcern = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this concern?")) return
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${itemId}`, { method: "DELETE" })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to delete concern")
            }
            await fetchData()
        } catch (error) {
            console.error("Error deleting concern:", error)
            alert(error instanceof Error ? error.message : "Failed to delete concern")
        }
    }

    const handleUpdateSettings = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: tempSettings.isVisible, limit: tempSettings.limit }),
            })
            if (!res.ok) throw new Error("Failed to update settings")
            setSettings(tempSettings)
            setShowSettingsDialog(false)
        } catch (error) {
            console.error("Error updating settings:", error)
            alert("Failed to update settings")
        }
    }

    const handleToggleVisibility = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !settings.isVisible, limit: settings.limit }),
            })
            if (!res.ok) throw new Error("Failed to update visibility")
            setSettings({ ...settings, isVisible: !settings.isVisible })
        } catch (error) {
            console.error("Error toggling visibility:", error)
            alert("Failed to update visibility")
        }
    }

    const handleDragStart = (itemId: string) => setDraggedItemId(itemId)
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault()

    const handleDrop = async (targetIndex: number) => {
        if (!draggedItemId) return
        const draggedIndex = items.findIndex((item) => item._id === draggedItemId)
        if (draggedIndex === -1 || draggedIndex === targetIndex) return

        const reordered = [...items]
        const [draggedItem] = reordered.splice(draggedIndex, 1)
        reordered.splice(targetIndex, 0, draggedItem)
        setItems(reordered)
        setDraggedItemId(null)

        try {
            const itemIds = reordered.map((item) => item._id)
            const res = await fetch(`/api/companies/${companyId}/shop-by-concern/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemIds }),
            })
            if (!res.ok) throw new Error("Failed to reorder concerns")
        } catch (error) {
            console.error("Error reordering concerns:", error)
            alert("Failed to reorder concerns")
            fetchData()
        }
    }

    const handleOpenEditDialog = (item: ConcernItem) => {
        setSelectedItem(item)
        setShowEditDialog(true)
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading shop by concern...
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* ── Page header ──────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/companies">
                            <Button variant="outline" size="icon" className="border-gray-200 text-gray-500 hover:text-gray-900 shrink-0">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
                                <HeartPulse className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Shop by Concern</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Curate concern-based highlights for this brand</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setTempSettings(settings); setShowSettingsDialog(true) }}
                            className="border-gray-200 text-gray-500 hover:text-gray-900"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-700 hover:bg-emerald-800">
                            <Plus className="w-4 h-4 mr-2" />
                            Add concern
                        </Button>
                    </div>
                </div>

                {/* ── Stats row ────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <p className="text-xs font-medium text-gray-500">Active concerns</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{activeCount}<span className="text-sm font-medium text-gray-400"> / {settings.limit}</span></p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            <p className="text-xs font-medium text-gray-500">Total configured</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{items.length}</p>
                    </div>
                    <button
                        onClick={handleToggleVisibility}
                        className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-gray-300 transition-colors col-span-2 md:col-span-1"
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${settings.isVisible ? "bg-emerald-500" : "bg-gray-400"}`} />
                            <p className="text-xs font-medium text-gray-500">Section status</p>
                        </div>
                        <p className={`text-lg font-bold ${settings.isVisible ? "text-emerald-700" : "text-gray-500"}`}>
                            {settings.isVisible ? "Visible" : "Hidden"}
                        </p>
                    </button>
                </div>

                {/* ── List ─────────────────────────────────────────── */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60 gap-4 flex-wrap">
                        <h2 className="font-semibold text-gray-900">All concerns ({items.length})</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search products"
                                className="pl-9 bg-white"
                            />
                        </div>
                    </div>

                    <div className="p-4">
                        {items.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <HeartPulse className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-700">No concerns configured yet</p>
                                <p className="text-xs text-gray-400 mt-1">Use "Add concern" to create your first entry.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {items.map((item, index) => {
                                    const product = item.product && typeof item.product === "object" ? (item.product as Product) : undefined

                                    return (
                                        <div
                                            key={item._id}
                                            draggable
                                            onDragStart={() => handleDragStart(item._id)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index)}
                                            className={`flex items-start gap-4 rounded-xl border p-3 transition-colors ${
                                                draggedItemId === item._id ? "bg-emerald-50/40 border-emerald-500 border-2" : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex flex-col items-center gap-1 shrink-0 w-6 mt-1">
                                                <GripVertical className="h-4 w-4 text-gray-300" />
                                                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{index + 1}</span>
                                            </div>

                                            <img
                                                src={item.image || "/nezallogo.jpg"}
                                                alt={item.title}
                                                className="h-16 w-24 rounded-lg object-cover border border-gray-200 shrink-0"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{product ? product.name : item.title}</p>
                                                        <p className="text-xs text-gray-400">{product ? (product.sku || "No SKU") : "Unlinked"}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                                                item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                                                            }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                            {item.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                        <Switch
                                                            checked={item.isActive}
                                                            onCheckedChange={async (checked) => {
                                                                const updatedItems = items.map((it) => (it._id === item._id ? { ...it, isActive: checked } : it))
                                                                setItems(updatedItems)
                                                                try {
                                                                    const res = await fetch(`/api/companies/${companyId}/shop-by-concern/${item._id}`, {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ isActive: checked }),
                                                                    })
                                                                    if (!res.ok) throw new Error("Failed to update concern visibility")
                                                                } catch (error) {
                                                                    console.error("Error updating concern visibility:", error)
                                                                    alert("Failed to update concern visibility")
                                                                    fetchData()
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">{item.description || "No description provided."}</p>
                                                <div className="flex gap-1.5 mt-2.5">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(item)} className="border-gray-200 text-gray-600 hover:text-emerald-700 h-7 text-xs">
                                                        <Pencil className="w-3 h-3 mr-1.5" /> Edit
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDeleteConcern(item._id)} className="border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 h-7 text-xs">
                                                        <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Add Concern Dialog ───────────────────────────── */}
                <Dialog open={showAddDialog} onOpenChange={(open) => setShowAddDialog(open)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Plus className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Add concern</DialogTitle>
                            </div>
                            <DialogDescription className="pl-10.5">Create a new concern and associate it with a product.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-2">
                            <div>
                                <Label htmlFor="concern-title" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Title</Label>
                                <Input id="concern-title" value={newConcern.title} onChange={(e) => setNewConcern((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Dry Skin" />
                            </div>

                            <div>
                                <ImageUploadField
                                    label="Image"
                                    value={newConcern.image}
                                    onChange={(image) => setNewConcern((s) => ({ ...s, image }))}
                                    folder="shop-by-concern"
                                    required={true}
                                    placeholder="https://..."
                                />
                            </div>

                            <div>
                                <Label htmlFor="concern-desc" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Description</Label>
                                <Textarea id="concern-desc" value={newConcern.description} onChange={(e) => setNewConcern((s) => ({ ...s, description: e.target.value }))} placeholder="Short description (optional)" rows={3} />
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Associate product</Label>
                                    <span className="text-xs text-gray-400">Select one</span>
                                </div>

                                <div className="mb-2">
                                    <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white" />
                                </div>

                                <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                                    {filteredProducts.length === 0 ? (
                                        <p className="text-sm text-gray-400 p-2">No products found.</p>
                                    ) : (
                                        filteredProducts.map((p) => {
                                            const selected = newConcern.productId === p._id
                                            return (
                                                <div
                                                    key={p._id}
                                                    onClick={() => setNewConcern((s) => ({ ...s, productId: p._id }))}
                                                    className={`flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer mb-1 last:mb-0 transition-colors ${
                                                        selected ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img src={(p as Product).image || "/nezallogo.jpg"} alt={p.name} className="h-9 w-9 object-cover rounded-lg border border-gray-200 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                                            <p className="text-xs text-gray-400">{p.sku}</p>
                                                        </div>
                                                    </div>
                                                    {selected && <span className="text-xs font-semibold text-emerald-700 shrink-0">Selected</span>}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
                                <Switch checked={newConcern.isActive} onCheckedChange={(checked) => setNewConcern((s) => ({ ...s, isActive: checked }))} />
                                <Label className="text-sm font-medium text-gray-800">Active</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleAddConcern}
                                disabled={!newConcern.title || !newConcern.image || !newConcern.productId}
                                className="bg-emerald-700 hover:bg-emerald-800"
                            >
                                Add concern
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Settings Dialog ──────────────────────────────── */}
                <Dialog open={showSettingsDialog} onOpenChange={(open) => setShowSettingsDialog(open)}>
                    <DialogContent className="max-w-lg rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Shop by Concern settings</DialogTitle>
                            </div>
                            <DialogDescription className="pl-10.5">Control visibility and the active concerns limit.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-2">
                            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <Label className="text-sm font-medium text-gray-900">Section visible</Label>
                                <Switch checked={tempSettings.isVisible} onCheckedChange={(checked) => setTempSettings((s) => ({ ...s, isVisible: checked }))} />
                            </div>

                            <div>
                                <Label htmlFor="limit" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Active items limit</Label>
                                <Input
                                    id="limit"
                                    type="number"
                                    value={String(tempSettings.limit)}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value || "0", 10)
                                        setTempSettings((s) => ({ ...s, limit: isNaN(v) ? 0 : v }))
                                    }}
                                />
                                <p className="text-xs text-gray-400 mt-1">How many active concerns can be shown at once.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
                            <Button onClick={handleUpdateSettings} className="bg-emerald-700 hover:bg-emerald-800">Save settings</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Edit Concern Dialog ──────────────────────────── */}
                <Dialog open={showEditDialog} onOpenChange={(open) => setShowEditDialog(open)}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Pencil className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Edit concern</DialogTitle>
                            </div>
                            <DialogDescription className="pl-10.5">Edit existing concern details.</DialogDescription>
                        </DialogHeader>

                        {selectedItem ? (
                            <div className="grid gap-4 py-2">
                                <div>
                                    <Label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Title</Label>
                                    <Input id="edit-title" value={selectedItem.title} onChange={(e) => setSelectedItem((s) => (s ? { ...s, title: e.target.value } : s))} />
                                </div>

                                <div>
                                    <ImageUploadField
                                        label="Image"
                                        value={selectedItem.image}
                                        onChange={(image) => setSelectedItem((s) => (s ? { ...s, image } : s))}
                                        folder="shop-by-concern"
                                        required={true}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit-desc" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Description</Label>
                                    <Textarea id="edit-desc" value={selectedItem.description || ""} onChange={(e) => setSelectedItem((s) => (s ? { ...s, description: e.target.value } : s))} rows={3} />
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">Associate product</Label>
                                    <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                                        {availableProducts.map((p) => {
                                            const currentProductId = typeof selectedItem.product === "object" ? (selectedItem.product as Product)._id : String(selectedItem.product)
                                            const selected = currentProductId === p._id
                                            return (
                                                <div
                                                    key={p._id}
                                                    onClick={() => setSelectedItem((s) => (s ? { ...s, product: p } : s))}
                                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer mb-1 last:mb-0 transition-colors ${
                                                        selected ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <img src={p.image || "/nezallogo.jpg"} alt={p.name} className="h-9 w-9 object-cover rounded-lg border border-gray-200 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                                        <p className="text-xs text-gray-400">{p.sku}</p>
                                                    </div>
                                                    {selected && <span className="text-xs font-semibold text-emerald-700 shrink-0">Selected</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
                                    <Switch checked={selectedItem.isActive} onCheckedChange={(checked) => setSelectedItem((s) => (s ? { ...s, isActive: checked } : s))} />
                                    <Label className="text-sm font-medium text-gray-800">Active</Label>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedItem(null) }}>Cancel</Button>
                                    <Button onClick={handleEditConcern} className="bg-emerald-700 hover:bg-emerald-800">Save changes</Button>
                                </DialogFooter>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No item selected.</p>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </main>
    )
}