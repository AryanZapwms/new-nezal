// lib/product-detail.ts
//
// One product as the product page shows it. GET /api/products/[id] and the
// server-rendered page (app/shop/[company]/product/[id]/page.tsx) both read it
// from here, so the page always shows exactly what the API returns.
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import "@/lib/models/category"
import "@/lib/models/collection"
import { getActiveFlashSaleMap, applyFlashSale } from "@/lib/flashSale"

interface ProductResult { image: string; title: string; text: string }

export interface ProductSize {
  _id?: string
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
}

// The fields the product page reads; the object carries the rest of the
// product document too, as the API always has.
export interface ProductDetail {
  _id: string
  name: string
  description: string
  price: number
  discountPrice?: number
  salePercentage?: number | null
  mrp?: string | number
  image: string
  images: string[]
  stock: number
  ingredients: string[]
  benefits: string[]
  usage: string
  suitableFor?: string[]
  results?: ProductResult[]
  company?: { _id?: string; name: string; slug: string }
  category?: { name: string; slug: string } | null
  sizes?: ProductSize[]
  updatedAt?: string
  whyYoullLoveIt?: string[]
  fragranceExp?: string[]
  whoIsItFor?: string
  skinHairConcern?: string
  expectedResults?: string
  keyIngredients?: { name: string; benefit: string }[]
  amazonUrl?: string
  isBestSeller?: boolean
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

export function isValidProductId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * The product with its company, category and collection sale populated and
 * any active flash sale applied, or null when there is no such product.
 *
 * JSON-safe: ObjectIds and dates come back as strings, exactly as the API
 * route has always sent them, so the result can be passed straight to a
 * Client Component.
 */
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  await connectDB()

  const product = await Product.findById(id)
    .populate("company", "name slug")
    .populate("category", "name slug")
    .populate("collectionSaleId", "name slug")

  if (!product) return null

  const productObj = product.toObject()

  // Merge in flash-sale pricing so the product detail page shows the
  // same sale price / ribbon as the shop grid, cart, etc.
  const flashSaleMap = await getActiveFlashSaleMap()
  const productWithSale = applyFlashSale(productObj, flashSaleMap)

  const populatedProduct = {
    ...productWithSale,
    company: product.company || { name: "Unknown", slug: "unknown" },
    // Don't override a real populated category with a fake fallback object;
    // null makes the page show a "Product" heading instead of a fake slug
    category: product.category || null,
  }

  return JSON.parse(JSON.stringify(populatedProduct))
}
