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
import { getHeroProducts } from "@/lib/home-sections"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const includeInactive = req.nextUrl.searchParams.get("all") === "true"
    // Shared with the home page's server render — see lib/home-sections.ts
    const heroProducts = await getHeroProducts({ includeInactive })

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