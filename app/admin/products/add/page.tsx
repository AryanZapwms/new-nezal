// app/admin/products/add/page.tsx
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, X, Upload, Plus, Package, Image as ImageIcon, Tag, Sparkles, FlaskConical } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { invalidateCache } from "@/lib/cacheClient"

import QuickPasteBox from "@/components/QuickPasteBox"
import { ParsedProductData } from "@/lib/parseQuickPaste"

import SizeForm, { Size, emptySize } from "@/components/admin/size-form"
import SizeCard from "@/components/admin/size-card"

interface Company { _id: string; name: string }
interface Category {
  _id: string; name: string; slug: string
  parent?: { name: string; slug: string; _id?: string }
  subCategories?: Category[]
  company?: string
}

interface KeyIngredient { name: string; benefit: string }

function normalizeTextarea(val: string): string[] {
  return val.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
}
function normalizeByNewlineOnly(val: string): string[] {
  return val.split("\n").map((s) => s.trim()).filter(Boolean)
}

// Shared field styles so every input/textarea/select looks consistent
const inputCls = "bg-white border-gray-200 focus-visible:ring-emerald-500"
const textareaCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
const labelCls = "text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block"

function SectionCard({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

export default function AddProductPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingResult, setUploadingResult] = useState(false)
  const [message, setMessage] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [formData, setFormData] = useState({
    name: "", slug: "", description: "",
    price: "", salePercentage: "",
    category: "", mainCategory: "", company: "",
    stock: "", sku: "",
    weight: "0.3",
    length: "10",
    breadth: "10",
    height: "10",
    amazonUrl: "",
    variantLabel: "",        
    skinTypes: "",           
    ingredients: "", benefits: "", usage: "", suitableFor: "",
    isActive: true,
    isBestSeller: false,
    whyYoullLoveIt: "",
    fragranceExp: "",
    whoIsItFor: "",
    skinHairConcern: "",
    expectedResults: "",
    gstPercent: "",
    hsn: "",
  })
  const [keyIngredients, setKeyIngredients] = useState<KeyIngredient[]>([])
  const [keyIngInput, setKeyIngInput] = useState<KeyIngredient>({ name: "", benefit: "" })
  const [results, setResults] = useState<Array<{ image: string; title: string; text: string }>>([])
  const [resultInput, setResultInput] = useState({ image: "", title: "", text: "" })
  const [resultImageUrl, setResultImageUrl] = useState("")
const [sizes, setSizes] = useState<Size[]>([])
const [sizeInput, setSizeInput] = useState<Size>(emptySize())

  useEffect(() => {
    if (!session) { router.push("/auth/login"); return }
    fetchCompanies()
  }, [session, router])

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies")
      const data = res.ok ? await res.json() : []
      setCompanies(data)
    } catch { setCompanies([]) }
  }

  const fetchCategoriesForCompany = async (companyId: string) => {
    try {
      const res = await fetch(`/api/categories?company=${companyId}`)
      const data = res.ok ? await res.json() : []
      setCategories(data)
      setFormData((prev) => ({ ...prev, mainCategory: "", category: "" }))
    } catch { setCategories([]) }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (name === "company" && value) fetchCategoriesForCompany(value)
    if (name === "mainCategory") { setFormData((prev) => ({ ...prev, mainCategory: value, category: "" })); return }
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleQuickPasteApply = (parsed: ParsedProductData) => {
    setFormData((prev) => ({
      ...prev,
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.slug !== undefined && { slug: parsed.slug }),
      ...(parsed.price !== undefined && { price: parsed.price }),
      ...(parsed.discountPrice !== undefined && Number(parsed.price) > 0 && {
        // Quick-paste gives a ₹ discount price; direct sale is stored as a percentage.
        salePercentage: String(Math.round(((Number(parsed.price) - Number(parsed.discountPrice)) / Number(parsed.price)) * 100)),
      }),
      ...(parsed.stock !== undefined && { stock: parsed.stock }),
      ...(parsed.sku !== undefined && { sku: parsed.sku }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.ingredients !== undefined && { ingredients: parsed.ingredients }),
      ...(parsed.benefits !== undefined && { benefits: parsed.benefits }),
      ...(parsed.usage !== undefined && { usage: parsed.usage }),
      ...(parsed.suitableFor !== undefined && { suitableFor: parsed.suitableFor }),
      ...(parsed.whyYoullLoveIt !== undefined && { whyYoullLoveIt: parsed.whyYoullLoveIt }),
      ...(parsed.fragranceExp !== undefined && { fragranceExp: parsed.fragranceExp }),
      ...(parsed.whoIsItFor !== undefined && { whoIsItFor: parsed.whoIsItFor }),
      ...(parsed.skinHairConcern !== undefined && { skinHairConcern: parsed.skinHairConcern }),
      ...(parsed.expectedResults !== undefined && { expectedResults: parsed.expectedResults }),
    }))
    if (parsed.keyIngredients?.length) {
      setKeyIngredients((prev) => [...prev, ...parsed.keyIngredients!])
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((file) => fd.append("files", file))
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setImageUrls((prev) => [...prev, ...data.urls])
    } catch { setMessage("Error uploading images.") }
    finally { setUploading(false); e.target.value = "" }
  }

  const removeImage = (index: number) => setImageUrls((prev) => prev.filter((_, i) => i !== index))

  const handleAddSize = () => {
  if (!sizeInput.size || sizeInput.quantity <= 0 || sizeInput.price <= 0) { setMessage("Please fill in all size fields."); return }
  setSizes((prev) => [...prev, { ...sizeInput }])
  setSizeInput(emptySize())
  setMessage("")
}

  const removeSize = (index: number) => setSizes((prev) => prev.filter((_, i) => i !== index))

  const handleResultFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    setUploadingResult(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((file) => fd.append("files", file))
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.urls?.[0]) setResultImageUrl(data.urls[0])
    } catch { setMessage("Error uploading result image.") }
    finally { setUploadingResult(false); e.target.value = "" }
  }

  const addKeyIngredient = () => {
    if (!keyIngInput.name.trim() || !keyIngInput.benefit.trim()) { setMessage("Enter both ingredient name and benefit."); return }
    setKeyIngredients((prev) => [...prev, { ...keyIngInput }])
    setKeyIngInput({ name: "", benefit: "" }); setMessage("")
  }
  const removeKeyIngredient = (index: number) => setKeyIngredients((prev) => prev.filter((_, i) => i !== index))

  const selectedMainCat = categories.find((c) => c._id === formData.mainCategory)
  const hasSubCategories = (selectedMainCat?.subCategories?.length ?? 0) > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (imageUrls.length === 0) { setMessage("Please add at least one image."); return }
    if (!formData.mainCategory) { setMessage("Please select a main category."); return }
    setLoading(true); setMessage("")
    try {
      const bodyData = {
        name: formData.name, slug: formData.slug, description: formData.description,
        price: Number(formData.price),
        salePercentage: formData.salePercentage ? Number(formData.salePercentage) : undefined,
        image: imageUrls[0], images: imageUrls,
        category: formData.category || undefined,
        mainCategory: formData.mainCategory || undefined,
        company: formData.company, stock: Number(formData.stock), sku: formData.sku,
        amazonUrl: formData.amazonUrl.trim(),
        variantLabel: formData.variantLabel.trim(),                    
        skinTypes: normalizeByNewlineOnly(formData.skinTypes),          
        ingredients: normalizeTextarea(formData.ingredients),
        benefits: normalizeTextarea(formData.benefits),
        suitableFor: normalizeByNewlineOnly(formData.suitableFor),
        usage: formData.usage, isActive: formData.isActive, isBestSeller: formData.isBestSeller, results,
        weight: formData.weight ? Number(formData.weight) : 0.3,
        length: formData.length ? Number(formData.length) : 10,
        breadth: formData.breadth ? Number(formData.breadth) : 10,
        height: formData.height ? Number(formData.height) : 10,
        sizes: sizes.map((s) => ({
          ...s,
          quantity: Number(s.quantity),
          price: Number(s.price),
          discountPrice: s.discountPrice ? Number(s.discountPrice) : undefined,
          stock: Number(s.stock),
          weight: s.weight ? Number(s.weight) : undefined,
          length: s.length ? Number(s.length) : undefined,
          breadth: s.breadth ? Number(s.breadth) : undefined,
          height: s.height ? Number(s.height) : undefined,
        })),
        whyYoullLoveIt: normalizeByNewlineOnly(formData.whyYoullLoveIt),
        fragranceExp: normalizeByNewlineOnly(formData.fragranceExp),
        whoIsItFor: formData.whoIsItFor,
        skinHairConcern: formData.skinHairConcern,
        expectedResults: formData.expectedResults,
        keyIngredients,
        gstPercent: formData.gstPercent ? Number(formData.gstPercent) : undefined,
        hsn: formData.hsn.trim(),
      }
      const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyData) })
      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || "Failed to create product")
      invalidateCache("suggested:products:")
      setMessage("Product created successfully!")
      setTimeout(() => router.push("/admin/products"), 1500)
    } catch (error) {
      setMessage("Error creating product. Please try again.")
      console.error("Error:", error)
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="outline" size="icon" className="border-gray-200 text-gray-500 hover:text-gray-900 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add new product</h1>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to add it to your catalog</p>
            </div>
          </div>
        </div>

        <QuickPasteBox onApply={handleQuickPasteApply} />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic info */}
          <SectionCard icon={Package} title="Basic information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Product Name *</label><Input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter product name" className={inputCls} /></div>
              <div><label className={labelCls}>Slug</label><Input type="text" name="slug" value={formData.slug} onChange={handleChange} placeholder="Auto-generated if empty" className={inputCls} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required className={selectCls}>
                  <option value="">Select Company</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Main Category *</label>
                <select name="mainCategory" value={formData.mainCategory} onChange={handleChange} required disabled={!formData.company} className={selectCls}>
                  <option value="">{formData.company ? "Select Main Category" : "Select company first"}</option>
                  {categories.filter((c) => !c.parent).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sub Category {hasSubCategories ? "*" : ""}</label>
                <select name="category" value={formData.category} onChange={handleChange} required={hasSubCategories} disabled={!hasSubCategories} className={selectCls}>
                  <option value="">{hasSubCategories ? "Select Sub Category" : "No sub categories"}</option>
                  {selectedMainCat?.subCategories?.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                </select>
                {formData.mainCategory && !hasSubCategories && <p className="text-xs text-gray-400 mt-1">Will save under: <strong className="text-gray-600">{selectedMainCat?.name}</strong></p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Description (short intro text)</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Enter product description" rows={4} className={textareaCls} />
            </div>
          </SectionCard>

          {/* Collection variant details */}
<SectionCard icon={Tag} title="Collection variant details" subtitle="Powers the label shown on collection pages (e.g. 'Tulsi & Peach — For Sensitive, Dry skin')">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className={labelCls}>Variant Label</label>
      <Input
        type="text"
        name="variantLabel"
        value={formData.variantLabel}
        onChange={handleChange}
        placeholder="e.g. Tulsi & Peach"
        className={inputCls}
      />
      <p className="text-xs text-gray-400 mt-1">Shown above the product card on collection pages. Leave blank to hide.</p>
    </div>
    <div>
      <label className={labelCls}>Skin Types <span className="font-normal normal-case text-gray-400">(one per line)</span></label>
      <textarea
        name="skinTypes"
        value={formData.skinTypes}
        onChange={handleChange}
        placeholder={"Sensitive\nDry"}
        rows={2}
        className={textareaCls}
      />
      <p className="text-xs text-gray-400 mt-1">Shown as "For Sensitive, Dry skin" under the variant label.</p>
    </div>
  </div>
</SectionCard>

          {/* Pricing & stock */}
          <SectionCard icon={Tag} title="Pricing & stock">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div><label className={labelCls}>Price (₹) *</label><Input type="number" name="price" value={formData.price} onChange={handleChange} required placeholder="0" className={inputCls} /></div>
  <div>
    <label className={labelCls}>Direct Sale %</label>
    <Input type="number" min={0} max={100} name="salePercentage" value={formData.salePercentage} onChange={handleChange} placeholder="0" className={inputCls} />
    <p className="text-xs text-gray-400 mt-1">Optional. A later collection sale can still override this if applied more recently.</p>
  </div>
  <div><label className={labelCls}>Stock *</label><Input type="number" name="stock" value={formData.stock} onChange={handleChange} required placeholder="0" className={inputCls} /></div>
  <div>
    <label className={labelCls}>Weight (kg) *</label>
    <Input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} required placeholder="0.3" className={inputCls} />
    <p className="text-xs text-gray-400 mt-1">Used for shipping cost calculation</p>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div>
    <label className={labelCls}>Length (cm) *</label>
    <Input type="number" step="0.1" name="length" value={formData.length} onChange={handleChange} required placeholder="10" className={inputCls} />
  </div>
  <div>
    <label className={labelCls}>Breadth (cm) *</label>
    <Input type="number" step="0.1" name="breadth" value={formData.breadth} onChange={handleChange} required placeholder="10" className={inputCls} />
  </div>
  <div>
    <label className={labelCls}>Height (cm) *</label>
    <Input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} required placeholder="10" className={inputCls} />
  </div>
</div>
<p className="text-xs text-gray-400 -mt-3">Actual packed box dimensions — used to calculate volumetric weight for accurate shipping quotes.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>GST % *</label>
                <Input type="number" step="0.01" name="gstPercent" value={formData.gstPercent} onChange={handleChange} required placeholder="18" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Price above already includes this GST %</p>
              </div>
              <div>
                <label className={labelCls}>HSN Code *</label>
                <Input type="text" name="hsn" value={formData.hsn} onChange={handleChange} required placeholder="3401" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Required for Shiprocket invoice tax breakdown</p>
              </div>
            </div>

            <div>
             <label className={labelCls}>SKU *</label>
<Input type="text" name="sku" value={formData.sku} onChange={handleChange} required placeholder="SKU-001" className={inputCls} />
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
              <label className={labelCls}>Amazon product link (optional)</label>
              <Input
                type="url"
                name="amazonUrl"
                value={formData.amazonUrl}
                onChange={handleChange}
                placeholder="https://www.amazon.in/dp/XXXXXXXXXX"
                className="bg-white border-gray-200 focus-visible:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                If set, a "Buy on Amazon" button will appear on this product's page.
              </p>
            </div>
          </SectionCard>

          {/* Images */}
          <SectionCard icon={ImageIcon} title="Product images">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors">
                <div className="text-center"><Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" /><p className="text-sm font-medium text-gray-700">Upload from machine</p><p className="text-xs text-gray-400">PNG, JPG up to 5MB</p></div>
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
              <div>
                <label className={labelCls}>Add image URL</label>
                <div className="flex gap-2">
                  <Input type="url" placeholder="https://example.com/image.jpg" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className={`${inputCls} flex-1`} />
                  <Button type="button" onClick={() => { if (imageUrlInput.trim()) { setImageUrls((prev) => [...prev, imageUrlInput.trim()]); setImageUrlInput("") } }} variant="outline" className="border-gray-200">Add</Button>
                </div>
              </div>
            </div>
            {uploading && <p className="text-sm text-gray-400">Uploading...</p>}
            {imageUrls.length > 0 && (
              <div>
                <label className={labelCls}>Added images ({imageUrls.length})</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <Image src={url} alt={`Product ${index + 1}`} fill className="object-cover" />
                        {index === 0 && <div className="absolute top-1 left-1 bg-emerald-700 text-white text-xs px-2 py-0.5 rounded-full">Main</div>}
                      </div>
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

         {/* Sizes */}
<SectionCard icon={Tag} title="Product sizes" subtitle="Optional — each size can have its own price, stock, and shipping">
  <SizeForm
    value={sizeInput}
    onChange={setSizeInput}
    onSubmit={handleAddSize}
  />
  {sizes.length > 0 && (
    <div>
      <label className={labelCls}>Added sizes ({sizes.length})</label>
      <div className="space-y-2">
        {sizes.map((size, index) => (
          <SizeCard key={index} size={size} onRemove={() => removeSize(index)} />
        ))}
      </div>
    </div>
  )}
</SectionCard>

          {/* Ingredients & usage */}
          <SectionCard icon={FlaskConical} title="Ingredients & usage">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Ingredients (one per line)</label><textarea name="ingredients" value={formData.ingredients} onChange={handleChange} placeholder={"Aloe Vera\nShea Butter\nKojic Acid"} rows={4} className={textareaCls} /></div>
              <div><label className={labelCls}>Benefits (one per line)</label><textarea name="benefits" value={formData.benefits} onChange={handleChange} placeholder={"Moisturizes skin\nReduces dark spots"} rows={4} className={textareaCls} /></div>
            </div>
            <div><label className={labelCls}>Usage instructions</label><textarea name="usage" value={formData.usage} onChange={handleChange} placeholder="Enter usage instructions" rows={3} className={textareaCls} /></div>
          </SectionCard>

          {/* Product detail sections */}
          <SectionCard icon={Sparkles} title="Product detail sections" subtitle="These appear on the product page below the name">
            <div>
              <label className={labelCls}>Why You'll Love It <span className="font-normal normal-case text-gray-400">(one point per line)</span></label>
              <textarea name="whyYoullLoveIt" value={formData.whyYoullLoveIt} onChange={handleChange} placeholder={"Refreshing cooling sensation for oily skin\nHelps maintain skin freshness all day\nPremium handmade soap with botanical extracts"} rows={4} className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>Suitable For <span className="font-normal normal-case text-gray-400">(one per line — shown as pills)</span></label>
              <textarea name="suitableFor" value={formData.suitableFor} onChange={handleChange} placeholder={"Oily Skin\nCombination Skin\nAcne-Prone Skin"} rows={3} className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>Fragrance Experience <span className="font-normal normal-case text-gray-400">(one per line — shown as pills)</span></label>
              <textarea name="fragranceExp" value={formData.fragranceExp} onChange={handleChange} placeholder={"Cool\nFresh\nRevitalizing"} rows={3} className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>Who Is This For?</label>
              <textarea name="whoIsItFor" value={formData.whoIsItFor} onChange={handleChange} placeholder="e.g. Oily skin, combination skin, and acne-prone skin seeking cooling freshness." rows={2} className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>Skin / Hair Concern It Addresses</label>
              <textarea name="skinHairConcern" value={formData.skinHairConcern} onChange={handleChange} placeholder="e.g. Excess oil, skin imbalance, clogged pores, and warm-weather skin fatigue." rows={2} className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>What Results To Expect</label>
              <textarea name="expectedResults" value={formData.expectedResults} onChange={handleChange} placeholder="e.g. Skin feels purified, cool, and balanced after each wash." rows={2} className={textareaCls} />
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
              <label className={labelCls}>How key ingredients help</label>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-400 mb-1">Ingredient Name</label><Input placeholder="e.g. Peppermint Essential Oil" value={keyIngInput.name} onChange={(e) => setKeyIngInput((prev) => ({ ...prev, name: e.target.value }))} className={`${inputCls} text-sm`} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Benefit</label><Input placeholder="e.g. Cooling and oil-control skin care" value={keyIngInput.benefit} onChange={(e) => setKeyIngInput((prev) => ({ ...prev, benefit: e.target.value }))} className={`${inputCls} text-sm`} /></div>
                </div>
                <Button type="button" onClick={addKeyIngredient} variant="outline" size="sm" className="w-full border-gray-200"><Plus className="w-4 h-4 mr-1" />Add ingredient</Button>
                {keyIngredients.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {keyIngredients.map((ing, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <div className="text-sm flex-1"><span className="font-medium text-gray-900">{ing.name}</span><span className="text-gray-400"> — {ing.benefit}</span></div>
                        <button type="button" onClick={() => removeKeyIngredient(i)} className="text-gray-400 hover:text-red-600 transition shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Results */}
          <SectionCard icon={ImageIcon} title="Product results">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-3">
              <div><label className={labelCls}>Result Title</label><Input type="text" placeholder="e.g., Brightening Results" value={resultInput.title} onChange={(e) => setResultInput({ ...resultInput, title: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Result Description</label><textarea placeholder="Describe the result" value={resultInput.text} onChange={(e) => setResultInput({ ...resultInput, text: e.target.value })} rows={2} className={textareaCls} /></div>
              <div>
                <label className={labelCls}>Result image</label>
                <div className="flex gap-2">
                  <Input type="url" placeholder="https://example.com/image.jpg" value={resultImageUrl} onChange={(e) => setResultImageUrl(e.target.value)} className={`${inputCls} flex-1`} />
                  <Button type="button" onClick={() => { if (!resultInput.title.trim()) { setMessage("Please enter a result title."); return } setResults([...results, { image: resultImageUrl.trim(), title: resultInput.title, text: resultInput.text }]); setResultInput({ image: "", title: "", text: "" }); setResultImageUrl(""); setMessage("") }} variant="outline" className="border-gray-200">Add result</Button>
                </div>
                {resultImageUrl && <div className="relative h-20 w-32 rounded-lg overflow-hidden border border-gray-200 mt-2"><Image src={resultImageUrl} alt="Result preview" fill className="object-cover" /></div>}
                <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition mt-2">
                  <div className="text-center"><Upload className="w-4 h-4 mx-auto mb-1 text-gray-400" /><p className="text-xs font-medium text-gray-700">Upload image</p></div>
                  <input type="file" accept="image/*" onChange={handleResultFileUpload} disabled={uploadingResult} className="hidden" />
                </label>
              </div>
            </div>
            {results.length > 0 && (
              <div>
                <label className={labelCls}>Added results ({results.length})</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((result, index) => (
                    <div key={index} className="relative group border border-gray-200 rounded-lg p-3 bg-white">
                      {result.image && <div className="relative h-24 bg-gray-100 rounded mb-2 overflow-hidden"><Image src={result.image} alt={result.title} fill className="object-cover" /></div>}
                      <h4 className="font-medium text-sm text-gray-900">{result.title}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{result.text}</p>
                      <button type="button" onClick={() => setResults(results.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Active + submit */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4 accent-emerald-700" />
                <label className="text-sm font-medium text-gray-900">Active</label>
              </div>
              <div className="flex items-center gap-2.5">
                <input type="checkbox" name="isBestSeller" checked={formData.isBestSeller} onChange={handleChange} className="w-4 h-4 accent-emerald-700" />
                <label className="text-sm font-medium text-gray-900">Best Seller</label>
              </div>
            </div>
            {message && (
              <div className={`px-3 py-2 rounded-lg text-sm ${message.includes("successfully") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 h-11">
            {loading ? "Creating..." : "Create product"}
          </Button>
        </form>
      </div>
    </main>
  )
}