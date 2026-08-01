// app/admin/blogs/add/page.tsx
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImageUploadField } from "@/components/admin/image-upload-field"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { ArrowLeft, Newspaper, Building2, Tag } from "lucide-react"

interface Company {
  _id: string
  name: string
}

const selectClass =
  "w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"

export default function AddBlogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    image: "",
    tags: "",
    isPublished: false,
    company: "", // will hold companyId
  })

  useEffect(() => {
    // fetch companies for the dropdown
    fetchCompanies()
  }, [])

  if (!session) {
    return null
  }

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies")
      if (!res.ok) throw new Error("Failed to fetch companies")
      const data = await res.json()
      setCompanies(data)
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPublished: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Content lives in a contentEditable div, not a native form field, so
    // the browser's built-in "required" validation can't see it — check manually.
    if (!formData.content || !formData.content.replace(/<[^>]+>/g, "").trim()) {
      alert("Content is required")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error("Failed to create blog: " + text)
      }

      router.push("/admin/blogs")
    } catch (error) {
      console.error("Error creating blog:", error)
      alert("Failed to create blog")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <Link href="/admin/blogs">
          <Button variant="ghost" className="-ml-2 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to blogs
          </Button>
        </Link>

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add blog</h1>
            <p className="text-sm text-gray-500 mt-0.5">Write a new article for your storefront.</p>
          </div>
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Title *
                </label>
                <Input name="title" value={formData.title} onChange={handleChange} placeholder="Blog title" required />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Slug *
                </label>
                <Input name="slug" value={formData.slug} onChange={handleChange} placeholder="blog-slug" required className="font-mono" />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placement</span>
              </div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Company *</label>
              <select
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={selectClass}
                required
              >
                <option value="">Select a company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Excerpt <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <Textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="A short description shown in blog previews"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Content *
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                placeholder="Write the blog post, or paste it in from Word or Google Docs..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Cover image
              </label>
              <ImageUploadField
                label=""
                value={formData.image}
                onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
                folder="blogs"
                required={false}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                Tags <span className="font-normal normal-case text-gray-400">(comma-separated)</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="skincare, tips, tutorial"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
              <Switch checked={formData.isPublished} onCheckedChange={handleToggle} />
              <div>
                <p className="text-sm font-medium text-gray-800">Publish immediately</p>
                <p className="text-xs text-gray-400">Otherwise this is saved as a draft</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link href="/admin/blogs">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]">
                {loading ? "Creating..." : "Create blog"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}