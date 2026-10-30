// lib/product-reviews.ts
//
// A product's public reviews. GET /api/products/[id]/reviews and the
// server-rendered product page both read them from here; the POST route uses
// the same summary and public shape for its response.
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

const emptySummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
}

export function buildSummary(reviews: any[]) {
  if (!reviews.length) {
    return emptySummary
  }
  const ratingCounts = { ...emptySummary.ratingCounts }
  let sum = 0
  for (const review of reviews) {
    const rating = review.rating || 0
    if (ratingCounts[review.rating as keyof typeof ratingCounts] !== undefined) {
      ratingCounts[review.rating as keyof typeof ratingCounts] += 1
    }
    sum += rating
  }
  const average = Number((sum / reviews.length).toFixed(1))
  return {
    total: reviews.length,
    averageRating: average,
    ratingCounts,
  }
}

// Public response shape — never include userEmail (or any email) here.
// Emails are only exposed through the admin-protected routes under
// app/api/admin/reviews/**.
export function mapReview(review: any) {
  return {
    id: review._id.toString(),
    productId: review.product.toString(),
    companyId: review.company.toString(),
    userId: review.user.toString(),
    rating: review.rating,
    comment: review.comment,
    userName: review.userName,
    reply: review.reply
      ? {
          message: review.reply.message,
          repliedAt: review.reply.repliedAt,
          repliedBy: review.reply.repliedBy.toString(),
          repliedByName: review.reply.repliedByName,
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }
}

/**
 * The product's approved reviews, newest first, and their rating summary.
 * JSON-safe (dates come back as ISO strings), exactly what the GET route sends.
 */
export async function getProductReviews(productId: string): Promise<{ reviews: any[]; summary: any }> {
  await connectDB()

  const reviews = await Review.find({ product: productId, status: "approved" }).sort({ createdAt: -1 }).lean()

  return JSON.parse(JSON.stringify({ reviews: reviews.map(mapReview), summary: buildSummary(reviews) }))
}
