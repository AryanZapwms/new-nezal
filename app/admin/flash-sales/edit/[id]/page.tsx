"use client"
// app/admin/flash-sales/edit/[id]/page.tsx

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, X, Zap, Search, Package, CalendarClock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ProductLite {
  _id: string
  name: string
  image: string
  price: number
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function EditFlashSalePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: session, status } = useSession()

  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const [name, setName] = useState("")
  const [discountPercent, setDiscountPercent] = useState("")
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date()))
  const [endsAt, setEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)))
  const [isActive, setIsActive] = useState(true)

  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductLite[]>([])

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login")
  }, [status, router])

  // Load existing sale
  useEffect(() => {
    if (!id || status === "loading") return
    async function load() {
      try {
        const res = await fetch(`/api/flash-sales/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Not found")
        const s = data.sale
        setName(s.name || "")
        setDiscountPercent(String(s.discountPercent || ""))
        setStartsAt(toLocalInputValue(new Date(s.startsAt)))
        setEndsAt(toLocalInputValue(new Date(s.endsAt)))
        setIsActive(s.isActive ?? true)
        setSelectedProducts(
          (s.products || []).map((p: any) => ({
            _id: p._id,
            name: p.name,
            image: p.image,
            price: p.price,
          }))
        )
      } catch (e: any) {
        setMessage(e.message || "Error loading flash sale.")
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [id, status])

  // Product search
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

  const addProduct = (p: ProductLite) => {
    if (selectedProducts.find((sp) => sp._id === p._id)) return
    setSelectedProducts((prev) => [...prev, p])
    setProductSearch("")
    setSearchResults([])
  }
  const removeProduct = (id: string) =>
    setSelectedProducts((prev) => prev.filter((p) => p._id !== id))

  const discountPreview = (price: number) => {
    const pct = Number(discountPercent) || 0
    return Math.round(price - (price * pct) / 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setMessage("Name is required."); return }
    const pct = Number(discountPercent)
    if (!pct || pct <= 0 || pct > 90) { setMessage("Discount must be between 1 and 90%."); return }
    if (selectedProducts.length === 0) { setMessage("Add at least one product."); return }
    if (new Date(endsAt) <= new Date(startsAt)) { setMessage("End time must be after start time."); return }

    setSubmitting(true); setMessage("")
    try {
      const res = await fetch(`/api/flash-sales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          discountPercent: pct,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          products: selectedProducts.map((p) => p._id),
          isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update flash sale")
      setMessage("success:Flash sale updated successfully!")
      setTimeout(() => router.push("/admin/flash-sales"), 1200)
    } catch (err: any) {
      setMessage(err.message || "Error updating flash sale.")
    } finally { setSubmitting(false) }
  }

  const isSuccess = message.startsWith("success:")
  const displayMessage = isSuccess ? message.replace("success:", "") : message

  if (status === "loading" || pageLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading flash sale...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <Link href="/admin/flash-sales">
          <Button variant="ghost" className="-ml-2 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to flash sales
          </Button>
        </Link>

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit flash sale</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update the discount window or which products it applies to.</p>
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Sale Name *
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Flash Sale" required />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Discount Percentage *
              </label>
              <Input
                type="number"
                min={1}
                max={90}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 25"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Applied to the regular price of each selected product while the sale is live.</p>
            </div>

            {/* Window */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sale window</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Starts at *</label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className="bg-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ends at *</label>
                  <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required className="bg-white" />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Products on sale
                </span>
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
                        <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
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
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                  {selectedProducts.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        {discountPercent && Number(discountPercent) > 0 && (
                          <p className="text-xs">
                            <span className="line-through text-gray-400">₹{p.price}</span>
                            {" → "}
                            <span className="font-bold text-amber-700">₹{discountPreview(p.price)}</span>
                          </p>
                        )}
                      </div>
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

            {/* Active toggle */}
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-800">
                Active — will go live automatically at the start time
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
              {submitting ? "Updating..." : "Update flash sale"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}