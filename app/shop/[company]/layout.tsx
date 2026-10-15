// app/shop/[company]/layout.tsx
//
// Builds the brand's SEO tags. getActiveCompanyBySlug is wrapped in cache(),
// so this and page.tsx share one query per request. Route param is named
// "company" but stores the brand's slug.
import type { Metadata } from "next"
import type React from "react"
import { getActiveCompanyBySlug } from "@/lib/product-listing"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const { company: companySlug } = await params

  const company: {
    name: string
    description?: string
    banner?: string
    logo?: string
  } | null = await getActiveCompanyBySlug(companySlug)

  if (!company) {
    return pageMetadata({
      title: "Shop",
      description: "Shop natural skincare and haircare from Nezal.",
      path: `/shop/${companySlug}`,
    })
  }

  return pageMetadata({
    title: company.name,
    description:
      company.description ||
      `Shop ${company.name} — natural, Ayurveda-inspired skincare and haircare from Nezal.`,
    path: `/shop/${companySlug}`,
    image: company.banner || company.logo,
  })
}

export default function ShopCompanyLayout({ children }: { children: React.ReactNode }) {
  return children
}
