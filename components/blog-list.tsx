"use client"

// components/blog-list.tsx
//
// The /blog grid with client-side search and tag filtering. The posts come
// from the server (app/blog/page.tsx), so the list is in the initial HTML —
// no fetch, no loading state.

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import type { BlogCard } from "@/lib/blog-data"

export function BlogList({ blogs }: { blogs: BlogCard[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    blogs.forEach((blog) => {
      blog.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }, [blogs])

  const filteredBlogs = useMemo(() => {
    let filtered = blogs
    if (searchTerm) {
      filtered = filtered.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (selectedTag) {
      filtered = filtered.filter((blog) => blog.tags?.includes(selectedTag))
    }
    return filtered
  }, [searchTerm, selectedTag, blogs])

  return (
    <main className="min-h-screen" style={{ background: "#f4f9f4" }}>
      {/* Hero */}
      <section className="border-b" style={{ background: "#fff", borderColor: "#d4e8d0" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4"
            style={{ background: "#e8f4ec", color: "#2d6a4f" }}
          >
            From Our Journal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#1a3a2a", letterSpacing: "-0.02em" }}>
            Nezal Blogs
          </h1>
         
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-5">
        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9aaa9a" }} />
          <input
            placeholder="Search blogs…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-shadow focus:ring-2"
            style={{ background: "#fff", border: "1px solid #d4e8d0", color: "#1a3a2a" }}
          />
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap  justify-center gap-2 mb-12">
            <button
              onClick={() => setSelectedTag(null)}
              className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
              style={
                selectedTag === null
                  ? { background: "#1a3a2a", color: "#fff" }
                  : { background: "#fff", color: "#3d5c45", border: "1px solid #d4e8d0" }
              }
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                style={
                  selectedTag === tag
                    ? { background: "#1a3a2a", color: "#fff" }
                    : { background: "#fff", color: "#3d5c45", border: "1px solid #d4e8d0" }
                }
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Blog Grid */}
        {filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <Link key={blog._id} href={`/blog/${blog.slug}`} className="group">
                <div
                  className="h-full rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
                  style={{ background: "#fff", border: "1px solid #eaf0ea", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden" style={{ background: "#e8f2e4" }}>
                    {blog.image ? (
                      <img
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                        // also catches a failure that happened before hydration attached onError
                        ref={(img) => {
                          if (img && img.complete && img.naturalWidth === 0) img.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">🌿</span>
                        <span className="text-xs font-medium" style={{ color: "#7a9a7d" }}>
                          Nezal Journal
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <p className="text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: "#2d6a4f" }}>
                      {blog.company?.name}
                    </p>
                    <h3
                      className="font-bold text-base leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[#2d6a4f]"
                      style={{ color: "#1a2e1a" }}
                    >
                      {blog.title}
                    </h3>
                    <p className="text-sm line-clamp-2 mb-4" style={{ color: "#6b7c6b" }}>
                      {blog.excerpt}
                    </p>

                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {blog.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#e8f4ec", color: "#2d6a4f" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className="flex justify-between items-center text-xs pt-3"
                      style={{ borderTop: "1px solid #f0f4f0", color: "#9aaa9a" }}
                    >
                      <span className="font-medium">{blog.author?.name}</span>
                      <span>
                        {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          // fixed zone so the server render and hydration agree
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: "#e8f4ec" }}
            >
              🌿
            </div>
            <p style={{ color: "#6b7c6b" }}>No blogs found matching your criteria.</p>
          </div>
        )}
      </div>
    </main>
  )
}