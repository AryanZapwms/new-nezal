"use client"
// app/admin/collections/[slug]/products/page.tsx
//
// Add/remove products from a collection. Products belong to a collection via
// their own `collectionSlug` field — this page just flips that field.

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, X, Plus } from "lucide-react"

interface ProductLite {
  _id: string
  name: string
  image?: string
  price: number
  discountPrice?: number
  stock?: number
  isActive?: boolean
  company?: { name: string; slug: string }
}

export default function ManageCollectionProductsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const slug = params.slug as string

  const [collectionName, setCollectionName] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  const [current, setCurrent] = useState<ProductLite[]>([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ProductLite[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) { router.push("/auth/login"); return }
    load()
  }, [session, slug])

  const load = async () => {
    setLoading(true)
    try {
      const [colRes, prodRes] = await Promise.all([
        fetch(`/api/admin/collections/${slug}`),
        fetch(`/api/admin/collections/${slug}/products`),
      ])
      const colData = await colRes.json()
      const prodData = await prodRes.json()
      setCollectionName(colData.collection?.name || slug)
      setCurrent(prodData.products || [])
    } catch {
      setMessage("Error loading collection products.")
    } finally {
      setLoading(false)
    }
  }

  // debounced product search, excluding ones already in this collection
  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=10`)
        const data = await res.json()
        const results: ProductLite[] = (data.products || data || []).map((p: any) => ({
          _id: p._id, name: p.name, image: p.image, price: p.price,
          discountPrice: p.discountPrice, stock: p.stock, isActive: p.isActive,
          company: p.company,
        }))
        const currentIds = new Set(current.map((c) => c._id))
        setSearchResults(results.filter((p) => !currentIds.has(p._id)))
      } catch { setSearchResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [search, current])

  const addProduct = async (product: ProductLite) => {
    setBusyId(product._id)
    setMessage("")
    try {
      const res = await fetch(`/api/admin/collections/${slug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add product")
      setCurrent((prev) => [...prev, product])
      setSearchResults((prev) => prev.filter((p) => p._id !== product._id))
      setSearch("")
    } catch (err: any) {
      setMessage(err.message || "Error adding product.")
    } finally {
      setBusyId(null)
    }
  }

  const removeProduct = async (product: ProductLite) => {
    if (!confirm(`Remove "${product.name}" from this collection?`)) return
    setBusyId(product._id)
    setMessage("")
    try {
      const res = await fetch(`/api/admin/collections/${slug}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove product")
      setCurrent((prev) => prev.filter((p) => p._id !== product._id))
    } catch (err: any) {
      setMessage(err.message || "Error removing product.")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/admin/collections">
          <Button variant="ghost" className="mb-6 bg-transparent"><ArrowLeft className="w-4 h-4 mr-2" />Back to Collections</Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-1">Manage Products</h1>
        <p className="text-muted-foreground mb-8">Collection: <span className="font-semibold text-foreground">{collectionName}</span></p>

        {message && (
          <div className="mb-4 p-3 rounded text-sm bg-red-100 text-red-800">{message}</div>
        )}

        {/* Add products */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Add Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name..."
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      disabled={busyId === p._id}
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted text-left disabled:opacity-50"
                    >
                      <div className="relative h-8 w-8 shrink-0 rounded overflow-hidden bg-muted">
                        {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                      </div>
                      <span className="text-sm flex-1">{p.name}</span>
                      {p.company?.name && <span className="text-xs text-muted-foreground">{p.company.name}</span>}
                      <span className="text-xs text-muted-foreground">₹{p.price}</span>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {search.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No matching products (or already added).</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Products in this Collection <span className="text-muted-foreground font-normal">({current.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {current.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No products added yet — search above to add some.</p>
            ) : (
              current.map((p) => (
                <div key={p._id} className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-background">
                  <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-muted">
                    {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.company?.name && `${p.company.name} · `}₹{p.discountPrice || p.price}
                      {p.stock === 0 && <span className="text-red-600 ml-1">· Out of stock</span>}
                    </p>
                  </div>
                  {p.isActive === false && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 shrink-0">
                      Inactive
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === p._id}
                    onClick={() => removeProduct(p)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}