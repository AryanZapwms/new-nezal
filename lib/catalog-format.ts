// lib/catalog-format.ts
//
// Product text and URL formatting shared by the Meta catalog feed
// (lib/meta-catalog.ts, on the server) and the Engage 360 events
// (lib/engage360.ts, in the browser). Kept free of database imports so
// browser code can use it: lib/meta-catalog.ts loads the Product model.

// Meta's field limits
const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 9999

/** Turns line breaks and runs of spaces into single spaces. */
export function collapseWhitespace(text: string): string {
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
export function absoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  const value = url?.trim()
  if (!value) return null
  const absolute = /^https?:\/\//i.test(value) ? value : value.startsWith("/") ? `${siteUrl}${value}` : null
  // additional_image_link is a comma-separated list, so commas must be encoded
  return absolute && absolute.replace(/ /g, "%20").replace(/,/g, "%2C")
}
