/**
 * ============================================================
 *  NEZAL — Resync Product.rating / Product.reviewCount
 *  resync-product-ratings.js
 *
 *  Recomputes every product's rating snapshot from its APPROVED reviews,
 *  using the same logic as lib/syncProductRating.ts (average rounded to one
 *  decimal, null when there are no approved reviews). Fixes products whose
 *  snapshot went stale before the app called syncProductRating.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/resync-product-ratings.js            # dry run (default): list mismatches
 *    node nezal-seed/resync-product-ratings.js --commit   # write the corrected values
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")

// Try to load MONGODB_URI from .env.local (same file the Next.js app uses),
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

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("❌  Could not find MONGODB_URI — set it as an env var, or add it to .env.local in the project root.")
  process.exit(1)
}

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

// Mirrors lib/syncProductRating.ts: approved reviews only.
function computeSnapshot(ratings) {
  const reviewCount = ratings.length
  const rating =
    reviewCount > 0 ? Number((ratings.reduce((sum, r) => sum + (r || 0), 0) / reviewCount).toFixed(1)) : null
  return { rating, reviewCount }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  console.log(args.commit ? "✍️   COMMIT MODE — changes WILL be written.\n" : "🔍  DRY RUN — nothing will be written. Re-run with --commit to apply.\n")

  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  const db = mongoose.connection.db
  const ratingsByProduct = new Map()
  const approved = await db.collection("reviews").find({ status: "approved" }).project({ product: 1, rating: 1 }).toArray()
  for (const r of approved) {
    const key = String(r.product)
    if (!ratingsByProduct.has(key)) ratingsByProduct.set(key, [])
    ratingsByProduct.get(key).push(r.rating)
  }

  const products = await db.collection("products").find({}).project({ name: 1, rating: 1, reviewCount: 1 }).toArray()
  let changed = 0
  for (const p of products) {
    const next = computeSnapshot(ratingsByProduct.get(String(p._id)) || [])
    const current = { rating: p.rating ?? null, reviewCount: p.reviewCount || 0 }
    if (current.rating === next.rating && current.reviewCount === next.reviewCount) continue
    changed++
    console.log(`   ${(p.name || "").trim()}: ${current.rating ?? "—"} (${current.reviewCount}) → ${next.rating ?? "—"} (${next.reviewCount})`)
    if (args.commit) {
      await db.collection("products").updateOne({ _id: p._id }, { $set: next })
    }
  }

  console.log(`\nDone. ${args.commit ? "Updated" : "Would update"}: ${changed} of ${products.length} products`)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error("❌  Failed:", err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
