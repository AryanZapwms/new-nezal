/**
 * ============================================================
 *  NEZAL — Product name cleanup
 *  fix-product-names.js
 *
 *  Tidies Product.name only:
 *    - trims leading/trailing whitespace
 *    - collapses runs of whitespace (double spaces, tabs, newlines) to one space
 *    - fixes the typo "Shampooo" → "Shampoo"
 *
 *  Slugs and every other field are left untouched, so product URLs don't change.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/fix-product-names.js            # dry run (default): print old → new
 *    node nezal-seed/fix-product-names.js --commit   # apply
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

// ── MINIMAL SCHEMA (mirrors lib/models/product.ts) ───────────
const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, lowercase: true },
  },
  { timestamps: true },
)
const Product = mongoose.models.Product || mongoose.model("Product", productSchema)

// ── HELPERS ───────────────────────────────────────────────────
function cleanName(name) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(S|s)hampooo+\b/g, "$1hampoo")
}

// Makes invisible whitespace changes readable in the dry-run output.
function show(s) {
  return JSON.stringify(s)
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

// ── MAIN ──────────────────────────────────────────────────────
async function run() {
  const args = parseArgs(process.argv.slice(2))
  console.log(args.commit ? "✍️   COMMIT MODE — changes WILL be written.\n" : "🔍  DRY RUN — nothing will be written. Re-run with --commit to apply.\n")

  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  const products = await Product.find({}).select("name slug").lean()
  const changes = products
    .filter((p) => typeof p.name === "string")
    .map((p) => ({ product: p, next: cleanName(p.name) }))
    .filter(({ product, next }) => next !== product.name)

  for (const { product, next } of changes) {
    console.log(`   ${show(product.name)} → ${show(next)}   [slug: ${product.slug}, unchanged]`)
    if (args.commit) {
      // $set name only — timestamps:false so updatedAt isn't touched.
      await Product.updateOne({ _id: product._id }, { $set: { name: next } }, { timestamps: false })
    }
  }

  const clash = new Map()
  for (const p of products) {
    const key = cleanName(p.name || "").toLowerCase()
    clash.set(key, [...(clash.get(key) || []), p])
  }
  for (const [, group] of clash) {
    if (group.length > 1) {
      console.warn(`⚠️   ${group.length} products share the cleaned name "${cleanName(group[0].name)}": ${group.map((p) => p.slug).join(", ")}`)
    }
  }

  console.log(`\nDone. ${args.commit ? "Renamed" : "Would rename"}: ${changes.length} of ${products.length} products`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("❌  Failed:", err)
  process.exit(1)
})
