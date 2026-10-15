// app/shop/[company]/[category]/page.tsx
//
// Server Component — loads the category (for the heading and breadcrumbs) and
// the first page of products on the server, so the page arrives filled instead
// of behind a spinner. components/category-shop.tsx handles paging on the client.

import { CategoryShop } from "@/components/category-shop"
import { findCompanyCategory, listProducts } from "@/lib/product-listing"

// Rendered on first visit, then cached and re-rendered at most every 60 s.
// Listing prices/stock can be that old; cart and checkout always re-read them.
export const revalidate = 60

export function generateStaticParams() {
  return []
}

const PRODUCTS_PER_PAGE = 12

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ company: string; category: string }>
}) {
  const { company, category } = await params

  try {
    // Same requests the client makes: /api/categories?company= and page 1
    const [categoryData, listing] = await Promise.all([
      findCompanyCategory(company, category),
      listProducts({ company, category, page: 1, limit: PRODUCTS_PER_PAGE }),
    ])

    const plain = JSON.parse(JSON.stringify({ categoryData, listing }))
    return (
      <CategoryShop
        company={company}
        category={category}
        initialCategory={plain.categoryData}
        initialListing={{ products: plain.listing.products, total: plain.listing.pagination.total }}
      />
    )
  } catch (err) {
    // DB hiccup: render without server data and let the client fetch it, as before
    console.error("Category page fetch error:", err)
    return <CategoryShop company={company} category={category} />
  }
}
