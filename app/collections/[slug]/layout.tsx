// app/collections/[slug]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout fetches the collection directly and builds SEO tags,
// preferring the admin-authored seoTitle/seoDescription fields when set.
import type { Metadata } from "next"
import type React from "react"
import { connectDB } from "@/lib/db"
import { Collection } from "@/lib/models/collection"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  await connectDB()
  const collection = await Collection.findOne({ slug, isActive: true }).lean<{
    name: string
    tagline?: string
    storyText?: string
    heroImage?: string
    seoTitle?: string
    seoDescription?: string
    metaKeywords?: string[]
  }>()

  if (!collection) {
    return pageMetadata({
      title: "Collections",
      description: "Browse Nezal's curated skincare and haircare collections.",
      path: `/collections/${slug}`,
    })
  }

  return pageMetadata({
    title: collection.seoTitle || collection.name,
    description:
      collection.seoDescription ||
      collection.tagline ||
      collection.storyText?.slice(0, 160) ||
      `Shop the ${collection.name} collection from Nezal — natural, Ayurveda-inspired skincare.`,
    path: `/collections/${slug}`,
    image: collection.heroImage,
    keywords: collection.metaKeywords?.join(", "),
  })
}

export default function CollectionDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
