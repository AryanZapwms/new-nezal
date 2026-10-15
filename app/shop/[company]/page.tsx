// app/shop/[company]/page.tsx
//
// Server Component — loads the brand and its first page of products on the
// server, so the storefront arrives filled instead of behind skeletons.
// components/company-shop.tsx handles category and page changes on the
// client. Metadata comes from ./layout.tsx (same cached company read).

import { notFound } from "next/navigation"
import { CompanyShop } from "@/components/company-shop"
import { getActiveCompanyBySlug, listProducts } from "@/lib/product-listing"

// Rendered on first visit, then cached and re-rendered at most every 60 s.
// Listing prices/stock can be that old; cart and checkout always re-read them.
export const revalidate = 60

export function generateStaticParams() {
  return []
}

const PRODUCTS_PER_PAGE = 12

export default async function CompanyShopPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companySlug } = await params

  let company: any
  let listing: Awaited<ReturnType<typeof listProducts>>
  try {
    // Same request the client makes for page 1 with no category
    ;[company, listing] = await Promise.all([
      getActiveCompanyBySlug(companySlug),
      listProducts({ company: companySlug, page: 1, limit: PRODUCTS_PER_PAGE }),
    ])
  } catch (err) {
    // DB hiccup: render without server data and let the client fetch it, as before
    console.error("Brand page fetch error:", err)
    return <CompanyShop companySlug={companySlug} />
  }

  if (!company) notFound()

  const plain = JSON.parse(JSON.stringify({ company, listing }))
  return (
    <CompanyShop
      companySlug={companySlug}
      initialCompany={plain.company}
      initialListing={{ products: plain.listing.products, total: plain.listing.pagination.total }}
    />
  )
}
