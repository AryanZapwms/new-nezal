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
// it always has.
import { notFound } from "next/navigation"
import { getProductDetail, isValidProductId } from "@/lib/product-detail"
import { getProductReviews } from "@/lib/product-reviews"
import ProductDetailClient from "./product-detail-client"

export const dynamic = "force-dynamic"

type ProductPageProps = { params: Promise<{ company: string; id: string }> }

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  if (!isValidProductId(id)) notFound()

  const [product, reviews] = await Promise.all([
    getProductDetail(id),
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
