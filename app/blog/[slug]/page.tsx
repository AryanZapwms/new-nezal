"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Share2, ArrowLeft, Calendar, User } from "lucide-react"

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
      navigator.share({ title: blog?.title, text: blog?.excerpt, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#f4f9f4" }}>
        <p style={{ color: "#6b7c6b" }}>Loading blog...</p>
      </main>
    )
  }

  if (!blog) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#f4f9f4" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "#6b7c6b" }}>Blog not found</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#1a3a2a" }}
          >
            Back to Blogs
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: "#f4f9f4" }}>
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-8 transition-colors hover:opacity-70"
          style={{ color: "#2d6a4f" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <article>
          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs mb-5 flex-wrap" style={{ color: "#9aaa9a" }}>
            <span className="flex items-center gap-1.5 font-medium" style={{ color: "#3d5c45" }}>
              <User className="w-3.5 h-3.5" />
              {blog.author?.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(blog.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span
              className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full"
              style={{ background: "#e8f4ec", color: "#2d6a4f" }}
            >
              {blog.company?.name}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ color: "#1a3a2a", letterSpacing: "-0.02em" }}
          >
            {blog.title}
          </h1>

          {/* Tags + share */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8 pb-8" style={{ borderBottom: "1px solid #d4e8d0" }}>
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                    style={{ background: "#fff", color: "#3d5c45", border: "1px solid #d4e8d0" }}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full transition-colors hover:opacity-80"
              style={{ background: "#fff", color: "#1a3a2a", border: "1px solid #d4e8d0" }}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          {/* Featured image */}
          {blog.image && !imageError ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10" style={{ background: "#e8f2e4" }}>
              <img
                src={blog.image}
                alt={blog.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : null}

          {/* Content — rendered as HTML, not literal text */}
          <div
            className="blog-content mb-12"
            style={{ color: "#3d5c45", fontSize: "1.05rem", lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
          <style jsx global>{`
            .blog-content h2 {
              font-size: 1.5rem;
              font-weight: 700;
              color: #1a3a2a;
              margin-top: 2rem;
              margin-bottom: 0.75rem;
              letter-spacing: -0.01em;
            }
            .blog-content p {
              margin-bottom: 1.25rem;
            }
            .blog-content ul,
            .blog-content ol {
              margin-bottom: 1.25rem;
              padding-left: 1.5rem;
            }
            .blog-content li {
              margin-bottom: 0.5rem;
            }
            .blog-content a {
              color: #2d6a4f;
              text-decoration: underline;
            }
          `}</style>

          {/* Author card */}
          <div
            className="rounded-2xl p-6 flex items-center gap-4"
            style={{ background: "#fff", border: "1px solid #d4e8d0" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ background: "#1a3a2a", color: "#fff" }}
            >
              {blog.author?.name?.[0]?.toUpperCase() || "N"}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase mb-0.5" style={{ color: "#9aaa9a" }}>
                Written by
              </p>
              <p className="font-bold" style={{ color: "#1a3a2a" }}>
                {blog.author?.name}
              </p>
              <p className="text-sm" style={{ color: "#6b7c6b" }}>
                Contributor at <span className="font-semibold" style={{ color: "#2d6a4f" }}>{blog.company?.name}</span>
              </p>
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}