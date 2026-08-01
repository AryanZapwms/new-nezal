// app/api/hero-products/route.ts
//
// GET  /api/hero-products          -> list active hero products (public homepage)
// GET  /api/hero-products?all=true -> list all (admin)
// POST /api/hero-products          -> add a product to the spotlight (admin) — { productId, isActive?, isBestSeller? }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { HeroProduct } from "@/lib/models/heroProduct"
// ── Required even though not queried directly: Mongoose needs these
//    schemas registered in this route's bundle for the nested
//    populate({ path: "productId", populate: { path: "company" } })
//    below to resolve — same pattern as new-arrivals/route.ts ──────
import { Product } from "@/lib/models/product"
import { Company } from "@/lib/models/company"
import { Review } from "@/lib/models/review"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const includeInactive = req.nextUrl.searchParams.get("all") === "true"
    const filter = includeInactive ? {} : { isActive: true }

    const heroProductsRaw = await HeroProduct.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate({
        path: "productId",
        // ── added: sizes (for sizeLabel), keyIngredients ──
        select: "name slug price discountPrice image company stock sizes keyIngredients",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    // ── Merge in flash-sale pricing so hero products match every other
    //    surface (shop grid, new arrivals, etc.) ──────────────────────
    const flashSaleMap = await getActiveFlashSaleMap()
    const productsWithSale = applyFlashSaleToList(
      heroProductsRaw.map((h: any) => h.productId).filter(Boolean),
      flashSaleMap
    )
    const saleMap = new Map(productsWithSale.map((p: any) => [p._id.toString(), p]))

    // ── Aggregate rating + review count for every hero product in one query.
    //    Note: Review model uses `product` (not `productId`) and
    //    `status: "approved"` (not a boolean isApproved flag). ──────────────
    const productIds = heroProductsRaw
      .map((h: any) => h.productId?._id)
      .filter(Boolean)

    const ratingAgg = productIds.length
      ? await Review.aggregate([
          { $match: { product: { $in: productIds }, status: "approved" } },
          {
            $group: {
              _id: "$product",
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ])
      : []

    const ratingMap = new Map(
      ratingAgg.map((r: any) => [r._id.toString(), { rating: r.averageRating, reviewCount: r.reviewCount }])
    )

    const heroProducts = heroProductsRaw
      .map((h: any) => {
        if (!h.productId) return null
        const productId = h.productId._id.toString()
        const product = saleMap.get(productId) || h.productId
        const ratingInfo = ratingMap.get(productId)

        // Derive a simple size label from the first size variant, if any
        const firstSize = product.sizes?.[0]
        const sizeLabel = firstSize ? `${firstSize.size}${firstSize.unit}` : undefined

        return {
          ...h,
          productId: {
            ...product,
            sizeLabel,
            keyIngredients: (product.keyIngredients || []).map((k: any) => k.name),
            rating: ratingInfo?.rating,
            reviewCount: ratingInfo?.reviewCount,
            isBestSeller: h.isBestSeller,
          },
        }
      })
      .filter(Boolean) // drop entries whose product was deleted

    return NextResponse.json({ heroProducts })
  } catch (error) {
    console.error("[hero-products] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()

    if (!body.productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const alreadyExists = await HeroProduct.findOne({ productId: body.productId })
    if (alreadyExists) {
      return NextResponse.json(
        { error: "This product is already a hero product" },
        { status: 409 }
      )
    }

    const highestOrder = await HeroProduct.findOne().sort({ sortOrder: -1 }).select("sortOrder")
    const sortOrder = (highestOrder?.sortOrder ?? -1) + 1

    const heroProduct = await HeroProduct.create({
      productId: body.productId,
      sortOrder,
      isActive: body.isActive ?? true,
      isBestSeller: body.isBestSeller ?? false,
    })

    return NextResponse.json({ heroProduct }, { status: 201 })
  } catch (error) {
    console.error("[hero-products] POST error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}