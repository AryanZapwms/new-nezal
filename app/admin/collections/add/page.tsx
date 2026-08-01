"use client"
// app/admin/collections/add/page.tsx

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, X, Upload, Plus, GripVertical } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface KeyIngredient { name: string; benefit: string; icon?: string }
interface RitualStep { step: number; label: string; description: string; linkedCollectionSlug?: string }
interface FAQItem { question: string; answer: string }
interface CollectionLite { _id: string; name: string; slug: string }

const NAV_CATEGORIES = ["face-care", "body-care", "hair-care", "gift-kits"]
const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  "face-care": ["face-care"],
  "body-care": ["soaps", "body-care", "bath-shower", "massage-oil"],
  "hair-care": ["hair-care"],
  "gift-kits": ["gift-kits"],
}
const LABELS: Record<string, string> = {
  "face-care": "Face Care", "body-care": "Body Care", "hair-care": "Hair Care",
  "gift-kits": "Gift Kits", "soaps": "Soaps", "bath-shower": "Bath & Shower", "massage-oil": "Massage Oil",
}

export default function AddCollectionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [tagline, setTagline] = useState("")
  const [navCategory, setNavCategory] = useState("face-care")
  const [subCategory, setSubCategory] = useState("face-care")
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  const [heroImage, setHeroImage] = useState("")
  const [heroHeadline, setHeroHeadline] = useState("")
  const [heroSubheadline, setHeroSubheadline] = useState("")
  const [storyText, setStoryText] = useState("")

  const [keyIngredients, setKeyIngredients] = useState<KeyIngredient[]>([])
  const [ingredientInput, setIngredientInput] = useState({ name: "", benefit: "", icon: "" })

  const [concerns, setConcerns] = useState("")

  const [ritualSteps, setRitualSteps] = useState<RitualStep[]>([])
  const [stepInput, setStepInput] = useState({ label: "", description: "", linkedCollectionSlug: "" })

  const [faq, setFaq] = useState<FAQItem[]>([])
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" })

  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [metaKeywords, setMetaKeywords] = useState("")

  const [allCollections, setAllCollections] = useState<CollectionLite[]>([])
  const [relatedCollections, setRelatedCollections] = useState<string[]>([])
  const [relatedSearch, setRelatedSearch] = useState("")

  useEffect(() => {
    if (!session) { router.push("/auth/login"); return }
    fetch("/api/admin/collections")
      .then((res) => res.json())
      .then((data) => setAllCollections((data.collections || []).map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug }))))
      .catch(() => {})
  }, [session])

  useEffect(() => {
    if (!slug && name) {
      setSlug(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    }
  }, [name, slug])

  useEffect(() => {
    const options = SUBCATEGORY_OPTIONS[navCategory] || []
    if (!options.includes(subCategory)) setSubCategory(options[0])
  }, [navCategory])

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
    } catch { setMessage("Error uploading image.") }
    finally { setUploading(false); e.target.value = "" }
  }

  const addIngredient = () => {
    if (!ingredientInput.name.trim() || !ingredientInput.benefit.trim()) {
      setMessage("Ingredient name and benefit are required."); return
    }
    setKeyIngredients((prev) => [...prev, { ...ingredientInput }])
    setIngredientInput({ name: "", benefit: "", icon: "" })
    setMessage("")
  }
  const removeIngredient = (idx: number) => setKeyIngredients((prev) => prev.filter((_, i) => i !== idx))

  const addStep = () => {
    if (!stepInput.label.trim()) { setMessage("Step label is required."); return }
    setRitualSteps((prev) => [...prev, { step: prev.length + 1, ...stepInput }])
    setStepInput({ label: "", description: "", linkedCollectionSlug: "" })
    setMessage("")
  }
  const removeStep = (idx: number) => {
    setRitualSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })))
  }

  const addFaq = () => {
    if (!faqInput.question.trim() || !faqInput.answer.trim()) {
      setMessage("FAQ question and answer are required."); return
    }
    setFaq((prev) => [...prev, { ...faqInput }])
    setFaqInput({ question: "", answer: "" })
    setMessage("")
  }
  const removeFaq = (idx: number) => setFaq((prev) => prev.filter((_, i) => i !== idx))

  const toggleRelated = (colSlug: string) => {
    setRelatedCollections((prev) => prev.includes(colSlug) ? prev.filter((s) => s !== colSlug) : [...prev, colSlug])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) { setMessage("Name and slug are required."); return }
    setLoading(true); setMessage("")
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, tagline, navCategory, subCategory, sortOrder, isActive,
          heroImage, heroHeadline, heroSubheadline, storyText,
          keyIngredients,
          concerns: concerns.split("\n").map((s) => s.trim()).filter(Boolean),
          ritualSteps,
          relatedCollections,
          faq,
          seoTitle, seoDescription,
          metaKeywords: metaKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create collection")
      setMessage("Collection created successfully!")
      setTimeout(() => router.push("/admin/collections"), 1200)
    } catch (err: any) {
      setMessage(err.message || "Error creating collection.")
    } finally { setLoading(false) }
  }

  const filteredRelated = allCollections.filter((c) =>
    c.slug !== slug && c.name.toLowerCase().includes(relatedSearch.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/admin/collections">
          <Button variant="ghost" className="mb-6 bg-transparent"><ArrowLeft className="w-4 h-4 mr-2" />Back to Collections</Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-8">Add New Collection</h1>

        <Card>
          <CardHeader><CardTitle>Collection Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Turmeric Glow" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Slug *</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="turmeric-glow" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tagline (shown on cards)</label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short one-liner" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nav Category *</label>
                  <select value={navCategory} onChange={(e) => setNavCategory(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background">
                    {NAV_CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sub Category *</label>
                  <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background">
                    {(SUBCATEGORY_OPTIONS[navCategory] || []).map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sort Order</label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hero Image</label>
                <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/50">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Paste Image URL</label>
                    <div className="flex gap-2">
                      <Input type="url" placeholder="https://example.com/image.jpg" value={heroImage} onChange={(e) => setHeroImage(e.target.value)} className="flex-1" />
                      {heroImage && <Button type="button" variant="outline" size="sm" onClick={() => setHeroImage("")}><X className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-border" />
                  </div>
                  <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition">
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-medium">{uploading ? "Uploading..." : "Upload from device"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleHeroUpload} disabled={uploading} className="hidden" />
                  </label>
                  {heroImage && (
                    <div className="relative h-32 w-full rounded-lg overflow-hidden border border-border">
                      <Image src={heroImage} alt="Hero preview" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hero Headline</label>
                <Input value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Main heading on the collection page" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Subheadline</label>
                <Input value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Story Text</label>
                <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={3} className="w-full px-3 py-2 border border-border rounded-md bg-background" />
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-4 py-3 border-b"><h2 className="text-sm font-semibold">Key Ingredients</h2></div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input value={ingredientInput.name} onChange={(e) => setIngredientInput((p) => ({ ...p, name: e.target.value }))} placeholder="Ingredient name" />
                    <Input value={ingredientInput.benefit} onChange={(e) => setIngredientInput((p) => ({ ...p, benefit: e.target.value }))} placeholder="Benefit" />
                    <Input value={ingredientInput.icon} onChange={(e) => setIngredientInput((p) => ({ ...p, icon: e.target.value }))} placeholder="Icon URL (optional)" />
                  </div>
                  <Button type="button" onClick={addIngredient} variant="outline" size="sm" className="w-full"><Plus className="w-4 h-4 mr-1" />Add Ingredient</Button>
                  {keyIngredients.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {keyIngredients.map((ing, i) => (
                        <div key={i} className="flex items-start gap-3 bg-background border rounded-lg px-3 py-2">
                          <div className="flex-1 text-sm">
                            <span className="font-bold">{ing.name}</span>
                            <p className="text-muted-foreground text-xs mt-0.5">{ing.benefit}</p>
                          </div>
                          <button type="button" onClick={() => removeIngredient(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Concerns <span className="text-muted-foreground font-normal">(one per line, matches concern slugs)</span></label>
                <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} rows={3} className="w-full px-3 py-2 border border-border rounded-md bg-background" placeholder={"acne\npigmentation\ndryness"} />
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-4 py-3 border-b"><h2 className="text-sm font-semibold">Ritual Steps ("How to Use")</h2></div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input value={stepInput.label} onChange={(e) => setStepInput((p) => ({ ...p, label: e.target.value }))} placeholder="Step label, e.g. Cleanse" />
                    <Input value={stepInput.description} onChange={(e) => setStepInput((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                    <select value={stepInput.linkedCollectionSlug} onChange={(e) => setStepInput((p) => ({ ...p, linkedCollectionSlug: e.target.value }))} className="px-3 py-2 border border-border rounded-md bg-background text-sm">
                      <option value="">Link to collection (optional)</option>
                      {allCollections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                  <Button type="button" onClick={addStep} variant="outline" size="sm" className="w-full"><Plus className="w-4 h-4 mr-1" />Add Step</Button>
                  {ritualSteps.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {ritualSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 bg-background border rounded-lg px-3 py-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 text-sm">
                            <span className="font-bold">{step.step}. {step.label}</span>
                            {step.description && <p className="text-muted-foreground text-xs mt-0.5">{step.description}</p>}
                            {step.linkedCollectionSlug && <p className="text-xs text-primary mt-0.5">→ {step.linkedCollectionSlug}</p>}
                          </div>
                          <button type="button" onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-4 py-3 border-b"><h2 className="text-sm font-semibold">Related Collections ("Complete Your Ritual")</h2></div>
                <div className="p-4 space-y-3">
                  <Input value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)} placeholder="Search collections to link..." />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredRelated.map((c) => (
                      <label key={c.slug} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                        <input type="checkbox" checked={relatedCollections.includes(c.slug)} onChange={() => toggleRelated(c.slug)} className="w-4 h-4" />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-4 py-3 border-b"><h2 className="text-sm font-semibold">FAQ</h2></div>
                <div className="p-4 space-y-3">
                  <Input value={faqInput.question} onChange={(e) => setFaqInput((p) => ({ ...p, question: e.target.value }))} placeholder="Question" />
                  <textarea value={faqInput.answer} onChange={(e) => setFaqInput((p) => ({ ...p, answer: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-border rounded-md bg-background" placeholder="Answer" />
                  <Button type="button" onClick={addFaq} variant="outline" size="sm" className="w-full"><Plus className="w-4 h-4 mr-1" />Add FAQ</Button>
                  {faq.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {faq.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 bg-background border rounded-lg px-3 py-2">
                          <div className="flex-1 text-sm">
                            <span className="font-bold">{f.question}</span>
                            <p className="text-muted-foreground text-xs mt-0.5">{f.answer}</p>
                          </div>
                          <button type="button" onClick={() => removeFaq(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-4 py-3 border-b"><h2 className="text-sm font-semibold">SEO</h2></div>
                <div className="p-4 space-y-3">
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO Title" />
                  <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-md bg-background" placeholder="SEO Description" />
                  <Input value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} placeholder="Meta keywords, comma separated" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
                <label className="text-sm font-medium">Active (visible on site)</label>
              </div>

              {message && (
                <div className={`p-3 rounded text-sm ${message.includes("successfully") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message}</div>
              )}

              <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create Collection"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}