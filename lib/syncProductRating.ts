// lib/syncProductRating.ts
// Product.rating / Product.reviewCount are a stored snapshot (see the schema
// comment in lib/models/product.ts) — nothing keeps them in sync with the
// Review collection automatically. Call this after any admin action that
// changes which reviews count as "approved" for a product (approve, reject,
// delete, or a user editing an existing approved review back to pending).
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"

export async function syncProductRating(productId: string | { toString(): string }) {
  const id = productId.toString()

  const approved = await Review.find({ product: id, status: "approved" }).select("rating").lean()

  const reviewCount = approved.length
  const rating = reviewCount > 0
    ? Number((approved.reduce((sum, r: any) => sum + (r.rating || 0), 0) / reviewCount).toFixed(1))
    : null

  await Product.findByIdAndUpdate(id, { rating, reviewCount })
}
