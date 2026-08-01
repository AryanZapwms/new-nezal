// app/admin/companies/[id]/new-arrivals/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import {
    ArrowLeft, Plus, Trash2, GripVertical, Search, Settings, Edit,
    ArrowRight, Sparkles, RefreshCw, Eye, EyeOff,
} from "lucide-react"

interface Product {
    _id: string
    name: string
    price: number
    image?: string
    sku?: string
    company: { name: string }
}

interface NewArrival {
    _id: string
    productId: Product
    title: string
    image: string
    description?: string
    position: number
    addedAt: string
    originalProductId?: string
}

interface NewArrivalsSettings {
    isVisible: boolean
    limit: number
}

export default function NewArrivalsPage() {
    const router = useRouter()
    const params = useParams()
    const { data: session } = useSession()
    const companyId = params.id as string

    const [newArrivals, setNewArrivals] = useState<NewArrival[]>([])
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])
    const [settings, setSettings] = useState<NewArrivalsSettings>({ isVisible: true, limit: 10 })
    const [loading, setLoading] = useState(true)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [tempLimit, setTempLimit] = useState(10)
    const [draggedItem, setDraggedItem] = useState<string | null>(null)
    const [selectedArrival, setSelectedArrival] = useState<NewArrival | null>(null)

    const [newArrivalForm, setNewArrivalForm] = useState({
        title: "",
        image: "",
        description: "",
        productId: "",
    })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }
        if (!companyId) return
        fetchData()
    }, [session, router, companyId])

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
            const arrivalsRes = await fetch(`/api/companies/${companyId}/new-arrivals?all=true`)
            if (!arrivalsRes.ok) throw new Error("Failed to fetch new arrivals")
            const arrivalsData = await arrivalsRes.json()
            setNewArrivals(arrivalsData.newArrivals || [])
            setSettings(arrivalsData.settings || { isVisible: true, limit: 10 })
            setTempLimit(arrivalsData.settings?.limit || 10)

            const productsRes = await fetch(`/api/products?company=${companyId}`)
            if (!productsRes.ok) throw new Error("Failed to fetch products")
            const productsData = await productsRes.json()
            const products = Array.isArray(productsData) ? productsData : productsData.products || []
            setAvailableProducts(products)
        } catch (error) {
            console.error("Error fetching data:", error)
            alert("Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    const handleAddProduct = async () => {
        if (!newArrivalForm.productId || !newArrivalForm.title || !newArrivalForm.image) {
            alert("Please fill in product, title, and image")
            return
        }
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: newArrivalForm.productId,
                    title: newArrivalForm.title,
                    image: newArrivalForm.image,
                    description: newArrivalForm.description,
                }),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to add product")
            }
            await fetchData()
            setShowAddDialog(false)
            setNewArrivalForm({ title: "", image: "", description: "", productId: "" })
            setSearchQuery("")
        } catch (error) {
            console.error("Error adding product:", error)
            alert(error instanceof Error ? error.message : "Failed to add product")
        }
    }

    const handleEditArrival = async () => {
        if (!selectedArrival || !selectedArrival.title || !selectedArrival.image || !selectedArrival.productId) {
            alert("Please fill in all required fields")
            return
        }
        try {
            const originalProductId = (selectedArrival as any).originalProductId
            const newProductId = typeof selectedArrival.productId === "object"
                ? selectedArrival.productId._id
                : selectedArrival.productId

            if (originalProductId !== newProductId) {
                await fetch(`/api/companies/${companyId}/new-arrivals/${originalProductId}`, { method: "DELETE" })
                const res = await fetch(`/api/companies/${companyId}/new-arrivals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: newProductId,
                        title: selectedArrival.title,
                        image: selectedArrival.image,
                        description: selectedArrival.description || "",
                    }),
                })
                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || "Failed to update product")
                }
            } else {
                const res = await fetch(`/api/companies/${companyId}/new-arrivals/${originalProductId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: selectedArrival.title,
                        image: selectedArrival.image,
                        description: selectedArrival.description || "",
                    }),
                })
                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || "Failed to update product")
                }
            }
            await fetchData()
            setShowEditDialog(false)
            setSelectedArrival(null)
        } catch (error) {
            console.error("Error updating product:", error)
            alert(error instanceof Error ? error.message : "Failed to update product")
        }
    }

    const handleOpenEditDialog = (arrival: NewArrival) => {
        const originalProductId = typeof arrival.productId === "object" ? arrival.productId._id : arrival.productId
        setSelectedArrival({ ...arrival, originalProductId })
        setShowEditDialog(true)
    }

    const handleRemoveProduct = async (arrivalId: string, productId: string) => {
        if (!confirm("Are you sure you want to remove this product?")) return
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/${productId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to remove product")
            await fetchData()
        } catch (error) {
            console.error("Error removing product:", error)
            alert("Failed to remove product")
        }
    }

    const handleUpdateSettings = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: settings.isVisible, limit: tempLimit }),
            })
            if (!res.ok) throw new Error("Failed to update settings")
            setSettings({ ...settings, limit: tempLimit })
            setShowSettingsDialog(false)
        } catch (error) {
            console.error("Error updating settings:", error)
            alert("Failed to update settings")
        }
    }

    const handleDragStart = (e: React.DragEvent, arrivalId: string) => {
        setDraggedItem(arrivalId)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault()
        if (!draggedItem) return
        const draggedIndex = newArrivals.findIndex((item) => item._id === draggedItem)
        if (draggedIndex === targetIndex || draggedIndex === -1) return

        const reordered = [...newArrivals]
        const [draggedArrival] = reordered.splice(draggedIndex, 1)
        reordered.splice(targetIndex, 0, draggedArrival)
        setNewArrivals(reordered)
        setDraggedItem(null)

        try {
            const productIds = reordered.map((item) =>
                typeof item.productId === "string" ? item.productId : item.productId._id
            )
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds }),
            })
            if (!res.ok) throw new Error("Failed to reorder")
        } catch (error) {
            console.error("Error reordering:", error)
            alert("Failed to reorder products")
            await fetchData()
        }
    }

    const toggleVisibility = async () => {
        const newVisibility = !settings.isVisible
        try {
            const res = await fetch(`/api/companies/${companyId}/new-arrivals/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: newVisibility, limit: settings.limit }),
            })
            if (!res.ok) throw new Error("Failed to update visibility")
            setSettings({ ...settings, isVisible: newVisibility })
        } catch (error) {
            console.error("Error toggling visibility:", error)
            alert("Failed to update visibility")
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading new arrivals...
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
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">New Arrivals</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Manage and showcase this brand's latest products</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowSettingsDialog(true)}
                            variant="outline"
                            className="border-gray-200 text-gray-500 hover:text-gray-900"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-700 hover:bg-emerald-800">
                            <Plus className="w-4 h-4 mr-2" />
                            Add product
                        </Button>
                    </div>
                </div>

                {/* ── Stats row ────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <p className="text-xs font-medium text-gray-500">Products shown</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{newArrivals.length}<span className="text-sm font-medium text-gray-400"> / {settings.limit}</span></p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <p className="text-xs font-medium text-gray-500">Display limit</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{settings.limit}</p>
                    </div>
                    <button
                        onClick={toggleVisibility}
                        className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-gray-300 transition-colors col-span-2 md:col-span-1"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${settings.isVisible ? "bg-emerald-500" : "bg-gray-400"}`} />
                                    <p className="text-xs font-medium text-gray-500">Section status</p>
                                </div>
                                <p className={`text-lg font-bold ${settings.isVisible ? "text-emerald-700" : "text-gray-500"}`}>
                                    {settings.isVisible ? "Visible" : "Hidden"}
                                </p>
                            </div>
                            {settings.isVisible ? <Eye className="w-4 h-4 text-gray-300" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                        </div>
                    </button>
                </div>

                {/* ── List ─────────────────────────────────────────── */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                        <h2 className="font-semibold text-gray-900">Current products ({newArrivals.length}/{settings.limit})</h2>
                        <span className="text-xs text-gray-400">Drag to reorder</span>
                    </div>

                    <div className="p-4">
                        {newArrivals.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <Sparkles className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-700">No products yet</p>
                                <p className="text-xs text-gray-400 mt-1 mb-4">Start building your New Arrivals showcase.</p>
                                <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-700 hover:bg-emerald-800">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add your first product
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {newArrivals.map((arrival, index) => {
                                    const product = typeof arrival.productId === "object" ? arrival.productId : null

                                    return (
                                        <div
                                            key={arrival._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, arrival._id)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={`group flex flex-wrap items-center gap-4 border rounded-xl p-3 cursor-move transition-all ${
                                                draggedItem === arrival._id
                                                    ? "opacity-50 border-emerald-500 border-2 bg-emerald-50/40"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex flex-col items-center gap-1 shrink-0 w-6">
                                                <GripVertical className="w-4 h-4 text-gray-300" />
                                                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{index + 1}</span>
                                            </div>

                                            <img
                                                src={arrival.image || "/placeholder.png"}
                                                alt={arrival.title || "New Arrival"}
                                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                                            />

                                            <div className="min-w-[140px] flex-1">
                                                <p className="font-medium text-sm text-gray-900 truncate">
                                                    {arrival.title || <span className="italic text-gray-400">Untitled arrival</span>}
                                                </p>
                                                {arrival.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{arrival.description}</p>
                                                )}
                                            </div>

                                            {product && (
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                                    <img
                                                        src={product.image || "/placeholder.png"}
                                                        alt={product.name || "Product"}
                                                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/shop/${product.company?.name?.toLowerCase()?.replace(/\s+/g, "-")}/product/${product._id}`}
                                                            className="text-sm font-medium text-emerald-700 hover:underline truncate block"
                                                        >
                                                            {product.name || "Unknown product"}
                                                        </Link>
                                                        {product.price != null && (
                                                            <p className="text-xs font-semibold text-gray-500">₹{product.price.toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(arrival)} className="text-gray-400 hover:text-emerald-700" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleRemoveProduct(arrival._id, (arrival.productId as any)._id || arrival.productId)}
                                                    className="text-gray-400 hover:text-red-600" title="Remove"
                                                >
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

                {/* ── Add Product Dialog ───────────────────────────── */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="max-w-2xl rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Plus className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Add product to New Arrivals</DialogTitle>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">1. Select product</Label>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search by product name or SKU..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm">
                                            {availableProducts.length === 0 ? "No products available" : "No matching products found"}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredProducts.map((product) => {
                                                const isAlreadyAdded = newArrivals.some(
                                                    (item) => (item.productId._id || item.productId) === product._id
                                                )
                                                const isSelected = newArrivalForm.productId === product._id
                                                return (
                                                    <div
                                                        key={product._id}
                                                        className={`p-3 transition-colors ${
                                                            isAlreadyAdded ? "opacity-50" : "cursor-pointer hover:bg-emerald-50"
                                                        } ${isSelected ? "bg-emerald-50" : ""}`}
                                                        onClick={() => {
                                                            if (!isAlreadyAdded) {
                                                                setNewArrivalForm({ ...newArrivalForm, productId: product._id })
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                {product.image && (
                                                                    <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-medium text-gray-900 truncate text-sm">{product.name}</h4>
                                                                    <p className="text-xs text-gray-400">{product.sku && `SKU: ${product.sku}`}</p>
                                                                </div>
                                                            </div>
                                                            {isAlreadyAdded && <span className="text-xs text-gray-400 shrink-0">Already added</span>}
                                                            {isSelected && <span className="text-xs font-semibold text-emerald-700 shrink-0">Selected</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {newArrivalForm.productId && (
                                <>
                                    <div className="border-t border-gray-100 pt-4">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 block">2. Add title & image</Label>
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor="title" className="text-sm">Title *</Label>
                                                <Input
                                                    id="title"
                                                    placeholder="e.g., Luxurious Face Cream"
                                                    value={newArrivalForm.title}
                                                    onChange={(e) => setNewArrivalForm({ ...newArrivalForm, title: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <ImageUploadField
                                                    label="Image *"
                                                    value={newArrivalForm.image}
                                                    onChange={(image) => setNewArrivalForm({ ...newArrivalForm, image })}
                                                    folder="arrivals"
                                                    required={true}
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="description" className="text-sm">Description</Label>
                                                <Textarea
                                                    id="description"
                                                    placeholder="Add a description for this product..."
                                                    value={newArrivalForm.description}
                                                    onChange={(e) => setNewArrivalForm({ ...newArrivalForm, description: e.target.value })}
                                                    className="mt-1 resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
                                        <Button
                                            onClick={() => {
                                                setNewArrivalForm({ title: "", image: "", description: "", productId: "" })
                                                setSearchQuery("")
                                            }}
                                            variant="outline"
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAddProduct} className="bg-emerald-700 hover:bg-emerald-800">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add product
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Settings Dialog ──────────────────────────────── */}
                <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>New Arrivals settings</DialogTitle>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                                    Maximum products to display
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={tempLimit}
                                    onChange={(e) => setTempLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Only the first {tempLimit} products will be shown in the New Arrivals section.
                                </p>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900">Show New Arrivals section</label>
                                    <p className="text-xs text-gray-400 mt-0.5">Toggle the visibility of the entire section</p>
                                </div>
                                <Switch
                                    checked={settings.isVisible}
                                    onCheckedChange={(checked) => setSettings({ ...settings, isVisible: checked })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={handleUpdateSettings} className="bg-emerald-700 hover:bg-emerald-800 flex-1">
                                    Save settings
                                </Button>
                                <Button onClick={() => setShowSettingsDialog(false)} variant="outline" className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Edit Product Dialog ──────────────────────────── */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-2xl rounded-2xl">
                        <DialogHeader className="pb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <Edit className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Edit new arrival</DialogTitle>
                            </div>
                            <DialogDescription className="pl-10.5">
                                Customize how this product appears in your New Arrivals section.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedArrival && (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <Label className="text-sm font-medium">Product *</Label>
                                    <select
                                        value={typeof selectedArrival.productId === "object" ? selectedArrival.productId._id : selectedArrival.productId}
                                        onChange={(e) => setSelectedArrival({ ...selectedArrival, productId: e.target.value as any })}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900"
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {availableProducts.map((product) => (
                                            <option key={product._id} value={product._id}>
                                                {product.name} {product.sku ? `(${product.sku})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="edit-title" className="text-sm">Title *</Label>
                                        <Input
                                            id="edit-title"
                                            placeholder="e.g., Luxurious Face Cream"
                                            value={selectedArrival.title}
                                            onChange={(e) => setSelectedArrival({ ...selectedArrival, title: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <ImageUploadField
                                            label="Image *"
                                            value={selectedArrival.image}
                                            onChange={(image) => setSelectedArrival({ ...selectedArrival, image })}
                                            folder="arrivals"
                                            required={true}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-description" className="text-sm">Description</Label>
                                        <Textarea
                                            id="edit-description"
                                            placeholder="Add a description for this product..."
                                            value={selectedArrival.description || ""}
                                            onChange={(e) => setSelectedArrival({ ...selectedArrival, description: e.target.value })}
                                            className="mt-1 resize-none"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
                                    <Button
                                        onClick={() => { setShowEditDialog(false); setSelectedArrival(null) }}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleEditArrival} className="bg-emerald-700 hover:bg-emerald-800">
                                        Save changes
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    )
}