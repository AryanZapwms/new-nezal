// lib/meta-catalog.ts
//
// Meta (Facebook / Instagram) Commerce Manager catalog feed: one CSV row per
// product, fetched by Meta on a schedule from GET /meta-catalog.csv
// (app/meta-catalog.csv/route.ts).
//
// `id` is the product's Mongo _id, the same value every Meta Pixel and
// Conversions API event sends as content_ids (lib/facebook-pixel.ts,
// lib/meta-capi.ts), so catalog items and events match without any mapping.
//
// Each row describes the product the way its page first shows it: the default
// size is the first in-stock size (the same pick as
// app/shop/[company]/product/[id]/page.tsx), priced through lib/pricing.ts's
// resolveCurrentPrice(), flash sales included.

import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { BRAND } from "@/lib/config"
import { getActiveFlashSaleMap, type FlashSaleInfo } from "@/lib/flashSale"
import { resolveCurrentPrice } from "@/lib/pricing"

// The storefront's Company record is named "nh", which isn't a name customers
// know, so every item carries this brand instead.
export const META_FEED_BRAND = "Nezal Herbocare"

// Google product taxonomy IDs (Meta accepts them as google_product_category),
// keyed by Category slug. Taxonomy version 2021-09-21.
export const GOOGLE_PRODUCT_CATEGORY_BY_SLUG: Record<string, string> = {
  soaps: "2503", // Health & Beauty > Personal Care > Cosmetics > Bath & Body > Bar Soap
  "body-care": "474", // Health & Beauty > Personal Care > Cosmetics > Bath & Body
  "bath-shower": "474", // Health & Beauty > Personal Care > Cosmetics > Bath & Body
  // A unisex intimate wash, so Bath & Body rather than Feminine Sanitary Supplies
  "intimate-hygiene": "474", // Health & Beauty > Personal Care > Cosmetics > Bath & Body
  "face-care": "567", // Health & Beauty > Personal Care > Cosmetics > Skin Care
  "hair-care": "486", // Health & Beauty > Personal Care > Hair Care
  "massage-oil": "5663", // Health & Beauty > Personal Care > Massage & Relaxation ("Massage & Spa")
  "gift-kits": "475", // Health & Beauty > Personal Care > Cosmetics > Bath & Body Gift Sets
}

export const META_FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "google_product_category",
  "product_type",
] as const

export type MetaFeedRow = Record<(typeof META_FEED_COLUMNS)[number], string>

// A product as buildMetaCatalogCsv() loads it, with company and category populated.
export interface FeedProduct {
  _id: { toString(): string } | string
  name: string
  description?: string | null
  price: number
  discountPrice?: number | null
  salePercentage?: number | null
  image?: string | null
  images?: string[] | null
  stock?: number | null
  sizes?: { price: number; discountPrice?: number | null; stock?: number | null }[] | null
  isActive?: boolean
  company?: { slug?: string | null; isActive?: boolean | null } | null
  category?: { name?: string | null; slug?: string | null } | null
}

// Meta's field limits
const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 9999
// Gallery images listed per item after the main one, in gallery order
const ADDITIONAL_IMAGES_MAX = 10

/** Turns line breaks and runs of spaces into single spaces. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

export function cleanTitle(name: string): string {
  // Some names were saved with a trailing ", "
  return collapseWhitespace(name).replace(/[\s,]+$/, "").slice(0, TITLE_MAX_LENGTH)
}

/**
 * Descriptions are stored as a tagline line, a line break, then the body
 * (see components/ProductDescription.tsx). Joins the lines into one paragraph,
 * adding a full stop after a line that has no closing punctuation (usually
 * the tagline), and drops quote marks that wrap the whole text.
 */
export function cleanDescription(text: string): string {
  let body = text.trim()
  if (body.length > 1 && body.startsWith('"') && body.indexOf('"', 1) === body.length - 1) {
    body = body.slice(1, -1)
  }
  const lines = body.split(/\n/).map(collapseWhitespace).filter(Boolean)
  return lines
    .map((line, i) => (i < lines.length - 1 && !/[.!?:;,…]$/.test(line) ? `${line}.` : line))
    .join(" ")
    .slice(0, DESCRIPTION_MAX_LENGTH)
}

/** An absolute image URL Meta can fetch; site-relative paths resolve against the site. */
function absoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  const value = url?.trim()
  if (!value) return null
  const absolute = /^https?:\/\//i.test(value) ? value : value.startsWith("/") ? `${siteUrl}${value}` : null
  // additional_image_link is a comma-separated list, so commas must be encoded
  return absolute && absolute.replace(/ /g, "%20").replace(/,/g, "%2C")
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} INR`
}

/**
 * One feed row for a product, or null when the product must stay out of the
 * feed: inactive, no active brand with a slug (its page URL needs one), no
 * image, or no price.
 */
export function buildMetaFeedRow(
  product: FeedProduct,
  flashSaleMap: Map<string, FlashSaleInfo>,
  siteUrl: string = BRAND.domain
): MetaFeedRow | null {
  if (product.isActive === false) return null

  const company = product.company
  if (!company?.slug || company.isActive === false) return null

  const imageLink = absoluteUrl(product.image || product.images?.[0], siteUrl)
  if (!imageLink) return null

  // The page opens on the first in-stock size. With none in stock it selects
  // no size and shows the product's own price.
  const sizes = product.sizes ?? []
  const defaultSize = sizes.find((size) => (size.stock ?? 0) > 0) ?? null
  const inStock = sizes.length > 0 ? defaultSize !== null : (product.stock ?? 0) > 0

  const { price, discountPrice } = resolveCurrentPrice(product, flashSaleMap, defaultSize)
  // What the customer is charged; the cart uses `discountPrice || price` too.
  const charged = discountPrice || price
  if (!(price > 0) || !(charged > 0)) return null
  const onSale = charged < price

  const id = product._id.toString()
  const additionalImages = [
    ...new Set(
      (product.images ?? [])
        .map((url) => absoluteUrl(url, siteUrl))
        .filter((url): url is string => url !== null && url !== imageLink)
    ),
  ].slice(0, ADDITIONAL_IMAGES_MAX)

  return {
    id,
    title: cleanTitle(product.name),
    description: cleanDescription(product.description || product.name),
    availability: inStock ? "in stock" : "out of stock",
    condition: "new",
    price: formatPrice(onSale ? price : charged),
    sale_price: onSale ? formatPrice(charged) : "",
    link: `${siteUrl}/shop/${company.slug}/product/${id}`,
    image_link: imageLink,
    additional_image_link: additionalImages.join(","),
    brand: META_FEED_BRAND,
    google_product_category: GOOGLE_PRODUCT_CATEGORY_BY_SLUG[product.category?.slug ?? ""] ?? "",
    product_type: collapseWhitespace(product.category?.name ?? ""),
  }
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toMetaFeedCsv(rows: MetaFeedRow[]): string {
  const lines = [
    META_FEED_COLUMNS.join(","),
    ...rows.map((row) => META_FEED_COLUMNS.map((column) => csvField(row[column])).join(",")),
  ]
  return `${lines.join("\n")}\n`
}

/** The whole feed, read from the database, in the shop's default order. */
export async function buildMetaCatalogCsv(): Promise<string> {
  await connectDB()

  const [products, flashSaleMap] = await Promise.all([
    Product.find({ isActive: true })
      .select("name description price discountPrice salePercentage image images stock sizes isActive company category")
      .populate("company", "slug isActive")
      .populate("category", "name slug")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<FeedProduct[]>(),
    getActiveFlashSaleMap(),
  ])

  const rows = products
    .map((product) => buildMetaFeedRow(product, flashSaleMap))
    .filter((row): row is MetaFeedRow => row !== null)

  // A scheduled "replace" fetch deletes catalog items missing from the feed,
  // so an empty feed would wipe the catalog. Fail instead: Meta then keeps
  // the items from the last good fetch.
  if (rows.length === 0) {
    throw new Error("Meta catalog feed has no products to list")
  }

  return toMetaFeedCsv(rows)
}
