// app/shop/[company]/product/[id]/page.tsx
//
// Server-rendered product page. The product and its reviews are read from the
// database here, with the same code as GET /api/products/[id] and its reviews
// route, so the first HTML already shows the product. The interactive UI is
// product-detail-client.tsx.
//
// Rendered fresh on every request, never cached: price, stock and flash sales
// change from admin edits, orders, cancellations and Shiprocket webhooks, and
// must show up straight away.
//
// The [company] segment isn't checked: any brand slug shows the product, as
// it always has. The canonical URL names the product's real brand, the same
// URL the Meta catalog feed links to.
import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import { getProductDetail, isValidProductId } from "@/lib/product-detail"
import { getProductReviews } from "@/lib/product-reviews"
import { cleanDescription, cleanTitle } from "@/lib/meta-catalog"
import { pageMetadata, productPath } from "@/lib/seo"
import ProductDetailClient from "./product-detail-client"

export const dynamic = "force-dynamic"

type ProductPageProps = { params: Promise<{ company: string; id: string }> }

const META_DESCRIPTION_MAX_LENGTH = 160

// generateMetadata and the page share one product read per request
const loadProduct = cache(async (id: string) => (isValidProductId(id) ? getProductDetail(id) : null))

function metaDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX_LENGTH) return text
  return `${text.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).replace(/\s+\S*$/, "")}…`
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { company: urlCompanySlug, id } = await params
  const product = await loadProduct(id)
  if (!product) notFound()

  // A product whose brand was deleted has no real slug; keep the URL's
  const companySlug = product.company?._id ? product.company.slug : urlCompanySlug

  // Overrides the brand tags from app/shop/[company]/layout.tsx
  return pageMetadata({
    title: cleanTitle(product.name),
    description: metaDescription(cleanDescription(product.description || product.name)),
    path: productPath(companySlug, product._id),
    image: product.image || product.images?.[0],
    // Product photos are square, not the 1200×630 pageMetadata assumes
    imageSize: null,
  })
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  if (!isValidProductId(id)) notFound()

  const [product, reviews] = await Promise.all([
    loadProduct(id),
    // Reviews are secondary: if they fail the page still renders, showing
    // none, as it did when the browser fetched them
    getProductReviews(id).catch((error) => {
      console.error("Error fetching reviews:", error)
      return null
    }),
  ])
  if (!product) notFound()

  // key: fresh state (selected size, image, quantity) for each product
  return <ProductDetailClient key={product._id} product={product} initialReviews={reviews} />
}
