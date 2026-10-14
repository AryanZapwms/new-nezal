// app/blog/[slug]/page.tsx
//
// Server Component — the article is rendered into the HTML (no client fetch,
// no "Loading blog..." screen, and the text is visible to search engines).
// The post query is shared with generateMetadata in ./layout.tsx via cache().

import Link from "next/link"
import { ArrowLeft, Calendar, User } from "lucide-react"
import { getPublishedBlog } from "@/lib/blog-data"
import { BlogFeaturedImage, BlogShareButton } from "@/components/blog-post-client"

// Posts aren't pre-rendered at build time; each is rendered on its first
// visit and then cached, re-rendered at most every 5 minutes. The admin blog
// routes also call revalidatePath() on update/delete so edits show immediately.
export const revalidate = 300

export function generateStaticParams() {
  return []
}

// Was a styled-jsx global block; styled-jsx only works in Client Components.
const BLOG_CONTENT_CSS = `
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
`

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const blog = await getPublishedBlog(slug)

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
              {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Kolkata",
              })}
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
            <BlogShareButton title={blog.title} excerpt={blog.excerpt} />
          </div>

          {/* Featured image */}
          {blog.image ? <BlogFeaturedImage src={blog.image} alt={blog.title} /> : null}

          {/* Content — rendered as HTML, not literal text */}
          <div
            className="blog-content mb-12"
            style={{ color: "#3d5c45", fontSize: "1.05rem", lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
          <style>{BLOG_CONTENT_CSS}</style>

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
