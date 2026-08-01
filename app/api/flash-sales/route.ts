// app/api/flash-sales/route.ts
//
// GET  /api/flash-sales            -> active sales happening RIGHT NOW (for homepage + product pages)
// GET  /api/flash-sales?all=true   -> all sales regardless of status (admin list)
// POST /api/flash-sales            -> create a new sale (admin)

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { FlashSale } from "@/lib/models/flashsale"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const includeAll = req.nextUrl.searchParams.get("all") === "true"
    const now = new Date()

    const filter = includeAll
      ? {}
      : { isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } }

    const sales = await FlashSale.find(filter)
      .sort({ startsAt: -1 })
      .populate({
        path: "products",
        select: "name slug price discountPrice image images company stock",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    return NextResponse.json({ sales })
  } catch (error) {
    console.error("[flash-sales] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.name || !body.discountPercent || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: "Name, discount percent, start and end dates are required" }, { status: 400 })
    }

    if (new Date(body.endsAt) <= new Date(body.startsAt)) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    const sale = await FlashSale.create({
      name: body.name,
      discountPercent: Number(body.discountPercent),
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      products: body.products || [],
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    console.error("[flash-sales] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}