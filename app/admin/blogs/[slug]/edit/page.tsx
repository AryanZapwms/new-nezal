// app/admin/blogs/[slug]/edit/page.tsx
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
import { ArrowLeft, Newspaper, Building2, Tag, Trash2, Loader2 } from "lucide-react"

interface Company {
  _id: string
  name: string
}

interface BlogData {
  _id: string
  title: string
  slug: string
  excerpt: string
  content: string
  image?: string
  tags?: string[] | string
  isPublished: boolean
  company?: { _id: string; name?: string } | string
}

const selectClass =
  "w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"

export default function EditBlogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    image: "",
    tags: "",
    isPublished: false,
    company: "", // companyId
  })

  // get slug from URL: /admin/blogs/[slug]/edit
  const [slug, setSlug] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const parts = window.location.pathname.split("/").filter(Boolean) // ["admin","blogs","slug","edit"]
    const maybeSlug = parts.length >= 3 ? parts[parts.length - 2] : null
    setSlug(maybeSlug)
  }, [])

  useEffect(() => {
    if (!session) return
    if (!slug) return
    fetchInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, slug])

  const fetchInitial = async () => {
    setLoading(true)
    try {
      const [companiesRes, blogRes] = await Promise.all([
        fetch("/api/companies"),
        fetch(`/api/blogs/${slug}`),
      ])

      if (!companiesRes.ok) throw new Error("Failed to fetch companies")
      if (!blogRes.ok) throw new Error("Failed to fetch blog")

      const companiesData = await companiesRes.json()
      const blogData: BlogData = await blogRes.json()

      setCompanies(companiesData || [])

      setFormData({
        title: blogData.title || "",
        slug: blogData.slug || "",
        excerpt: blogData.excerpt || "",
        content: blogData.content || "",
        image: typeof blogData.image === "string" ? blogData.image : "",
        tags: Array.isArray(blogData.tags) ? blogData.tags.join(", ") : (blogData.tags as string) || "",
        isPublished: !!blogData.isPublished,
        company:
          typeof blogData.company === "string"
            ? blogData.company
            : blogData.company?.["_id"] || (blogData.company as any) || "",
      })
    } catch (error) {
      console.error("Error loading edit page:", error)
      alert("Failed to load blog data")
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null
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
    if (!slug) {
      alert("Missing slug")
      return
    }

    // Content lives in a contentEditable div, not a native form field, so
    // the browser's built-in "required" validation can't see it — check manually.
    if (!formData.content || !formData.content.replace(/<[^>]+>/g, "").trim()) {
      alert("Content is required")
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/blogs/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error("Failed to update blog: " + text)
      }

      router.push("/admin/blogs")
    } catch (error) {
      console.error("Error updating blog:", error)
      alert("Failed to update blog")
    } finally {
      setSaving(false)
    }
  }

  const deleteBlog = async () => {
    if (!slug) return
    if (!confirm("Are you sure you want to delete this blog?")) return
    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      router.push("/admin/blogs")
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete blog")
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit blog</h1>
              <p className="text-sm text-gray-500 mt-0.5">Update the article and its publish status.</p>
            </div>
          </div>
          {!loading && (
            <Button
              variant="outline"
              onClick={deleteBlog}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-16">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading blog...
            </div>
          ) : (
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
                <Button type="submit" disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]">
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}