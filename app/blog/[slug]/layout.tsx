// app/blog/[slug]/layout.tsx
//
// Builds per-post SEO tags. getPublishedBlog is wrapped in cache(), so this
// and page.tsx share a single query per request.
import type { Metadata } from "next"
import type React from "react"
import { getPublishedBlog } from "@/lib/blog-data"
import { pageMetadata } from "@/lib/seo"

function stripHtml(html: string, maxLength = 160) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  const blog = await getPublishedBlog(slug)

  if (!blog) {
    return pageMetadata({
      title: "Blog",
      description: "Skincare and haircare tips from the Nezal team.",
      path: `/blog/${slug}`,
    })
  }

  return pageMetadata({
    title: blog.title,
    description: blog.excerpt || stripHtml(blog.content),
    path: `/blog/${slug}`,
    image: blog.image,
  })
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children
}
