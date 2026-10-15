// lib/home-sections.ts
//
// Server-side reads behind the home page sections — hero products, shop by
// concern, discover rituals and shop by category. app/page.tsx calls these in
// its parallel batch so the sections arrive in the HTML instead of fetching
// after hydration; the matching public API routes (/api/hero-products,
// /api/concerns, /api/rituals, /api/companies/[id]/shop-by-concern) call the
// same functions, so the two can't drift apart.

import { HeroProduct } from "@/lib/models/heroProduct"
import { Concern } from "@/lib/models/concern"
import { Ritual } from "@/lib/models/ritual"
import { Review } from "@/lib/models/review"
// Registered for the nested populate({ path: "productId", populate: { path: "company" } })
import { Product } from "@/lib/models/product"
import "@/lib/models/company"
import { getActiveFlashSaleMap, applyFlashSaleToList, type FlashSaleInfo } from "@/lib/flashSale"

type FlashSaleMap = Map<string, FlashSaleInfo>

/**
 * Hero products with flash-sale pricing, rating and review count merged in.
 * Pass `flashSaleMap` (or its pending promise) to reuse a lookup the caller
 * already started — the home page runs it in the same parallel batch.
 * Callers must have run connectDB().
 */
export async function getHeroProducts({
  includeInactive = false,
  flashSaleMap,
}: { includeInactive?: boolean; flashSaleMap?: FlashSaleMap | Promise<FlashSaleMap> } = {}) {
  const filter = includeInactive ? {} : { isActive: true }

  const [heroProductsRaw, saleLookup] = await Promise.all([
    HeroProduct.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate({
        path: "productId",
        // ── added: sizes (for sizeLabel), keyIngredients ──
        select: "name slug price discountPrice image company stock sizes keyIngredients",
        populate: { path: "company", select: "name slug" },
      })
      .lean(),
    flashSaleMap ?? getActiveFlashSaleMap(),
  ])

  // ── Merge in flash-sale pricing so hero products match every other
  //    surface (shop grid, new arrivals, etc.) ──────────────────────
  const productsWithSale = applyFlashSaleToList(
    heroProductsRaw.map((h: any) => h.productId).filter(Boolean),
    saleLookup
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

  return heroProductsRaw
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
}

/** Concerns for the home cards and search. Callers must have run connectDB(). */
export async function getConcerns({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const filter = includeInactive ? {} : { isActive: true }
  return Concern.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select("label slug headline heroImage color sortOrder isActive")
    .lean()
}

/** Rituals for the home cards. Callers must have run connectDB(). */
export async function getRituals({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const filter = includeInactive ? {} : { isActive: true }
  return Ritual.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select("name slug tagline heroImage color sortOrder isActive")
    .lean()
}

/**
 * A company's "shop by concern" items (rendered by components/shop-by-category.tsx)
 * with their linked products. Takes the company document itself — hydrated or
 * plain — so the home page can reuse the company it already loaded.
 * Callers must have run connectDB().
 */
export async function getShopByConcern(company: any, { showAll = false }: { showAll?: boolean } = {}) {
  const settings = company.shopByConcernSettings || {
    isVisible: true,
    limit: 6,
  }

  if (!showAll && !settings.isVisible) {
    return { items: [], settings }
  }

  const concerns = (company.shopByConcern || [])
    .filter((item: any) => (showAll ? true : item.isActive !== false))
    .sort((a: any, b: any) => (a.priority ?? 0) - (b.priority ?? 0))

  const limit = settings.limit ?? 6

  const items = concerns
    .slice(0, showAll ? concerns.length : limit)
    .map((item: any) => ({
      _id: item._id,
      title: item.title,
      image: item.image,
      description: item.description,
      isActive: item.isActive ?? true,
      priority: item.priority ?? 0,
      product: item.product,
    }))

  const productIds = items
    .map((item: any) =>
      item.product && typeof item.product === "object"
        ? item.product
        : item.product?.toString()
    )
    .filter(Boolean)

  let productsById: Record<string, any> = {}

  if (productIds.length > 0) {
    const products = await Product.find({
      _id: { $in: productIds },
      company: company._id,
    }).select("name slug company")

    productsById = products.reduce(
      (acc: Record<string, any>, product: any) => {
        acc[product._id.toString()] = product
        return acc
      },
      {}
    )
  }

  const populatedItems = items.map((item: any) => {
    const productId =
      typeof item.product === "object"
        ? item.product._id?.toString()
        : item.product?.toString()

    const product = productId ? productsById[productId] : undefined

    return {
      ...item,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            company: product.company,
          }
        : undefined,
    }
  })

  return { items: populatedItems, settings }
}
