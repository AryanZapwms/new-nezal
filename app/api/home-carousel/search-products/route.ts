// app/api/admin/home-carousel/search-products/route.ts
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const q = request.nextUrl.searchParams.get("q")?.trim() || ""

    const filter: any = { isActive: true }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ]
    }

    const products = await Product.find(filter)
      .select("name slug image company")
      .populate("company", "name slug")
      .limit(15)
      .lean()

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error searching products:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}