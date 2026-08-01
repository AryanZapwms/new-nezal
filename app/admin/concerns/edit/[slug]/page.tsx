"use client"
// app/admin/concerns/edit/[slug]/page.tsx
//
// Admin form to edit an existing Concern. Same shape as Add, but loads
// existing data first and PUTs to /api/concerns/[slug].

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, X, Upload, Sparkles, Image as ImageIcon, Package, Search,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ProductLite {
  _id: string
  name: string
  image: string
  price: number
}

export default function EditConcernPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const originalSlug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const [label, setLabel] = useState("")
  const [slug, setSlug] = useState("")
  const [headline, setHeadline] = useState("")
  const [subheadline, setSubheadline] = useState("")
  const [description, setDescription] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [color, setColor] = useState("#F3F5EF")
  const [isActive, setIsActive] = useState(true)

  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductLite[]>([])

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") { router.push("/auth/login"); return }
    fetchConcern()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, originalSlug])

  const fetchConcern = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/concerns/${originalSlug}?admin=true`)
      const data = await res.json()
      const c = data.concern
      if (!c) throw new Error("Not found")

      setLabel(c.label || "")
      setSlug(c.slug || "")
      setHeadline(c.headline || "")
      setSubheadline(c.subheadline || "")
      setDescription(c.description || "")
      setHeroImage(c.heroImage || "")
      setColor(c.color || "#F3F5EF")
      setIsActive(c.isActive ?? true)
      setSelectedProducts((c.products || []).map((p: any) => ({
        _id: p._id, name: p.name, image: p.image, price: p.price,
      })))
    } catch (e) {
      setMessage("error:Error loading concern.")
    } finally {
      setLoading(false)
    }
  }

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

  const addProduct = (p: ProductLite) => {
    if (selectedProducts.find((sp) => sp._id === p._id)) return
    setSelectedProducts((prev) => [...prev, p])
    setProductSearch("")
    setSearchResults([])
  }
  const removeProduct = (id: string) => setSelectedProducts((prev) => prev.filter((p) => p._id !== id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !slug.trim()) { setMessage("error:Label and slug are required."); return }
    setSubmitting(true); setMessage("")
    try {
      const res = await fetch(`/api/concerns/${originalSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label, slug, headline, subheadline, description, heroImage, color, isActive,
          products: selectedProducts.map((p) => p._id),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update concern")
      setMessage("success:Concern updated successfully!")
      setTimeout(() => router.push("/admin/concerns"), 1200)
    } catch (err: any) {
      setMessage(err.message || "error:Error updating concern.")
    } finally { setSubmitting(false) }
  }

  const isSuccess = message.startsWith("success:")
  const displayMessage = message.replace(/^(success|error):/, "")

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading concern...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <Link href="/admin/concerns">
          <Button variant="ghost" className="-ml-2 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to concerns
          </Button>
        </Link>

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit concern</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update this shop-by-concern landing page.</p>
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Label *
                </label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Slug *
                </label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required className="font-mono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Headline <span className="font-normal normal-case text-gray-400">(optional — falls back to label)</span>
              </label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Subheadline <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Description <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
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
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 font-mono text-sm" />
                </div>
                <div className="h-24 w-full rounded-lg mt-2 border border-gray-200" style={{ backgroundColor: color }} />
              </div>
            </div>

            {/* Recommended products */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended products</span>
              </div>

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

            <Button type="submit" disabled={submitting} className="w-full bg-emerald-700 hover:bg-emerald-800">
              {submitting ? "Updating..." : "Update concern"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}