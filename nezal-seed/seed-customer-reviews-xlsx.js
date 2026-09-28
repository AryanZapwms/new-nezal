/**
 * ============================================================
 *  NEZAL — Customer Reviews (Excel) Importer
 *  seed-customer-reviews-xlsx.js
 *
 *  Imports customer reviews from an .xlsx workbook. Each tab is a product
 *  family ("Rock Soap") holding one or more product blocks:
 *    <product title>                  e.g. "Jasmine Rock Soap" (col A only)
 *    Rating | Name | Email | Review   ("Email ID" / "Short Review" also accepted)
 *    <data rows>                      Rating is star emojis ("⭐⭐⭐⭐") or a plain 1-5 number.
 *    Columns beyond D are ignored.
 *
 *  PRODUCT MATCHING: a block is imported only if its title matches exactly
 *  one product by name (case-insensitive) or by slug. Anything looser is
 *  reported as candidates and skipped until you confirm it with --map.
 *
 *  SAFE TO RE-RUN: a row is skipped if the product already has a review
 *  with the same email + comment (or the same comment text from an earlier
 *  import), so running this twice will NOT create duplicates.
 *
 *  Reviews are inserted as status "approved" with createdAt spread over the
 *  last ~90 days. The Review schema requires a user ref, so each reviewer
 *  gets a placeholder user (…@imported.nezal) like seed-client-reviews.js.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/seed-customer-reviews-xlsx.js              # dry run (default)
 *    node nezal-seed/seed-customer-reviews-xlsx.js --commit     # actually write
 *
 *  OPTIONS:
 *    --file <path>               workbook to read (default: see DEFAULT_FILES)
 *    --map "Block Title=<slug|id>" confirm the product for an ambiguous or
 *                                  unmatched product block (repeatable)
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const XLSX = require("xlsx")

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

// ── CLI ARGS ─────────────────────────────────────────────────
const DEFAULT_FILES = [
  path.join(__dirname, "data", "customer-reviews.xlsx"),
  path.join(__dirname, "..", "data", "Customer Reviews.xlsx"),
]

function parseArgs(argv) {
  const args = { commit: false, file: null, map: new Map() }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--commit") args.commit = true
    else if (a === "--dry-run") args.commit = false
    else if (a === "--file") args.file = argv[++i]
    else if (a === "--map") {
      const spec = argv[++i] || ""
      const eq = spec.lastIndexOf("=")
      if (eq === -1) {
        console.error(`❌  Bad --map value "${spec}" — expected "Sheet Name=<slug|id>"`)
        process.exit(1)
      }
      args.map.set(normalize(spec.slice(0, eq)), spec.slice(eq + 1).trim())
    } else {
      console.error(`❌  Unknown argument "${a}"`)
      process.exit(1)
    }
  }
  return args
}

// ── MINIMAL SCHEMAS (mirrors lib/models/*) ───────────────────
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isImported: { type: Boolean, default: false },
  },
  { timestamps: true },
)
const User = mongoose.models.User || mongoose.model("User", userSchema)

const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, lowercase: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    collectionSlug: String,
    isActive: Boolean,
    rating: Number,
    reviewCount: Number,
  },
  { timestamps: true },
)
const Product = mongoose.models.Product || mongoose.model("Product", productSchema)

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true },
)
reviewSchema.index({ product: 1, user: 1 }, { unique: true })
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema)

// ── HELPERS ───────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DAYS_BACK = 90

function cellText(v) {
  return v === null || v === undefined ? "" : String(v).trim()
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim()
}

// Looser form for comparing titles: ignores punctuation differences.
function looseKey(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, " ").trim()
}

function toSlug(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "")
}

// Star emojis → count of ⭐; a plain 1-5 number is used as-is.
function parseRating(raw) {
  if (typeof raw === "number") return raw
  const text = cellText(raw)
  if (!text) return NaN
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text)
  const stars = (text.match(/⭐/g) || []).length
  return stars > 0 ? stars : NaN
}

function randomRecentDate() {
  const now = Date.now()
  return new Date(now - Math.floor(Math.random() * DAYS_BACK * 24 * 60 * 60 * 1000))
}

// Deterministic per reviewer so re-runs reuse the same placeholder user.
// Keyed on email when present so two different people who share a first
// name don't collapse into one user (which would hit the product+user index).
function placeholderEmailFor(name, email, comment) {
  const key = email ? `email:${email.toLowerCase()}` : `name:${normalize(name)}|${comment}`
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 8)
  return `${slugify(name) || "reviewer"}.${hash}@imported.nezal`
}

function preview(text, n = 70) {
  const oneLine = text.replace(/\s+/g, " ")
  return oneLine.length > n ? oneLine.slice(0, n - 1) + "…" : oneLine
}

// ── SHEET PARSING ────────────────────────────────────────────
// A tab holds one or more product blocks, each laid out as:
//   <product title>                   (column A only)
//   Rating | Name | Email | Review    (header row; "Email ID" / "Short Review" also accepted)
//   <data rows…>
function isHeaderRow(cells) {
  const [a, b, c, d] = cells.map(normalize)
  return a === "rating" && b === "name" && /^email( id)?$/.test(c) && /^(short )?review$/.test(d)
}

function isTitleRow(cells, nextCells) {
  return !!cellText(cells[0]) && cells.slice(1).every((c) => !cellText(c)) && !!nextCells && isHeaderRow(nextCells)
}

function parseDataRow(cells, rowNum, block) {
  const [rawRating, rawName, rawEmail, rawReview] = cells
  const name = cellText(rawName)
  const email = cellText(rawEmail)
  const comment = cellText(rawReview)
  block.rowsRead++

  const rating = parseRating(rawRating)
  const problems = []
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) problems.push(`rating "${cellText(rawRating)}" is not 1-5`)
  if (!name) problems.push("name is empty")
  if (!comment) problems.push("review text is empty")
  if (problems.length) {
    block.invalid.push({ rowNum, reason: problems.join("; ") })
    return
  }

  if (!email) block.warnings.push(`row ${rowNum} (${name}): email missing — storing placeholder email`)
  else if (!EMAIL_RE.test(email)) block.warnings.push(`row ${rowNum} (${name}): email "${email}" looks invalid — storing as-is`)

  block.valid.push({ rowNum, rating, name, email, comment })
}

function readSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true, raw: true })
  // Only columns A-D matter; anything beyond is ignored.
  const cellsAt = (i) => (rows[i] ? [0, 1, 2, 3].map((c) => rows[i][c]) : null)
  const blocks = []
  const orphanRows = []
  let block = null

  for (let i = 0; i < rows.length; i++) {
    const cells = cellsAt(i)
    if (cells.every((c) => !cellText(c))) continue // fully empty row

    if (isTitleRow(cells, cellsAt(i + 1))) {
      const title = cellText(cells[0])
      block = {
        title,
        // "1. Morning Fresh Bathing Bar" → "Morning Fresh Bathing Bar"
        productName: title.replace(/^\d+\s*[.)]\s*/, ""),
        titleRow: i + 1,
        rowsRead: 0,
        valid: [],
        invalid: [],
        warnings: [],
      }
      blocks.push(block)
      i++ // skip the header row
      continue
    }

    if (!block) orphanRows.push(i + 1)
    else parseDataRow(cells, i + 1, block)
  }

  return { blocks, orphanRows }
}

// ── PRODUCT MATCHING ─────────────────────────────────────────
// Returns { product } for a confident match, otherwise { candidates, reason }.
function matchProduct(sheetKey, lookupName, products, overrides) {
  const override = overrides.get(normalize(sheetKey))
  if (override) {
    const product = products.find(
      (p) => String(p._id) === override || (p.slug || "").toLowerCase() === override.toLowerCase(),
    )
    if (product) return { product, via: "--map" }
    return { candidates: [], reason: `--map target "${override}" not found` }
  }

  const target = normalize(lookupName)
  const byName = products.filter((p) => normalize(p.name) === target)
  if (byName.length === 1) return { product: byName[0], via: "name" }
  if (byName.length > 1) return { candidates: byName, reason: "several products share this exact name" }

  const slug = toSlug(lookupName)
  const bySlug = products.filter((p) => (p.slug || "").toLowerCase() === slug)
  if (bySlug.length === 1) return { product: bySlug[0], via: "slug" }
  if (bySlug.length > 1) return { candidates: bySlug, reason: "several products share this slug" }

  // Anything looser is only a suggestion — never imported without --map.
  const words = looseKey(lookupName).split(" ").filter(Boolean)
  const candidates = products.filter((p) => {
    const pKey = looseKey(p.name)
    return (
      (p.collectionSlug || "").toLowerCase() === slug ||
      pKey.includes(looseKey(lookupName)) ||
      words.every((w) => pKey.split(" ").includes(w))
    )
  })
  return {
    candidates,
    reason: candidates.length ? "no exact match; partial matches need confirmation" : "no matching product",
  }
}

// Mirrors lib/syncProductRating.ts (can't require the TS module from a plain node script).
async function syncProductRating(productId) {
  const approved = await Review.find({ product: productId, status: "approved" }).select("rating").lean()
  const reviewCount = approved.length
  const rating =
    reviewCount > 0
      ? Number((approved.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount).toFixed(1))
      : null
  await Product.findByIdAndUpdate(productId, { rating, reviewCount })
  return { rating, reviewCount }
}

async function findOrCreateReviewerUser(placeholderEmail, name, commit) {
  let user = await User.findOne({ email: placeholderEmail })
  if (!user && commit) {
    const password = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10)
    user = await User.create({
      email: placeholderEmail,
      password,
      name,
      role: "user",
      isActive: true,
      isVerified: false,
      isImported: true, // hidden from user lists/counts — see lib/imported-users.ts
    })
  }
  return user
}

function printTable(rows) {
  const headers = ["sheet", "matched product", "rows read", "inserted", "skipped duplicates", "invalid"]
  const data = rows.map((r) => [r.sheet, r.product, r.rowsRead, r.inserted, r.dupes, r.invalid].map(String))
  const widths = headers.map((h, i) => Math.max(h.length, ...data.map((d) => d[i].length)))
  const line = (cells) => cells.map((c, i) => (i >= 2 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join(" | ")
  console.log(line(headers))
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"))
  for (const d of data) console.log(line(d))
}

// ── MAIN ──────────────────────────────────────────────────────
async function run() {
  const args = parseArgs(process.argv.slice(2))
  const file = args.file ? path.resolve(args.file) : DEFAULT_FILES.find((f) => fs.existsSync(f))
  if (!file || !fs.existsSync(file)) {
    console.error(`❌  Workbook not found. Looked in:\n${(args.file ? [path.resolve(args.file)] : DEFAULT_FILES).map((f) => "     " + f).join("\n")}`)
    process.exit(1)
  }

  console.log(args.commit ? "✍️   COMMIT MODE — changes WILL be written.\n" : "🔍  DRY RUN — nothing will be written. Re-run with --commit to import.\n")
  console.log(`📄  Reading ${path.relative(process.cwd(), file)}`)
  const wb = XLSX.readFile(file)

  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  const products = await Product.find({}).select("name slug company collectionSlug isActive rating reviewCount").lean()
  const summary = []
  const needsDecision = []
  const affected = new Map() // productId -> product
  const unusedMaps = new Set(args.map.keys())

  for (const sheetName of wb.SheetNames) {
    const { blocks, orphanRows } = readSheet(wb.Sheets[sheetName])
    console.log(`━━━━ TAB: ${sheetName} (${blocks.length} product block${blocks.length === 1 ? "" : "s"}) ━━━━`)
    if (orphanRows.length) {
      console.warn(`⚠️   rows ${orphanRows.join(", ")} are outside any product block — ignored`)
    }
    if (!blocks.length) {
      summary.push({ sheet: sheetName, product: "SKIPPED (no product blocks)", rowsRead: 0, inserted: 0, dupes: 0, invalid: 0 })
      console.warn("⚠️   no title + header rows found — tab not imported\n")
      continue
    }

    for (const block of blocks) {
      const label = `${sheetName} › ${block.productName}`
      const row = { sheet: label, product: "—", rowsRead: block.rowsRead, inserted: 0, dupes: 0, invalid: block.invalid.length }
      summary.push(row)

      console.log(`── ${block.title}  (row ${block.titleRow})`)
      if (!block.valid.length) {
        row.product = "SKIPPED (no valid rows)"
        for (const bad of block.invalid) console.warn(`   ✗ row ${bad.rowNum}: ${bad.reason}`)
        console.warn("⚠️   no valid rows — block not imported\n")
        continue
      }

      unusedMaps.delete(normalize(block.productName))
      const match = matchProduct(block.productName, block.productName, products, args.map)
      if (!match.product) {
        row.product = match.candidates.length ? "NEEDS CONFIRMATION" : "UNMATCHED"
        needsDecision.push({ sheetName: block.productName, tab: sheetName, ...match })
        console.warn(`⚠️   ${match.reason} — block not imported\n`)
        continue
      }

      const product = match.product
      row.product = product.name.trim()
      console.log(`   → "${product.name.trim()}" (${product.slug}) matched by ${match.via}${product.isActive === false ? "  ⚠️ product is INACTIVE" : ""}`)
      if (!product.company) {
        row.product += " (no company!)"
        console.warn("⚠️   product has no company — Review.company is required, block not imported\n")
        continue
      }

      for (const w of block.warnings) console.warn(`   ⚠️ ${w}`)
      for (const bad of block.invalid) console.warn(`   ✗ row ${bad.rowNum}: ${bad.reason}`)

      const existing = await Review.find({ product: product._id }).select("user userEmail comment").lean()
      const seenEmailComment = new Set(existing.map((r) => `${normalize(r.userEmail)}|${r.comment.trim()}`))
      const seenComment = new Set(existing.map((r) => normalize(r.comment)))
      const usedUsers = new Set(existing.map((r) => String(r.user)))
      const usedPlaceholders = new Set()

      for (const r of block.valid) {
        const placeholderEmail = placeholderEmailFor(r.name, r.email, r.comment)
        const userEmail = r.email || placeholderEmail

        if (seenEmailComment.has(`${normalize(userEmail)}|${r.comment}`)) {
          row.dupes++
          console.log(`   ↷ row ${r.rowNum}: duplicate of existing review by ${r.name} — skipped`)
          continue
        }
        if (seenComment.has(normalize(r.comment))) {
          row.dupes++
          console.log(`   ↷ row ${r.rowNum}: same review text already on this product (earlier import?) — skipped`)
          continue
        }

        // Review has a unique (product, user) index: one review per reviewer per product.
        const user = await findOrCreateReviewerUser(placeholderEmail, r.name, args.commit)
        if ((user && usedUsers.has(String(user._id))) || usedPlaceholders.has(placeholderEmail)) {
          row.invalid++
          console.warn(`   ✗ row ${r.rowNum}: ${r.name} <${userEmail}> already has a different review on this product — skipped`)
          continue
        }
        usedPlaceholders.add(placeholderEmail)
        if (user) usedUsers.add(String(user._id))
        seenEmailComment.add(`${normalize(userEmail)}|${r.comment}`)
        seenComment.add(normalize(r.comment))

        const createdAt = randomRecentDate()
        if (args.commit) {
          const doc = new Review({
            product: product._id,
            company: product.company,
            user: user._id,
            rating: r.rating,
            comment: r.comment,
            userName: r.name,
            userEmail,
            status: "approved",
            createdAt,
            updatedAt: createdAt,
          })
          // timestamps:false so our spread-out createdAt isn't overwritten with "now".
          await doc.save({ timestamps: false })
          affected.set(String(product._id), product)
        }
        row.inserted++
        console.log(`   ${args.commit ? "✓" : "+"} row ${r.rowNum}: ${"★".repeat(r.rating).padEnd(5)} ${r.name} — "${preview(r.comment)}"`)
      }
      console.log("")
    }
  }

  if (needsDecision.length) {
    console.log("━━ PRODUCT BLOCKS NEEDING A DECISION (not imported) ━━")
    for (const d of needsDecision) {
      console.log(`\n• "${d.sheetName}" (tab "${d.tab}") — ${d.reason}`)
      if (d.candidates.length) {
        for (const c of d.candidates) {
          console.log(`     - ${c.name}  [slug: ${c.slug}]  [id: ${c._id}]${c.isActive === false ? "  (inactive)" : ""}`)
        }
      }
    }
    console.log(`\n   Confirm with: --map "<Block Title>=<product slug or id>"\n`)
  }
  for (const k of unusedMaps) console.warn(`⚠️   --map for "${k}" did not match any product block`)

  if (args.commit && affected.size) {
    console.log("🔄  Syncing product ratings...")
    for (const [id, product] of affected) {
      const { rating, reviewCount } = await syncProductRating(id)
      console.log(`   ${product.name}: rating ${rating ?? "—"}, reviewCount ${reviewCount}`)
    }
    console.log("")
  }

  console.log(args.commit ? "SUMMARY" : "SUMMARY (dry run — \"inserted\" = would insert)")
  printTable(summary)
  const total = summary.reduce((s, r) => s + r.inserted, 0)
  console.log(`\nDone. ${args.commit ? "Inserted" : "Would insert"}: ${total}`)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error("❌  Seed failed:", err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
