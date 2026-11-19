// @ts-check
// lib/concern-slug-aliases.mjs
//
// Shared by app/concerns/[slug]/page.tsx and next.config.mjs. Plain .mjs so
// the Next config can import it without a TypeScript loader.

/**
 * Database concern slug -> CONCERN_META key in app/concerns/[slug]/page.tsx,
 * for concerns whose admin-created slug differs from the key their
 * landing-page copy is written under (the labels are identical).
 *
 * The concern page looks a slug up as an exact CONCERN_META key first, then
 * through this map, then falls back to the concern's own database copy.
 *
 * Don't fix these by renaming database slugs: the header menu, mobile nav,
 * homepage, /concerns index and search all link the database slugs.
 *
 * REDIRECTS: next.config.mjs turns every entry into a 301 from
 * /concerns/<template slug> to /concerns/<database slug>. Next applies those
 * redirects before any page runs, so if a concern is ever created in the admin
 * with one of the template slugs on the right-hand side (for example
 * "dry-skin"), its page will be unreachable — every visit is redirected — until
 * its entry here is removed.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CONCERN_SLUG_ALIASES = Object.freeze({
  dryness: "dry-skin",
  "dull-tired-skin": "dullness",
  "ensitive-skin-care": "sensitive-skin", // the database slug is missing its leading "s"
  "hair-growth-scalp-nourishment": "hair-growth",
  "skin-brightening-glow": "brightening",
  "scalp-purification-freshness": "scalp-purification",
  "frizz-control-dry-hair": "frizz-control",
  "anti-ageing-care": "anti-ageing",
  "daily-skin-nourishment": "daily-nourishment",
  "sun-exposure-tan-care": "sun-tan-care",
  "deep-cleansing-detox": "deep-cleansing",
  "rough-uneven-skin-texture": "rough-texture",
  "soft-smooth-skin": "soft-skin",
  "stress-relief-relaxation": "stress-relief",
})

/**
 * Template slug -> database slug (the reverse of CONCERN_SLUG_ALIASES).
 * @type {Readonly<Record<string, string>>}
 */
export const CONCERN_DB_SLUG_BY_TEMPLATE = Object.freeze(
  Object.fromEntries(
    Object.entries(CONCERN_SLUG_ALIASES).map(([dbSlug, templateSlug]) => [templateSlug, dbSlug]),
  ),
)

/**
 * 301 redirects from the old /concerns/<template slug> URLs to the
 * database-slug pages, for next.config.mjs. A template slug that is also a
 * database slug in this map is skipped, so a page that exists is never
 * redirected away.
 * @returns {{ source: string, destination: string, statusCode: 301 }[]}
 */
export function concernSlugRedirects() {
  return Object.entries(CONCERN_SLUG_ALIASES)
    .filter(([, templateSlug]) => !Object.hasOwn(CONCERN_SLUG_ALIASES, templateSlug))
    .map(([dbSlug, templateSlug]) => ({
      source: `/concerns/${templateSlug}`,
      destination: `/concerns/${dbSlug}`,
      statusCode: /** @type {301} */ (301),
    }))
}
