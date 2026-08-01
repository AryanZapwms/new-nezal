// app/admin/blogs/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Newspaper, Trash2, Edit2, Eye, Plus, RefreshCw } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  excerpt: string
  author?: { name: string }
  company?: { name: string }
  isPublished: boolean
  createdAt: string
}

export default function AdminBlogsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    fetchBlogs()
  }, [session, router])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/blogs?all=true")
      if (!res.ok) throw new Error("Failed to fetch blogs")
      const data = await res.json()
      setBlogs(data)
    } catch (error) {
      console.error("Error fetching blogs:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBlog = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return

    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete blog")
      await fetchBlogs()
    } catch (error) {
      console.error("Error deleting blog:", error)
      alert("Failed to delete blog")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading blogs...
        </div>
      </main>
    )
  }

  const publishedCount = blogs.filter((b) => b.isPublished).length
  const draftCount = blogs.length - publishedCount

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
              <p className="text-sm text-gray-500 mt-0.5">Write and manage articles for your storefront.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchBlogs}
              className="border-gray-200 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            <Link href="/admin/blogs/add">
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Add blog
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total posts", value: blogs.length, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Published", value: publishedCount, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Drafts", value: draftCount, color: "text-amber-700", dot: "bg-amber-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">All blogs</h2>
            <span className="text-xs text-gray-400">{blogs.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Author</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Newspaper className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No blogs yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first blog post to get started.</p>
                    </td>
                  </tr>
                ) : (
                  blogs.map((blog) => (
                    <tr key={blog._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <p className="font-medium text-sm text-gray-900 max-w-xs truncate">{blog.title}</p>
                      </td>
                      <td className="py-3.5 px-3 text-sm text-gray-600">{blog.company?.name || "—"}</td>
                      <td className="py-3.5 px-3 text-sm text-gray-600">{blog.author?.name || "—"}</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          blog.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${blog.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {blog.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-gray-400">
                        {new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex gap-1.5 justify-end">
                          <Link href={`/admin/blogs/${blog.slug}/edit`}>
                            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-emerald-700" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/blog/${blog.slug}`} target="_blank">
                            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-blue-700" title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="ghost" onClick={() => deleteBlog(blog.slug)} className="text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}