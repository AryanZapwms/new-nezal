// Guards the database-slug -> template-slug alias map shared by the concern
// page and next.config.mjs redirects. No database needed.
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import {
  CONCERN_SLUG_ALIASES,
  CONCERN_DB_SLUG_BY_TEMPLATE,
  concernSlugRedirects,
} from "@/lib/concern-slug-aliases.mjs"
import nextConfig from "@/next.config.mjs"

// CONCERN_META lives inside the client page component, so read its keys from
// the source rather than importing the page.
const pageSource = readFileSync(path.resolve(__dirname, "../app/concerns/[slug]/page.tsx"), "utf8")
const metaBlock = pageSource.slice(
  pageSource.indexOf("const CONCERN_META"),
  pageSource.indexOf("const CONCERN_ORDER"),
)
const templateKeys = new Set([...metaBlock.matchAll(/^ {2}"?([a-z-]+)"?: \{$/gm)].map((m) => m[1]))

const aliases = Object.entries(CONCERN_SLUG_ALIASES)

describe("concern slug aliases", () => {
  it("reads all 23 CONCERN_META keys from the page", () => {
    expect(templateKeys.size).toBe(23)
  })

  it("maps 14 database slugs to distinct template slugs", () => {
    expect(aliases).toHaveLength(14)
    expect(new Set(aliases.map(([, t]) => t)).size).toBe(14)
  })

  it("points every alias at a CONCERN_META key, and no aliased database slug is itself a template key", () => {
    for (const [dbSlug, templateSlug] of aliases) {
      expect(templateKeys.has(templateSlug), `${templateSlug} missing from CONCERN_META`).toBe(true)
      expect(templateKeys.has(dbSlug), `${dbSlug} would shadow its alias`).toBe(false)
    }
  })

  it("reverses cleanly", () => {
    for (const [dbSlug, templateSlug] of aliases) {
      expect(CONCERN_DB_SLUG_BY_TEMPLATE[templateSlug]).toBe(dbSlug)
    }
    expect(Object.keys(CONCERN_DB_SLUG_BY_TEMPLATE)).toHaveLength(14)
  })
})

describe("concern slug redirects", () => {
  it("next.config 301-redirects every old template URL to its database-slug page", async () => {
    const redirects = await nextConfig.redirects()
    expect(redirects).toHaveLength(14)
    for (const [dbSlug, templateSlug] of aliases) {
      expect(redirects).toContainEqual({
        source: `/concerns/${templateSlug}`,
        destination: `/concerns/${dbSlug}`,
        statusCode: 301,
      })
    }
  })

  it("never redirects away from a database slug in the map", () => {
    const sources = concernSlugRedirects().map((r) => r.source)
    for (const dbSlug of Object.keys(CONCERN_SLUG_ALIASES)) {
      expect(sources).not.toContain(`/concerns/${dbSlug}`)
    }
  })
})
