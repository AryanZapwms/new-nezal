// app/meta-catalog.csv/route.ts
//
// GET /meta-catalog.csv: the product feed Meta Commerce Manager fetches on a
// schedule (built by lib/meta-catalog.ts). Public on purpose, since it only
// carries what the product pages already show. It sits outside /api because
// robots.txt disallows /api.
import { getOrSetCache } from "@/lib/cache"
import { buildMetaCatalogCsv } from "@/lib/meta-catalog"

export const dynamic = "force-dynamic"

const CACHE_KEY = "meta-catalog:csv"
const CACHE_TTL_SECONDS = 15 * 60

export async function GET() {
  try {
    const csv = await getOrSetCache(CACHE_KEY, CACHE_TTL_SECONDS, buildMetaCatalogCsv)
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    })
  } catch (error) {
    console.error("[meta-catalog] Failed to build the feed:", error)
    return new Response("Feed temporarily unavailable", { status: 500 })
  }
}
