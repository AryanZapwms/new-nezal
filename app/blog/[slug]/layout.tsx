// app/blog/[slug]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout fetches the post directly (mirrors the query in
// app/api/blogs/[slug]/route.ts) and builds per-post SEO tags from it.
import type { Metadata } from "next"
import type React from "react"
import { connectDB } from "@/lib/db"
import { Blog } from "@/lib/models/blog"
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

  await connectDB()
  const blog = await Blog.findOne({ slug, isPublished: true }).lean<{
    title: string
    excerpt?: string
    content: string
    image?: string
  }>()

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
