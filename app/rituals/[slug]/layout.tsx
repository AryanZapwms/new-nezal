// app/rituals/[slug]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout fetches the ritual directly and builds SEO tags.
import type { Metadata } from "next"
import type React from "react"
import { connectDB } from "@/lib/db"
import { Ritual } from "@/lib/models/ritual"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  await connectDB()
  const ritual = await Ritual.findOne({ slug, isActive: true }).lean<{
    name: string
    tagline?: string
    description?: string
    heroImage?: string
  }>()

  if (!ritual) {
    return pageMetadata({
      title: "Rituals",
      description: "Explore Nezal's curated skincare and haircare rituals.",
      path: `/rituals/${slug}`,
    })
  }

  return pageMetadata({
    title: ritual.name,
    description:
      ritual.description ||
      ritual.tagline ||
      `Follow the ${ritual.name} — a natural, Ayurveda-inspired skincare and haircare routine from Nezal.`,
    path: `/rituals/${slug}`,
    image: ritual.heroImage,
  })
}

export default function RitualDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
