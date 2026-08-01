"use client"
// app/admin/rituals/add/page.tsx
//
// Admin form to create a new Ritual: basic info, hero image, ordered
// routine steps, and a product picker (search + add) for the curated list.

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, X, Upload, Plus, GripVertical, Flower2, Image as ImageIcon,
  Package, Search, ListOrdered, Tag, CheckCircle2, AlertCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Step {
  stepNumber: number
  title: string
  description: string
  productId?: string
}

interface ProductLite {
  _id: string
  name: string
  image: string
  price: number
}

export default function AddRitualPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [color, setColor] = useState("#F3F5EF")
  const [isActive, setIsActive] = useState(true)

  const [steps, setSteps] = useState<Step[]>([])
  const [stepInput, setStepInput] = useState({ title: "", description: "" })

  const [idealFor, setIdealFor] = useState("")

  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductLite[]>([])

  useEffect(() => {
    if (!session) { router.push("/auth/login") }
  }, [session, router])

  // auto-slug from name
  useEffect(() => {
    if (!slug && name) {
      setSlug(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    }
  }, [name, slug])

  // product search (debounced)
  useEffect(() => {
    const term = productSearch.trim()
    if (term.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=8`)
        const data = await res.json()
        setSearchResults((data.products || data || []).map((p: any) => ({
          _id: p._id, name: p.name, image: p.image, price: p.price,
        })))
      } catch { setSearchResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch])

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.urls?.[0]) setHeroImage(data.urls[0])
    } catch { setMessage("error:Error uploading image.") }
    finally { setUploading(false); e.target.value = "" }
  }

  const addStep = () => {
    if (!stepInput.title.trim()) { setMessage("error:Step title is required."); return }
    setSteps((prev) => [...prev, { stepNumber: prev.length + 1, title: stepInput.title, description: stepInput.description }])
    setStepInput({ title: "", description: "" })
    setMessage("")
  }
  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  const addProduct = (p: ProductLite) => {
    if (selectedProducts.find((sp) => sp._id === p._id)) return
    setSelectedProducts((prev) => [...prev, p])
    setProductSearch("")
    setSearchResults([])
  }
  const removeProduct = (id: string) => setSelectedProducts((prev) => prev.filter((p) => p._id !== id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) { setMessage("error:Name and slug are required."); return }
    setLoading(true); setMessage("")
    try {
      const res = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, tagline, description, heroImage, color, isActive,
          steps,
          idealFor: idealFor.split("\n").map((s) => s.trim()).filter(Boolean),
          products: selectedProducts.map((p) => p._id),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create ritual")
      setMessage("success:Ritual created successfully!")
      setTimeout(() => router.push("/admin/rituals"), 1200)
    } catch (err: any) {
      setMessage(err.message || "error:Error creating ritual.")
    } finally { setLoading(false) }
  }

  const isSuccess = message.startsWith("success:")
  const displayMessage = message.replace(/^(success|error):/, "")

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <Link href="/admin/rituals">
          <Button variant="ghost" className="-ml-2 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to rituals
          </Button>
        </Link>

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <Flower2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add ritual</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new curated routine.</p>
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Ritual Name *
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clear Skin Ritual" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Slug *
                </label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clear-skin-ritual" required className="font-mono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Tagline <span className="font-normal normal-case text-gray-400">(shown on homepage card)</span>
              </label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Wake up to clearer, calmer skin" />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Description <span className="font-normal normal-case text-gray-400">(shown on ritual page)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                placeholder="Longer intro paragraph for the ritual hero section"
              />
            </div>

            {/* Hero image + color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hero image</span>
                </div>

                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Paste image URL</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="flex-1 bg-white"
                  />
                  {heroImage && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setHeroImage("")} className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-white hover:border-gray-300 transition-colors">
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-medium text-gray-600">
                      {uploading ? "Uploading..." : "Upload from device"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleHeroUpload} disabled={uploading} className="hidden" />
                </label>

                {heroImage && (
                  <div className="relative h-28 w-full rounded-lg overflow-hidden border border-gray-200 mt-3">
                    <Image src={heroImage} alt="Hero preview" fill className="object-cover" />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                      Preview
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Background color (hex)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#F3F5EF"}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-11 h-10 p-1 shrink-0"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#F3F5EF" className="flex-1 font-mono text-sm" />
                </div>
                <div className="h-24 w-full rounded-lg mt-2 border border-gray-200" style={{ backgroundColor: color }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Ideal For <span className="font-normal normal-case text-gray-400">(one per line — shown as pills)</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <textarea
                  value={idealFor}
                  onChange={(e) => setIdealFor(e.target.value)}
                  rows={3}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  placeholder={"Oily skin\nAcne-prone skin\nTeenagers & young professionals\nCombination skin"}
                />
              </div>
            </div>

            {/* Routine steps */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ListOrdered className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Routine steps</span>
              </div>
              <p className="text-xs text-gray-400 -mt-2 mb-3">
                Ordered steps shown on the ritual page (e.g. Cleanse → Treat → Moisturize).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={stepInput.title}
                  onChange={(e) => setStepInput((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Step title, e.g. Cleanse"
                  className="bg-white"
                />
                <Input
                  value={stepInput.description}
                  onChange={(e) => setStepInput((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description"
                  className="bg-white"
                />
              </div>

              <Button type="button" onClick={addStep} variant="outline" size="sm" className="w-full mt-3 bg-white">
                <Plus className="w-4 h-4 mr-1" /> Add step
              </Button>

              {steps.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 max-h-56 overflow-y-auto">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                      <div className="flex-1 text-sm min-w-0">
                        <span className="font-semibold text-gray-900">{step.stepNumber}. {step.title}</span>
                        {step.description && (
                          <p className="text-gray-400 text-xs mt-0.5">{step.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="text-gray-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Curated products */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Curated products</span>
              </div>
              <p className="text-xs text-gray-400 -mt-2 mb-3">Search and add products that belong to this ritual.</p>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="bg-white pl-9"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-md max-h-60 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center gap-3 text-sm border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                        </div>
                        <span className="font-medium text-gray-900 truncate flex-1">{p.name}</span>
                        <span className="text-xs text-gray-400">₹{p.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProducts.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 max-h-56 overflow-y-auto">
                  {selectedProducts.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                      </div>
                      <span className="text-sm text-gray-900 flex-1 truncate">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => removeProduct(p._id)}
                        className="text-gray-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-800">
                Active — visible on the homepage
              </label>
            </div>

            {message && (
              <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm ${
                isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {displayMessage}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800">
              {loading ? "Creating..." : "Create ritual"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}