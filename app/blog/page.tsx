// app/blog/page.tsx
//
// Server Component — the post list is rendered into the HTML (no client fetch,
// no loading flash). Search and tag filtering stay interactive in
// components/blog-list.tsx. Metadata comes from app/blog/layout.tsx.

import { BlogList } from "@/components/blog-list"
import { getPublishedBlogs, type BlogCard } from "@/lib/blog-data"

// Re-rendered at most every 5 minutes; the admin blog routes also call
// revalidatePath("/blog") on create/update/delete so edits show immediately.
export const revalidate = 300

export default async function BlogPage() {
  let blogs: BlogCard[] = []
  try {
    blogs = await getPublishedBlogs()
  } catch (err) {
    // Same posture as the home page: never fail the render (or the build) on a DB hiccup
    console.error("Blog list fetch error:", err)
  }

  return <BlogList blogs={blogs} />
}
