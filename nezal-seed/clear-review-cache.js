/**
 * ============================================================
 *  NEZAL — Clear review/rating cache
 *  clear-review-cache.js
 *
 *  Deletes Redis keys that could hold product ratings, review counts or
 *  review lists, so a bulk review import shows up immediately.
 *
 *  WHAT IS (AND ISN'T) CACHED — as of this script:
 *    - Redis (lib/cache.ts) is only used for `collections:list:*`
 *      (app/api/collections/route.ts). Those entries hold collection
 *      metadata only — no ratings/reviews — so they are NOT cleared here.
 *    - /api/products keeps a 2-minute in-process Map. It can't be cleared
 *      from outside the server process; it expires on its own.
 *    - The home page (app/page.tsx) is ISR with `revalidate = 60`.
 *    - Product pages, the shop grid and /reviews fetch dynamic API routes
 *      with `cache: "no-store"`; the browser-side cache (lib/cacheClient.ts,
 *      localStorage) is per-visitor and refreshes itself within 5 minutes.
 *  So today this script is expected to find nothing. It exists so that if a
 *  product/review cache key is added to Redis later, it gets cleared too.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/clear-review-cache.js            # dry run (default): list matching keys
 *    node nezal-seed/clear-review-cache.js --commit   # delete them
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const Redis = require("ioredis")

// Try to load REDIS_URL from .env.local (same file the Next.js app uses),
// without requiring the "dotenv" package to be installed.
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}
loadEnvLocal()

// Same default as lib/redis.ts.
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Key patterns that could carry product ratings, review counts or reviews.
// `collections:list:*` is intentionally absent — it holds no rating data.
const PATTERNS = ["*review*", "*rating*", "product:*", "products:*", "shop:*", "hero*", "home*"]

function parseArgs(argv) {
  const args = { commit: false }
  for (const a of argv) {
    if (a === "--commit") args.commit = true
    else if (a === "--dry-run") args.commit = false
    else {
      console.error(`❌  Unknown argument "${a}"`)
      process.exit(1)
    }
  }
  return args
}

async function scanKeys(redis, pattern) {
  const keys = []
  let cursor = "0"
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500)
    cursor = next
    keys.push(...batch)
  } while (cursor !== "0")
  return keys
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  console.log(args.commit ? "✍️   COMMIT MODE — matching keys WILL be deleted.\n" : "🔍  DRY RUN — nothing will be deleted. Re-run with --commit to clear.\n")

  const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null })
  redis.on("error", () => {}) // connect() below reports the failure
  console.log(`🔌  Connecting to Redis (${REDIS_URL.replace(/\/\/[^@]*@/, "//***@")})...`)
  try {
    await redis.connect()
  } catch (err) {
    console.error(`❌  Could not connect to Redis: ${err.message}`)
    console.error("    If the app runs without Redis, there is nothing to clear.")
    process.exit(1)
  }
  console.log("✅  Connected.\n")

  const found = new Set()
  for (const pattern of PATTERNS) {
    const keys = await scanKeys(redis, pattern)
    console.log(`   ${pattern.padEnd(12)} → ${keys.length} key(s)`)
    for (const k of keys) {
      found.add(k)
      console.log(`       - ${k}`)
    }
  }

  if (!found.size) {
    console.log("\nNothing to clear — no review/rating keys in Redis.")
  } else if (args.commit) {
    const deleted = await redis.del(...found)
    console.log(`\nDeleted ${deleted} key(s).`)
  } else {
    console.log(`\nWould delete ${found.size} key(s).`)
  }

  await redis.quit()
}

run().catch((err) => {
  console.error("❌  Failed:", err)
  process.exit(1)
})
