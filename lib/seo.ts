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
  keywords?: string
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  keywords,
}: PageMetadataInput): Metadata {
  const url = `${BRAND.domain}${path}`
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${BRAND.domain}${image}`
    : `${BRAND.domain}/nezallogo.jpg`

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
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
