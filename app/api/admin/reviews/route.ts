// app/api/admin/reviews/route.ts
import mongoose from "mongoose"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Review } from "@/lib/models/review"
import "@/lib/models/product"
import "@/lib/models/company"
import "@/lib/models/user"


function buildSummary(reviews: any[]) {
  if (!reviews.length) {
    return {
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
  }
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const review of reviews) {
    const rating = review.rating || 0
    if (ratingCounts[rating as keyof typeof ratingCounts] !== undefined) {
      ratingCounts[rating as keyof typeof ratingCounts] += 1
    }
    sum += rating
  }
  const averageRating = Number((sum / reviews.length).toFixed(1))
  return {
    total: reviews.length,
    averageRating,
    ratingCounts,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const status    = searchParams.get("status")      // ← new
    const page      = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit     = parseInt(searchParams.get("limit") || "20")
    const skip      = (page - 1) * limit

    // ── Per-company OR status-filtered list ──────────────
    if (companyId || status) {
      if (companyId && !mongoose.Types.ObjectId.isValid(companyId)) {
        return NextResponse.json({ error: "Invalid company id" }, { status: 400 })
      }

      const filter: Record<string, any> = {}
      if (companyId) filter.company = companyId
      if (status && status !== "all") filter.status = status

      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate("product", "name image slug")
          .populate("user", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments(filter),
      ])

      return NextResponse.json({
        reviews: reviews.map((review) => ({
          _id:       review._id.toString(),
          product:   review.product ? {
            _id:   (review.product as any)._id?.toString(),
            name:  (review.product as any).name,
            image: (review.product as any).image || "",
            slug:  (review.product as any).slug,
          } : null,
          rating:    review.rating,
          comment:   review.comment,
          userName:  review.userName,
          userEmail: review.userEmail,
          status:    review.status || "pending",
          reply:     review.reply ? {
            message:       review.reply.message ?? null,
            repliedAt:     review.reply.repliedAt ?? null,
            repliedByName: review.reply.repliedByName ?? null,
          } : null,
          createdAt: review.createdAt,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary:    buildSummary(reviews),
      })
    }

    // ── Company-grouped overview (no filters) ─────────────
    const companies = await Review.aggregate([
      {
        $group: {
          _id:          "$company",
          totalReviews: { $sum: 1 },
          averageRating:{ $avg: "$rating" },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from:         "companies",
          localField:   "_id",
          foreignField: "_id",
          as:           "company",
        },
      },
      { $unwind: "$company" },
      {
        $project: {
          companyId:     "$company._id",
          name:          "$company.name",
          slug:          "$company.slug",
          logo:          "$company.logo",
          totalReviews:  1,
          averageRating: { $round: ["$averageRating", 1] },
          pendingCount:  1,
        },
      },
      { $sort: { name: 1 } },
    ])

    return NextResponse.json({
      companies: companies.map((item) => ({
        companyId:     item.companyId.toString(),
        name:          item.name,
        slug:          item.slug,
        logo:          item.logo,
        totalReviews:  item.totalReviews,
        averageRating: item.averageRating,
        pendingCount:  item.pendingCount || 0,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
