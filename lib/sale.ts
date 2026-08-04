// lib/sale.ts
//
// Priority between direct sale and collection sale: whichever was set most
// recently wins ("last write wins" on saleAppliedAt). Flash sale
// (lib/flashSale.ts) is layered on top separately at read time and always
// wins while active — it is never written here or persisted on the product.
//
// Direct and collection sale are tracked as two independent records per
// product (directSalePercentage/directSaleAppliedAt and
// collectionSalePercentage/collectionSaleAppliedAt/collectionSaleId) so that
// clearing one can fall back to the other. saleSource/salePercentage/
// saleSourceId/saleAppliedAt + discountPrice are the derived "current
// winner" snapshot used for display and stored for fast reads — this file
// is the only place that should write them.

import mongoose from "mongoose"
import { Product } from "@/lib/models/product"
import { Collection } from "@/lib/models/collection"

export function computeSalePrice(price: number, percentage: number): number {
  return Math.round(price - (price * percentage) / 100)
}

export type SaleSource = "none" | "direct" | "collection"

export interface EffectiveSaleFields {
  saleSource: SaleSource
  salePercentage: number | null
  saleSourceId: mongoose.Types.ObjectId | null
  saleAppliedAt: Date | null
  // null (never undefined) so bulkWrite $set clears a stale price instead of
  // silently dropping the field — the MongoDB driver strips `undefined`
  // values out of update documents before sending them.
  discountPrice: number | null
}

interface SaleRecordInput {
  price: number
  directSalePercentage?: number | null
  directSaleAppliedAt?: Date | null
  collectionSalePercentage?: number | null
  collectionSaleAppliedAt?: Date | null
  collectionSaleId?: mongoose.Types.ObjectId | string | null
}

// Pure function: given a product's price and its two independent sale
// records, decides which one is currently in effect and what discountPrice
// that implies. Does not know about flash sales — callers that need the
// flash-aware price should run the result through applyFlashSale().
export function computeEffectiveSale(product: SaleRecordInput): EffectiveSaleFields {
  const hasDirect =
    !!product.directSalePercentage && product.directSalePercentage > 0 && !!product.directSaleAppliedAt
  const hasCollection =
    !!product.collectionSalePercentage && product.collectionSalePercentage > 0 && !!product.collectionSaleAppliedAt

  let winner: SaleSource = "none"
  if (hasDirect && hasCollection) {
    winner = product.directSaleAppliedAt! >= product.collectionSaleAppliedAt! ? "direct" : "collection"
  } else if (hasDirect) {
    winner = "direct"
  } else if (hasCollection) {
    winner = "collection"
  }

  if (winner === "none") {
    return { saleSource: "none", salePercentage: null, saleSourceId: null, saleAppliedAt: null, discountPrice: null }
  }

  const percentage = winner === "direct" ? product.directSalePercentage! : product.collectionSalePercentage!
  const appliedAt = winner === "direct" ? product.directSaleAppliedAt! : product.collectionSaleAppliedAt!
  const sourceId =
    winner === "collection" && product.collectionSaleId
      ? new mongoose.Types.ObjectId(product.collectionSaleId as any)
      : null

  return {
    saleSource: winner,
    salePercentage: percentage,
    saleSourceId: sourceId,
    saleAppliedAt: appliedAt,
    discountPrice: computeSalePrice(product.price, percentage),
  }
}

function applyEffectivePatch(product: any) {
  const eff = computeEffectiveSale(product)
  product.saleSource = eff.saleSource
  product.salePercentage = eff.salePercentage
  product.saleSourceId = eff.saleSourceId
  product.saleAppliedAt = eff.saleAppliedAt
  product.discountPrice = eff.discountPrice
  return eff
}

// ─── Direct sale (single product, admin product edit page) ───────────────

// Sets/updates a product's direct sale percentage. Only bumps
// directSaleAppliedAt when the percentage actually changed — the product
// edit form resubmits the full record on every save, so a no-op resubmit
// must not let direct sale steal priority away from a newer collection sale.
export async function setDirectSale(productId: string, percentage: number) {
  if (!(percentage > 0)) return clearDirectSale(productId)

  const product = await Product.findById(productId)
  if (!product) throw new Error("Product not found")

  if (product.directSalePercentage !== percentage) {
    product.directSalePercentage = percentage
    product.directSaleAppliedAt = new Date()
  }

  applyEffectivePatch(product)
  await product.save()
  return product
}

export async function clearDirectSale(productId: string) {
  const product = await Product.findById(productId)
  if (!product) throw new Error("Product not found")

  product.directSalePercentage = null
  product.directSaleAppliedAt = null

  applyEffectivePatch(product)
  await product.save()
  return product
}

// ─── Collection sale (bulk, admin collection edit page) ──────────────────

// Applies a sale percentage to a collection and stamps every current
// product in it. Runs unconditionally for every product in the collection —
// including ones currently under an active flash sale, whose display price
// stays flash-driven for now but whose underlying fields still need to be
// correct for when that flash sale ends.
export async function applyCollectionSale(collectionSlug: string, percentage: number) {
  if (!(percentage > 0)) return clearCollectionSale(collectionSlug)

  const collection = await Collection.findOne({ slug: collectionSlug })
  if (!collection) throw new Error("Collection not found")

  const now = new Date()
  collection.salePercentage = percentage
  collection.saleAppliedAt = now
  await collection.save()

  const products = await Product.find({ collectionSlug })
  const bulkOps = products.map((product: any) => {
    product.collectionSalePercentage = percentage
    product.collectionSaleAppliedAt = now
    product.collectionSaleId = collection._id
    const eff = applyEffectivePatch(product)
    return {
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            collectionSalePercentage: percentage,
            collectionSaleAppliedAt: now,
            collectionSaleId: collection._id,
            saleSource: eff.saleSource,
            salePercentage: eff.salePercentage,
            saleSourceId: eff.saleSourceId,
            saleAppliedAt: eff.saleAppliedAt,
            discountPrice: eff.discountPrice,
          },
        },
      },
    }
  })

  if (bulkOps.length) await Product.bulkWrite(bulkOps)

  return { collection, affectedCount: bulkOps.length }
}

// Clears a collection's sale. Affected products fall back to their direct
// sale if they still have one, otherwise to no sale — computeEffectiveSale
// handles that automatically once collectionSalePercentage is nulled out.
export async function clearCollectionSale(collectionSlug: string) {
  const collection = await Collection.findOne({ slug: collectionSlug })
  if (!collection) throw new Error("Collection not found")

  collection.salePercentage = null
  collection.saleAppliedAt = null
  await collection.save()

  const products = await Product.find({ collectionSaleId: collection._id })
  const bulkOps = products.map((product: any) => {
    product.collectionSalePercentage = null
    product.collectionSaleAppliedAt = null
    product.collectionSaleId = null
    const eff = applyEffectivePatch(product)
    return {
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            collectionSalePercentage: null,
            collectionSaleAppliedAt: null,
            collectionSaleId: null,
            saleSource: eff.saleSource,
            salePercentage: eff.salePercentage,
            saleSourceId: eff.saleSourceId,
            saleAppliedAt: eff.saleAppliedAt,
            discountPrice: eff.discountPrice,
          },
        },
      },
    }
  })

  if (bulkOps.length) await Product.bulkWrite(bulkOps)

  return { collection, affectedCount: bulkOps.length }
}

// ─── Collection membership hooks ──────────────────────────────────────────

// A product was just added to a collection — if that collection currently
// has an active sale, stamp the product with it right away (as the most
// recent action on that product), so admins don't have to re-apply the
// collection sale for products added afterward.
export async function inheritCollectionSaleOnAdd(productId: string, collectionSlug: string) {
  const collection = await Collection.findOne({ slug: collectionSlug })
  if (!collection || !(collection.salePercentage > 0)) return null

  const product = await Product.findById(productId)
  if (!product) return null

  product.collectionSalePercentage = collection.salePercentage
  product.collectionSaleAppliedAt = new Date()
  product.collectionSaleId = collection._id

  applyEffectivePatch(product)
  await product.save()
  return product
}

// A product was just removed from a collection — if its currently-recorded
// collection sale points at that collection, clear it (falls back to direct
// sale if any, else no sale).
export async function removeCollectionSaleOnRemove(
  productId: string,
  collectionId: mongoose.Types.ObjectId | string
) {
  const product = await Product.findById(productId)
  if (!product) return null
  if (!product.collectionSaleId || product.collectionSaleId.toString() !== collectionId.toString()) {
    return product
  }

  product.collectionSalePercentage = null
  product.collectionSaleAppliedAt = null
  product.collectionSaleId = null

  applyEffectivePatch(product)
  await product.save()
  return product
}
