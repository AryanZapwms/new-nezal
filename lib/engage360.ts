// lib/engage360.ts
//
// Shiprocket Engage 360 (formerly Wigzo) browser tracking. Every wigzo() call
// in the app goes through this file; the loader is in components/analytics.tsx.
//
// The loader defines window.wigzo as a queue before its script downloads, so
// a call made before the script arrives is kept and sent once it does:
// nothing here waits for it. The helpers do nothing on the server or when the
// loader isn't on the page (NEXT_PUBLIC_WIGZO_KEY unset), and never throw:
// tracking must never break the page it runs on.
//
// Product ids are the Mongo _id, the same id the Meta Pixel and the Meta
// catalog feed use (lib/meta-catalog.ts).

import { BRAND } from "@/lib/config"
import { absoluteUrl, cleanDescription, cleanTitle } from "@/lib/catalog-format"
import { isFastrrPlaceholderEmail } from "@/lib/fastrr-email"
import { productPath } from "@/lib/seo"

/** A product, as productview and addtocart send it. */
export interface EngageProduct {
  productId: string
  title: string
  /** The price on screen */
  price: number
  /** The struck-through price; only when the product is on sale */
  previousPrice?: number
  image?: string
  productUrl?: string
  canonicalURL?: string
  description?: string
  category?: string
  tags?: string[]
  /** First word of a signed-in customer's name; never sent for guests */
  firstname?: string
  language: "en"
}

/** A category or collection page, as categoryview sends it. */
export interface EngageCategory {
  title: string
  canonicalURL: string
  categoryUrl: string
  image?: string
}

export interface EngageUser {
  email?: string | null
  phone?: string | null
  fullName?: string | null
}

interface EngageEvents {
  productview: EngageProduct
  addtocart: EngageProduct
  categoryview: EngageCategory
}

export type EngageEvent = keyof EngageEvents

declare global {
  interface Window {
    wigzo?: (...args: unknown[]) => void
  }
}

// First name of the signed-in customer, null for a guest. Kept up to date from
// the session by components/engage360-identify.tsx, for addtocart: the cart
// store can't read the session itself.
let signedInFirstName: string | null = null

/** First word of a name, or null when there is none. */
export function firstNameOf(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null
}

/** Pass the signed-in customer's name, or null once nobody is signed in. */
export function setEngageSignedInName(name: string | null | undefined): void {
  signedInFirstName = firstNameOf(name)
}

export function getEngageSignedInFirstName(): string | null {
  return signedInFirstName
}

/** True when this build has an Engage 360 key, i.e. the loader is on the page. */
export function isEngageEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_WIGZO_KEY)
}

function callWigzo(...args: unknown[]): void {
  if (typeof window === "undefined" || typeof window.wigzo !== "function") return
  try {
    window.wigzo(...args)
  } catch (error) {
    console.error("[engage360] wigzo call failed:", error)
  }
}

export function engageTrack<E extends EngageEvent>(event: E, payload: EngageEvents[E]): void {
  callWigzo("track", event, payload)
}

/**
 * Sends whichever of email, phone and fullName are set. Shiprocket's
 * <phone>@fastrr.com placeholder is never sent as an email, and with neither
 * an email nor a phone there is nobody to identify, so nothing is sent.
 */
export function engageIdentify(user: EngageUser): void {
  const email = user.email?.trim()
  const phone = user.phone?.trim()
  const fullName = user.fullName?.trim()
  const realEmail = email && !isFastrrPlaceholderEmail(email) ? email : undefined
  if (!realEmail && !phone) return

  callWigzo("identify", {
    ...(realEmail && { email: realEmail }),
    ...(phone && { phone }),
    ...(fullName && { fullName }),
  })
}

export interface EngageProductInput {
  productId: string
  name: string
  /** The price on screen (after any sale) */
  price: number
  /** The price before any sale; sent as previousPrice only when higher than price */
  fullPrice?: number | null
  image?: string | null
  /** Builds the product's URL; without it no URL is sent */
  companySlug?: string | null
  description?: string | null
  category?: string | null
  /** Real product attributes only (concerns, skin types); empty means no tags */
  tags?: (string | null | undefined)[] | null
  /** The signed-in customer's first name; null or unset for guests */
  firstname?: string | null
}

/** Details a cart item doesn't carry, passed to addItem by callers that have them. */
export type EngageProductDetails = Pick<EngageProductInput, "description" | "category" | "tags">

export function engageProduct(input: EngageProductInput): EngageProduct {
  const url = input.companySlug ? `${BRAND.domain}${productPath(input.companySlug, input.productId)}` : undefined
  const image = absoluteUrl(input.image, BRAND.domain) ?? undefined
  const description = input.description ? cleanDescription(input.description) : ""
  const tags = [...new Set((input.tags ?? []).map((tag) => tag?.trim()).filter((tag): tag is string => !!tag))]
  const firstname = input.firstname?.trim()

  return {
    productId: input.productId,
    title: cleanTitle(input.name),
    price: input.price,
    ...(input.fullPrice != null && input.fullPrice > input.price && { previousPrice: input.fullPrice }),
    ...(image && { image }),
    ...(url && { productUrl: url, canonicalURL: url }),
    ...(description && { description }),
    ...(input.category && { category: input.category }),
    ...(tags.length > 0 && { tags }),
    ...(firstname && { firstname }),
    language: "en",
  }
}

/** `path` is the page's route path, e.g. "/collections/neem". */
export function engageCategory(input: { title: string; path: string; image?: string | null }): EngageCategory {
  const url = `${BRAND.domain}${input.path}`
  const image = absoluteUrl(input.image, BRAND.domain) ?? undefined
  return {
    title: input.title,
    canonicalURL: url,
    categoryUrl: url,
    ...(image && { image }),
  }
}
