// app/blog/[slug]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, ArrowLeft, Calendar, User, Tag } from "lucide-react"

interface Blog {
  _id: string
  title: string
  slug: string
  content: string
  excerpt: string
  image: string
  author: { name: string; email: string }
  company: { name: string; slug: string }
  tags: string[]
  createdAt: string
}

export default function BlogDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [blog, setBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`/api/blogs/${slug}`)
        if (!res.ok) throw new Error("Failed to fetch blog")
        const data = await res.json()
        setBlog(data)
      } catch (error) {
        console.error("Error fetching blog:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlog()
  }, [slug])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog?.title,
        text: blog?.excerpt,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg">Loading blog...</p>
      </main>
    )
  }

  if (!blog) {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[--color-text-muted] mb-4">Blog not found</p>
          <Link href="/blog">
            <Button className="bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white">
              Back to Blogs
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-8 md:py-10">
        {/* Back navigation */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-medium mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <article className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-sm text-[--color-text-muted] mb-4 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {blog.author?.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="font-medium text-[--color-brand-primary]">{blog.company.name}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-[--color-text-heading] mb-4 leading-tight">
              {blog.title}
            </h1>

            <div className="flex items-center justify-between flex-wrap gap-3">
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag) => (
                    <Link key={tag} href={`/blog?tag=${tag}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-[--color-border] text-[--color-text-body] hover:text-[--color-brand-primary] hover:border-[--color-brand-primary] text-xs"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream] rounded-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Featured Image */}
          {blog.image && !imageError ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 bg-[--color-bg-cream]">
              <Image
                src={blog.image}
                alt={blog.title}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
          ) : blog.image ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 bg-[--color-bg-cream] flex items-center justify-center">
              <p className="text-[--color-text-muted]">Image failed to load</p>
            </div>
          ) : null}

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-12 text-[--color-text-body] leading-relaxed whitespace-pre-wrap">
            {blog.content}
          </div>

          {/* Author Card */}
          <Card className="mt-12 border border-[--color-border] rounded-2xl shadow-sm bg-[--color-bg-cream]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-[--color-text-heading]">About the Author</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-[--color-text-heading] font-semibold">{blog.author?.name}</p>
              <p className="text-sm text-[--color-text-muted]">
                Expert contributor at <span className="text-[--color-brand-primary] font-medium">{blog.company.name}</span>
              </p>
            </CardContent>
          </Card>
        </article>
      </div>
    </main>
  )
}