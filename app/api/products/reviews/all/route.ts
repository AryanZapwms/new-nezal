// app/api/products/reviews/all/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = request.nextUrl
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1"))
    const limit    = Math.min(50, parseInt(searchParams.get("limit") || "12"))
    const rating   = searchParams.get("rating")   // "1"|"2"|"3"|"4"|"5" or null
    const productId = searchParams.get("productId")
    const sort     = searchParams.get("sort") || "newest" // "newest"|"highest"|"lowest"
    const skip     = (page - 1) * limit

    const filter: Record<string, any> = { status: "approved" }
      if (rating) filter.rating = parseInt(rating)
        if (productId) filter.product = productId  

    const sortMap: Record<string, any> = {
      newest:  { createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
      lowest:  { rating: 1,  createdAt: -1 },
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate({ path: "product", select: "name image" })
        .populate({ path: "company", select: "name" })
        .sort(sortMap[sort] ?? sortMap.newest)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ])

    const mappedReviews = reviews.map((review: any) => ({
      id:           review._id.toString(),
      productId:    review.product?._id?.toString() || "",
      productName:  review.product?.name  || "Product",
      productImage: review.product?.image || "/placeholder.jpg",
      companyId:    review.company?._id?.toString() || "",
      company:      review.company?.name  || "Nezal",
      customerName: review.userName       || "Anonymous",
      rating:       review.rating         || 5,
      comment:      review.comment        || "",
      reply:        review.reply          || null,
      createdAt:    review.createdAt,
    }))

    return NextResponse.json({
      success: true,
      reviews: mappedReviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching all reviews:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews", reviews: [] },
      { status: 500 }
    )
  }
}