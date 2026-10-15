// app/shop/page.tsx
//
// Server Component — loads the first page of products (honouring ?search=
// from the header search bar) and the brand list on the server, so the grid
// arrives filled instead of behind skeletons. components/shop-all.tsx handles
// filters, sort, search and paging on the client. Metadata comes from
// ./layout.tsx. Rendered per request (it reads ?search=); listing reads are
// cached in-process for 2 minutes (lib/product-listing.ts).

import { ShopAll } from "@/components/shop-all"
import { getActiveCompanies, listProducts } from "@/lib/product-listing"

const PRODUCTS_PER_PAGE = 12

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>
}) {
  const { search } = await searchParams
  const initialSearch = (Array.isArray(search) ? search[0] : search) ?? ""

  try {
    // Same request the client makes with default filters and "featured" sort
    const [listing, companies] = await Promise.all([
      listProducts({ page: 1, limit: PRODUCTS_PER_PAGE, search: initialSearch.trim(), sort: "featured" }),
      getActiveCompanies(),
    ])

    const plain = JSON.parse(JSON.stringify({ listing, companies }))
    return (
      <ShopAll
        initialSearch={initialSearch}
        initialListing={{
          products: plain.listing.products,
          total: plain.listing.pagination.total,
          pages: plain.listing.pagination.pages,
        }}
        initialCompanies={plain.companies}
      />
    )
  } catch (err) {
    // DB hiccup: render without server data and let the client fetch it, as before
    console.error("Shop page fetch error:", err)
    return <ShopAll initialSearch={initialSearch} />
  }
}
