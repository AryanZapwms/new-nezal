// lib/product-listing.ts
//
// The product listing query behind GET /api/products, plus the category
// lookup behind GET /api/categories. The shop pages (/shop, /shop/[company],
// /shop/[company]/[category]) call these on the server to render their first
// page; the API routes call the same functions for every later page/filter
// change, so server and client results can't drift apart.

import { cache } from "react"
import mongoose from "mongoose"
import Fuse from "fuse.js"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { Company } from "@/lib/models/company"
import { Category } from "@/lib/models/category"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"

// Simple in-memory cache for listing responses (per server process), shared
// by the API route and the server-rendered shop pages.
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = process.env.NODE_ENV === "development" ? 0 : 1000 * 60 * 2 // 2 minutes

function getCacheKey(params: Record<string, string>) {
  return JSON.stringify(params)
}

function getCachedResponse(key: string) {
  const cached = apiCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedResponse(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() })
}

function getSortStage(sort: string): Record<string, 1 | -1> {
  switch (sort) {
    case "price_asc":
      return { price: 1 }
    case "price_desc":
      return { price: -1 }
    case "name_asc":
      return { name: 1 }
    case "newest":
      return { createdAt: -1 }
    case "manual":
    default:
      // Falls back to createdAt for any products that share the same
      // (default) sortOrder, so nothing on the live site changes until
      // an admin actually drags something — at that point sortOrder
      // values diverge and take precedence.
      return { sortOrder: 1, createdAt: -1 }
  }
}

export interface ListProductsParams {
  company?: string | null
  category?: string | null
  search?: string
  page?: number
  limit?: number
  exclude?: string | null
  sort?: string
  /** Only ever true for an authenticated admin — the API route checks that. */
  includeInactive?: boolean
}

export interface ProductListing {
  products: any[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export async function listProducts({
  company = null,
  category = null,
  search = "",
  page = 1,
  limit = 12,
  exclude = null,
  sort = "manual",
  includeInactive = false,
}: ListProductsParams): Promise<ProductListing> {
  await connectDB()

  const cacheKey = getCacheKey({ company, category, search, page, limit, exclude, sort, includeInactive: String(includeInactive) } as any)
  const cachedResponse = getCachedResponse(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  const query: any = includeInactive ? {} : { isActive: true }

  const [companyDoc, categoryDoc] = await Promise.all([
    company ? Company.findOne({ slug: company, isActive: true }).select("_id") : null,
    category ? Category.findOne({ slug: category, isActive: true }).select("_id parent") : null,
  ])

  if (companyDoc) {
    query.company = companyDoc._id
  }

  if (categoryDoc) {
    if (!categoryDoc.parent) {
      const subCategories = await Category.find({
        parent: categoryDoc._id,
        isActive: true,
      }).select("_id")
      const categoryIds = [
        categoryDoc._id,
        ...subCategories.map((sub) => sub._id),
      ]
      query.category = { $in: categoryIds }
    } else {
      query.category = categoryDoc._id
    }
  }

  if (exclude) {
    const excludeIds = exclude
      .split(",")
      .map((s) => s.trim())
      .filter((s) => mongoose.Types.ObjectId.isValid(s))
    if (excludeIds.length) {
      query._id = { $nin: excludeIds }
    }
  }

  const skip = (page - 1) * limit

  let products: any[]
  let total: number

  if (search) {
    // Typo-tolerant search: pull everything matching the other filters,
    // then let Fuse.js rank by closeness so "sleo vera" still finds "Aloe Vera".
    const candidates = await Product.find(query)
      .populate("company", "name slug")
      .populate("category", "name slug")
      .select("name slug price discountPrice salePercentage image images stock sizes company category isActive createdAt isBestSeller rating reviewCount")
      .sort({ createdAt: -1 })
      .lean()

    const fuse = new Fuse(candidates, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "company.name", weight: 0.3 },
      ],
      threshold: 0.4, // 0 = exact only, 1 = match almost anything
      ignoreLocation: true, // typo can be anywhere in the word, not just start
      minMatchCharLength: 2,
    })

    const fuzzyResults = fuse.search(search).map((r) => r.item)

    if (sort === "price_asc") {
      fuzzyResults.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0))
    } else if (sort === "price_desc") {
      fuzzyResults.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0))
    } else if (sort === "name_asc") {
      fuzzyResults.sort((a: any, b: any) => a.name.localeCompare(b.name))
    }

    total = fuzzyResults.length
    products = fuzzyResults.slice(skip, skip + limit)
  } else {
    ;[products, total] = await Promise.all([
      Product.find(query)
        .populate("company", "name slug")
        .populate("category", "name slug")
        .select("name slug price discountPrice salePercentage image images stock sizes company category isActive createdAt isBestSeller rating reviewCount")
        .skip(skip)
        .limit(limit)
        .sort(getSortStage(sort))
        .lean(),
      Product.countDocuments(query),
    ])
  }

  // ── Merge in flash-sale pricing so every listing (shop, search, home, etc.)
  //    reflects an active sale automatically ──────────────────────────────
  const flashSaleMap = await getActiveFlashSaleMap()
  const productsWithSales = applyFlashSaleToList(products, flashSaleMap)

  const responseData = {
    products: productsWithSales,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }

  // Note: flash sales are time-boxed to the minute, so caching this for
  // the full 2-minute TTL is fine — worst case a sale's start/end is off
  // by up to CACHE_TTL. If that's too loose, drop the cache write when
  // flashSaleMap.size > 0, or shorten CACHE_TTL.
  setCachedResponse(cacheKey, responseData)

  return responseData
}

/** Active brands for the /shop Brand filter (same order as GET /api/companies). */
export async function getActiveCompanies() {
  await connectDB()
  return Company.find({ isActive: true }).sort({ position: 1, name: 1 }).select("_id name slug").lean()
}

/**
 * An active brand by slug. Wrapped in cache() so generateMetadata
 * (app/shop/[company]/layout.tsx) and the page share one query per request.
 */
export const getActiveCompanyBySlug = cache(async (slug: string) => {
  await connectDB()
  return Company.findOne({ slug, isActive: true }).lean<any>()
})

/**
 * Categories as GET /api/categories returns them: active ones (or all, for
 * `all`), optionally scoped to a company by id or slug, newest first.
 */
export async function findCategories({ company, all = false }: { company?: string | null; all?: boolean }) {
  await connectDB()

  let query: any = { isActive: true }

  if (company) {
    if (mongoose.Types.ObjectId.isValid(company)) {
      query.company = company
    } else {
      const companyDoc = await Company.findOne({ slug: company })
      if (companyDoc) query.company = companyDoc._id
    }
  }

  if (all) {
    query = {}
  }

  return Category.find(query)
    .populate("company", "name slug")
    .populate("parent", "name slug _id")
    .sort({ createdAt: -1 })
    .lean()
}

/** Main categories with their subCategories nested (GET /api/categories' default shape). */
export function toCategoryTree(categories: any[]) {
  const mainCategories = categories.filter((cat: any) => !cat.parent)
  const subCategories = categories.filter((cat: any) => cat.parent)

  return mainCategories.map((main: any) => ({
    ...main,
    subCategories: subCategories.filter(
      (sub: any) =>
        sub.parent &&
        sub.parent._id.toString() === main._id.toString()
    ),
  }))
}

/** The category page's heading/breadcrumb data: a main category or a subcategory, by slug. */
export async function findCompanyCategory(company: string, categorySlug: string) {
  const tree = toCategoryTree(await findCategories({ company }))
  for (const mainCat of tree) {
    if (mainCat.slug === categorySlug) return mainCat
    const sub = mainCat.subCategories?.find((s: any) => s.slug === categorySlug)
    if (sub) return sub
  }
  return null
}
