"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    ArrowLeft, Plus, Edit, Trash2, Building2, Image as ImageIcon, X, Sparkles,
    HeartPulse, GripVertical, Mail, Phone, Globe, RefreshCw, Pencil,
} from "lucide-react"
import { ImageUploadField } from "@/components/admin/image-upload-field"

interface CarouselImage {
    _id?: string
    url: string
    title?: string
    description?: string
}

interface NewArrival {
    _id?: string
    productId: string
    position: number
    addedAt: string
}

interface Company {
    _id: string
    name: string
    slug: string
    description?: string
    logo?: string
    banner?: string
    email?: string
    phone?: string
    website?: string
    position?: number
    carouselImages?: CarouselImage[]
    newArrivals?: NewArrival[]
    shopByConcern?: any[]
    newArrivalsSettings?: {
        isVisible: boolean
        limit: number
    }
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export default function CompaniesPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedCompanyForCarousel, setSelectedCompanyForCarousel] = useState<Company | null>(null)
    const [showCarouselModal, setShowCarouselModal] = useState(false)
    const [draggedCompany, setDraggedCompany] = useState<Company | null>(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)
    const [migrating, setMigrating] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        logo: "",
        banner: "",
        email: "",
        phone: "",
        website: "",
        isActive: true,
    })
    const [carouselForm, setCarouselForm] = useState({
        url: "",
        file: null as File | null,
        title: "",
        description: "",
        uploadType: "url" as "url" | "file",
    })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }
        fetchCompanies()
    }, [session, router])

    const fetchCompanies = async () => {
        try {
            const res = await fetch(`/api/companies?all=true&t=${Date.now()}`)
            const data = await res.json()
            setCompanies(data)
        } catch (error) {
            console.error("Error fetching companies:", error)
        } finally {
            setLoading(false)
        }
    }

    const migrateCompanies = async () => {
        setMigrating(true)
        try {
            const res = await fetch("/api/companies/migrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Migration failed")
            await fetchCompanies()
        } catch (error) {
            console.error("Error migrating companies:", error)
            alert(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setMigrating(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleCarouselChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement
        const { name } = target

        if (name === "image" && target.type === "file") {
            const file = target.files?.[0] || null
            setCarouselForm((prev) => ({ ...prev, file }))
        } else {
            const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value
            setCarouselForm((prev) => ({ ...prev, [name]: value }))
        }
    }

    const handleToggle = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, isActive: checked }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const url = editingId ? `/api/companies/${editingId}` : "/api/companies"
            const method = editingId ? "PUT" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!res.ok) throw new Error("Failed to save company")
            await fetchCompanies()
            resetForm()
        } catch (error) {
            console.error("Error saving company:", error)
            alert("Failed to save company")
        } finally {
            setLoading(false)
        }
    }

    const handleAddCarouselImage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCompanyForCarousel) return

        if (carouselForm.uploadType === "url" && !carouselForm.url) {
            alert("Please enter an image URL")
            return
        }
        if (carouselForm.uploadType === "file" && !carouselForm.file) {
            alert("Please select an image file")
            return
        }

        try {
            let response
            if (carouselForm.uploadType === "file" && carouselForm.file) {
                const fd = new FormData()
                fd.append("image", carouselForm.file)
                fd.append("title", carouselForm.title)
                fd.append("description", carouselForm.description)
                response = await fetch(`/api/companies/${selectedCompanyForCarousel._id}/carousel`, {
                    method: "POST",
                    body: fd,
                })
            } else {
                response = await fetch(`/api/companies/${selectedCompanyForCarousel._id}/carousel`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: carouselForm.url,
                        title: carouselForm.title,
                        description: carouselForm.description,
                    }),
                })
            }

            if (!response.ok) throw new Error("Failed to add carousel image")

            const freshRes = await fetch(`/api/companies/${selectedCompanyForCarousel._id}`)
            const updatedCompany = await freshRes.json()

            if (updatedCompany && updatedCompany._id) {
                setSelectedCompanyForCarousel(updatedCompany)
                await fetchCompanies()
            }

            setCarouselForm({ url: "", file: null, title: "", description: "", uploadType: "url" })
        } catch (error) {
            console.error("Error adding carousel image:", error)
            alert("Failed to add carousel image")
        }
    }

    const handleRemoveCarouselImage = async (imageId?: string) => {
        if (!selectedCompanyForCarousel || !imageId) return
        try {
            const res = await fetch(
                `/api/companies/${selectedCompanyForCarousel._id}/carousel/${imageId}`,
                { method: "DELETE" }
            )
            if (!res.ok) throw new Error("Failed to remove carousel image")

            const freshRes = await fetch(`/api/companies/${selectedCompanyForCarousel._id}`)
            const updatedCompany = await freshRes.json()

            if (updatedCompany && updatedCompany._id) {
                setSelectedCompanyForCarousel(updatedCompany)
                await fetchCompanies()
            }
        } catch (error) {
            console.error("Error removing carousel image:", error)
            alert("Failed to remove carousel image")
        }
    }

    const handleEdit = (company: Company) => {
        setFormData({
            name: company.name,
            slug: company.slug,
            description: company.description || "",
            logo: company.logo || "",
            banner: company.banner || "",
            email: company.email || "",
            phone: company.phone || "",
            website: company.website || "",
            isActive: company.isActive,
        })
        setEditingId(company._id)
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this company?")) return
        try {
            const res = await fetch(`/api/companies/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete company")
            await fetchCompanies()
        } catch (error) {
            console.error("Error deleting company:", error)
            alert("Failed to delete company")
        }
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, company: Company) => {
        setDraggedCompany(company)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetCompany: Company) => {
        e.preventDefault()
        if (!draggedCompany || draggedCompany._id === targetCompany._id) {
            setDraggedCompany(null)
            return
        }

        const draggedIndex = companies.findIndex((c) => c._id === draggedCompany._id)
        const targetIndex = companies.findIndex((c) => c._id === targetCompany._id)
        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedCompany(null)
            return
        }

        const newCompanies = [...companies]
        newCompanies.splice(draggedIndex, 1)
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
        newCompanies.splice(newTargetIndex, 0, draggedCompany)

        setCompanies(newCompanies)
        setDraggedCompany(null)
        await saveCompanyOrder(newCompanies)
    }

    const handleDragEnd = () => setDraggedCompany(null)

    const saveCompanyOrder = async (orderedCompanies: Company[]) => {
        try {
            setIsSavingOrder(true)
            const res = await fetch("/api/companies/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companies: orderedCompanies }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to save order")
            await fetchCompanies()
        } catch (error) {
            console.error("Error saving company order:", error)
            alert(`Failed to save company order: ${error instanceof Error ? error.message : String(error)}`)
            await fetchCompanies()
        } finally {
            setIsSavingOrder(false)
        }
    }

    const openCarouselModal = (company: Company) => {
        setSelectedCompanyForCarousel(company)
        setShowCarouselModal(true)
    }

    const resetForm = () => {
        setFormData({
            name: "", slug: "", description: "", logo: "", banner: "",
            email: "", phone: "", website: "", isActive: true,
        })
        setEditingId(null)
        setShowForm(false)
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading companies...
                </div>
            </main>
        )
    }

    const activeCount = companies.filter((c) => c.isActive).length

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* ── Page header ──────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <Button variant="outline" size="icon" className="border-gray-200 text-gray-500 hover:text-gray-900 shrink-0">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {activeCount} active · {companies.length} total brands · drag cards to reorder
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={migrateCompanies}
                            variant="outline"
                            disabled={migrating}
                            className="border-gray-200 text-gray-500 hover:text-gray-900"
                            title="Initialize company positions for drag-and-drop reordering"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? "animate-spin" : ""}`} />
                            Migrate positions
                        </Button>
                        <Button onClick={() => { setShowForm(true); setEditingId(null) }} className="bg-emerald-700 hover:bg-emerald-800">
                            <Plus className="w-4 h-4 mr-2" />
                            Add company
                        </Button>
                    </div>
                </div>

                {/* ── Form ─────────────────────────────────────────── */}
                {showForm && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    {editingId ? <Pencil className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                                </div>
                                <h2 className="font-semibold text-gray-900">
                                    {editingId ? "Edit company" : "Add a new company"}
                                </h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-500 hover:text-gray-900">
                                <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Company Name *</label>
                                    <Input
                                        type="text" name="name" value={formData.name} onChange={handleChange}
                                        placeholder="e.g., Nezal" required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Slug *</label>
                                    <Input
                                        type="text" name="slug" value={formData.slug} onChange={handleChange}
                                        placeholder="e.g., nezal" required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Description</label>
                                <Textarea
                                    name="description" value={formData.description} onChange={handleChange}
                                    placeholder="Company description..." rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Logo</label>
                                    <ImageUploadField
                                        label=""
                                        value={formData.logo}
                                        onChange={(url) => setFormData({ ...formData, logo: url })}
                                        folder="companies"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Banner</label>
                                    <ImageUploadField
                                        label=""
                                        value={formData.banner}
                                        onChange={(url) => setFormData({ ...formData, banner: url })}
                                        folder="companies"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Email</label>
                                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contact@company.com" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Phone</label>
                                    <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Website</label>
                                    <Input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://company.com" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                                <div className="flex items-center gap-3">
                                    <Switch checked={formData.isActive} onCheckedChange={handleToggle} />
                                    <div>
                                        <label className="text-sm font-medium text-gray-900">Active</label>
                                        <p className="text-xs text-gray-400">Visible across the storefront</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]">
                                        {loading ? "Saving..." : editingId ? "Update company" : "Create company"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Companies grid ───────────────────────────────── */}
                {companies.length === 0 ? (
                    <div className="text-center bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <Building2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">No companies yet</p>
                        <p className="text-xs text-gray-400 mt-1 mb-4">Create your first skincare brand to get started.</p>
                        <Button onClick={() => setShowForm(true)} className="bg-emerald-700 hover:bg-emerald-800">
                            <Plus className="w-4 h-4 mr-2" />
                            Add company
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companies.map((company) => (
                            <div
                                key={company._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, company)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, company)}
                                onDragEnd={handleDragEnd}
                                className={`bg-white border rounded-2xl overflow-hidden cursor-move transition-all ${
                                    draggedCompany?._id === company._id
                                        ? "opacity-50 border-emerald-500 border-2"
                                        : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                                } ${isSavingOrder ? "pointer-events-none opacity-75" : ""}`}
                            >
                                {/* Banner / logo header */}
                                <div className="relative h-24 bg-gradient-to-br from-emerald-50 to-gray-50 border-b border-gray-100">
                                    {company.banner ? (
                                        <img src={company.banner} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-emerald-200" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <GripVertical className="w-4 h-4 text-white/80 drop-shadow" />
                                    </div>
                                    <span
                                        className={`absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                            company.isActive ? "bg-emerald-600 text-white" : "bg-gray-700 text-white"
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${company.isActive ? "bg-emerald-200" : "bg-gray-300"}`} />
                                        {company.isActive ? "Active" : "Inactive"}
                                    </span>
                                    {company.logo && (
                                        <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl border-4 border-white bg-white overflow-hidden shadow-sm">
                                            <img src={company.logo} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <div className={`p-4 ${company.logo ? "pt-9" : "pt-4"} space-y-3`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                                            <p className="text-xs text-gray-400">/{company.slug}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(company)} className="h-7 w-7 text-gray-400 hover:text-emerald-700">
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(company._id)} className="h-7 w-7 text-gray-400 hover:text-red-600">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {company.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2">{company.description}</p>
                                    )}

                                    {(company.email || company.phone || company.website) && (
                                        <div className="space-y-1 text-xs text-gray-500">
                                            {company.email && (
                                                <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0 text-gray-400" />{company.email}</p>
                                            )}
                                            {company.phone && (
                                                <p className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3 shrink-0 text-gray-400" />{company.phone}</p>
                                            )}
                                            {company.website && (
                                                <p className="flex items-center gap-1.5 truncate"><Globe className="w-3 h-3 shrink-0 text-gray-400" />{company.website}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-sections */}
                                    <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => openCarouselModal(company)}
                                            className="flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <span className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Carousel</span>
                                            <span className="text-gray-400">{company.carouselImages?.length || 0}</span>
                                        </button>
                                        <Link
                                            href={`/admin/companies/${company._id}/new-arrivals`}
                                            className="flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> New arrivals</span>
                                            <span className="text-gray-400">{company.newArrivals?.length || 0}</span>
                                        </Link>
                                        <Link
                                            href={`/admin/companies/${company._id}/shop-by-concern`}
                                            className="flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <span className="flex items-center gap-2"><HeartPulse className="w-3.5 h-3.5" /> Shop by concern</span>
                                            <span className="text-gray-400">{company.shopByConcern?.length || 0}</span>
                                        </Link>
                                    </div>

                                    <p className="text-[11px] text-gray-300 pt-1">
                                        Added {new Date(company.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Carousel Management Modal ────────────────────────── */}
            {selectedCompanyForCarousel && (
                <Dialog open={showCarouselModal} onOpenChange={setShowCarouselModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle>Carousel — {selectedCompanyForCarousel.name}</DialogTitle>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Add New Image Form */}
                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Add new image</h3>
                                <form onSubmit={handleAddCarouselImage} className="space-y-4">
                                    <ImageUploadField
                                        label="Carousel Image"
                                        value={carouselForm.url}
                                        onChange={(url) => setCarouselForm({ ...carouselForm, url })}
                                        folder="carousel"
                                    />
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Title (Optional)</label>
                                        <Input
                                            type="text" name="title" value={carouselForm.title} onChange={handleCarouselChange}
                                            placeholder="e.g., Summer Collection" className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Description (Optional)</label>
                                        <Textarea
                                            name="description" value={carouselForm.description} onChange={handleCarouselChange}
                                            placeholder="Carousel image description..." rows={2} className="bg-white"
                                        />
                                    </div>
                                    <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 w-full">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add image
                                    </Button>
                                </form>
                            </div>

                            {/* Current Images */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                                    Current images ({selectedCompanyForCarousel.carouselImages?.length || 0})
                                </h3>
                                {selectedCompanyForCarousel.carouselImages && selectedCompanyForCarousel.carouselImages.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {selectedCompanyForCarousel.carouselImages.map((image) => (
                                            <div key={image._id} className="flex gap-3 border border-gray-200 rounded-xl p-3 bg-white">
                                                <img
                                                    src={image.url}
                                                    alt={image.title || "Carousel image"}
                                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 truncate">
                                                        {image.title || <span className="italic text-gray-400">Untitled</span>}
                                                    </p>
                                                    {image.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{image.description}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleRemoveCarouselImage(image._id)}
                                                    className="text-gray-400 hover:text-red-600 shrink-0 h-8 w-8"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                                        <p className="text-sm text-gray-400">No carousel images yet. Add one above to get started.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </main>
    )
}