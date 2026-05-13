// app/blog/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  excerpt: string
  image: string
  author: { name: string }
  company: { name: string; slug: string }
  tags: string[]
  createdAt: string
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs")
      if (!res.ok) throw new Error("Failed to fetch blogs")
      const data = await res.json()
      setBlogs(data)
      setFilteredBlogs(data)
      const tags = new Set<string>()
      data.forEach((blog: Blog) => {
        blog.tags?.forEach((tag) => tags.add(tag))
      })
      setAllTags(Array.from(tags))
    } catch (error) {
      console.error("Error fetching blogs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
    setFilteredBlogs(filtered)
  }, [searchTerm, selectedTag, blogs])

  if (loading) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg">Loading blogs...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-10">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[--color-text-heading] mb-4">Nezal Blog</h1>
          <p className="text-lg text-[--color-text-body] max-w-2xl mx-auto">
            Expert tips, product reviews, and natural skincare advice from our specialists
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-10 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[--color-text-muted]" />
            <Input
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-[--color-border] rounded-xl focus-visible:ring-[--color-brand-primary]"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
                className={`rounded-full ${
                  selectedTag === null
                    ? "bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white"
                    : "border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream]"
                }`}
              >
                All
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full ${
                    selectedTag === tag
                      ? "bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white"
                      : "border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream]"
                  }`}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Blog Grid */}
        {filteredBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <Link key={blog._id} href={`/blog/${blog.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full border border-[--color-border] rounded-2xl bg-white">
                  <div className="relative h-48 bg-[--color-bg-cream] overflow-hidden rounded-t-2xl">
                    {blog.image ? (
                      <Image
                        src={blog.image || "/companylogo.png"}
                        alt={blog.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[--color-text-muted]">
                        No image
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <h3 className="font-semibold text-[--color-text-heading] line-clamp-2 hover:text-[--color-brand-primary] transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-[--color-text-muted] mt-2">{blog.company.name}</p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-[--color-text-body] line-clamp-2">{blog.excerpt}</p>

                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {blog.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[--color-brand-primary]/10 text-[--color-brand-primary] px-2 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-[--color-text-muted] pt-2">
                      <span>{blog.author?.name}</span>
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[--color-text-muted]">No blogs found matching your criteria.</p>
          </div>
        )}
      </div>
    </main>
  )
}