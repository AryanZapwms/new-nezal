// app/ingredients/[slug]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout looks up the same static INGREDIENT_DATA the page
// renders from and builds per-ingredient SEO tags.
import type { Metadata } from "next"
import type React from "react"
import { INGREDIENT_DATA, getIngredientLabel } from "@/lib/ingredient-data"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const info = INGREDIENT_DATA[slug]
  const label = getIngredientLabel(slug)

  return pageMetadata({
    title: label,
    description:
      info?.description ||
      info?.tagline ||
      `Learn about ${label} — one of the natural ingredients behind Nezal's skincare and haircare formulations.`,
    path: `/ingredients/${slug}`,
  })
}

export default function IngredientDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
