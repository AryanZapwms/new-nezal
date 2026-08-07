// app/concerns/[slug]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout fetches the concern directly and builds SEO tags.
import type { Metadata } from "next"
import type React from "react"
import { connectDB } from "@/lib/db"
import { Concern } from "@/lib/models/concern"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  await connectDB()
  const concern = await Concern.findOne({ slug, isActive: true }).lean<{
    label: string
    headline?: string
    subheadline?: string
    description?: string
    heroImage?: string
  }>()

  if (!concern) {
    return pageMetadata({
      title: "Shop by Concern",
      description: "Find natural Nezal products tailored to your skin and hair concerns.",
      path: `/concerns/${slug}`,
    })
  }

  return pageMetadata({
    title: concern.headline || concern.label,
    description:
      concern.description ||
      concern.subheadline ||
      `Shop natural Nezal products for ${concern.label.toLowerCase()} — Ayurveda-inspired skincare and haircare.`,
    path: `/concerns/${slug}`,
    image: concern.heroImage,
  })
}

export default function ConcernDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
