// lib/seo.ts
//
// Shared helper for building per-page <Metadata>. Most pages in this app
// are Client Components ("use client"), which can't export `metadata`
// themselves — so a sibling server layout.tsx calls pageMetadata() and
// exports the result instead. Keeps OG/Twitter/canonical shape consistent
// across every route without repeating BRAND wiring each time.

import type { Metadata } from "next"
import { BRAND } from "@/lib/config"

interface PageMetadataInput {
  title: string
  description: string
  path: string // route path starting with "/", e.g. "/about-us"
  image?: string // absolute or root-relative image URL for OG/Twitter
  // Declared OG image size; null when it isn't known (e.g. product photos)
  imageSize?: { width: number; height: number } | null
  keywords?: string
}

/**
 * A product page's path. Its canonical URL and the Meta catalog feed's
 * product links (lib/meta-catalog.ts) both use it, so they always match.
 */
export function productPath(companySlug: string, productId: string): string {
  return `/shop/${companySlug}/product/${productId}`
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  imageSize = { width: 1200, height: 630 },
  keywords,
}: PageMetadataInput): Metadata {
  const url = `${BRAND.domain}${path}`
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${BRAND.domain}${image}`
    : `${BRAND.domain}/nezallogo.png`

  return {
    title: `${title} | ${BRAND.name}`,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      siteName: BRAND.name,
      title: `${title} | ${BRAND.name}`,
      description,
      images: [{ url: ogImage, ...imageSize, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BRAND.name}`,
      description,
      images: [ogImage],
    },
  }
}

// For account/admin/auth/checkout pages — real content, but nothing a
// search engine should ever index or a bot should crawl through.
export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}
