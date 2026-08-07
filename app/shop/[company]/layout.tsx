// app/shop/[company]/layout.tsx
//
// page.tsx here is a Client Component, which can't export metadata itself
// — this server layout fetches the company/brand directly and builds SEO
// tags. Route param is named "company" but stores the brand's slug.
import type { Metadata } from "next"
import type React from "react"
import { connectDB } from "@/lib/db"
import { Company } from "@/lib/models/company"
import { pageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const { company: companySlug } = await params

  await connectDB()
  const company = await Company.findOne({ slug: companySlug, isActive: true }).lean<{
    name: string
    description?: string
    banner?: string
    logo?: string
  }>()

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
