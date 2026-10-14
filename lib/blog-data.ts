// lib/blog-data.ts
//
// Server-side reads for the public blog pages (app/blog/**), which render on
// the server instead of fetching /api/blogs from the browser. Results are
// JSON round-tripped so ObjectIds/Dates become plain strings that can be
// passed to Client Components.

import { cache } from "react"
import { connectDB } from "@/lib/db"
import { Blog } from "@/lib/models/blog"
import "@/lib/models/user" // registers User for populate("author")

export interface BlogCard {
  _id: string
  title: string
  slug: string
  excerpt: string
  image: string
  author: { name: string } | null
  company: { name: string; slug: string } | null
  tags: string[]
  createdAt: string
}

export interface BlogPost extends BlogCard {
  content: string
}

function toPlain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value))
}

/** Published posts for the /blog grid — card fields only, never the post body. */
export async function getPublishedBlogs(): Promise<BlogCard[]> {
  await connectDB()
  const blogs = await Blog.find({ isPublished: true })
    .sort({ createdAt: -1 })
    .select("title slug excerpt image author company tags createdAt")
    .populate("author", "name")
    .populate("company", "name slug")
    .lean()
  return toPlain(blogs)
}

/**
 * One published post. Wrapped in cache() so generateMetadata
 * (app/blog/[slug]/layout.tsx) and the page share a single query per request.
 * Populates the author's name only — never their email.
 */
export const getPublishedBlog = cache(async (slug: string): Promise<BlogPost | null> => {
  await connectDB()
  const blog = await Blog.findOne({ slug, isPublished: true })
    .populate("author", "name")
    .populate("company", "name slug")
    .lean()
  return blog ? toPlain(blog) : null
})
