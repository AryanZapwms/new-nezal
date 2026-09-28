/**
 * ============================================================
 *  NEZAL — Re-spread imported review dates
 *  respread-review-dates.js
 *
 *  Gives every IMPORTED review (owned by an @imported.nezal / isImported
 *  placeholder user) a new random createdAt within the last N days, with
 *  updatedAt set to match. Real customer reviews are never touched.
 *
 *  The product page shows review dates as "Mon YYYY", so reviews spread over
 *  only ~90 days all read "Jul/Aug/Sep 2026". A wider window gives varied
 *  month labels.
 *
 *  Each --commit run picks NEW random dates — run it once.
 *
 *  USAGE (from the project root):
 *    node nezal-seed/respread-review-dates.js                 # dry run, last 730 days
 *    node nezal-seed/respread-review-dates.js --days 365      # dry run, custom window
 *    node nezal-seed/respread-review-dates.js --commit        # apply
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

const DEFAULT_DAYS = 730 // ~24 months
const IMPORTED_EMAIL_REGEX = /@imported\.nezal$/i
const DAY_MS = 24 * 60 * 60 * 1000

function parseArgs(argv) {
  const args = { commit: false, days: DEFAULT_DAYS }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--commit") args.commit = true
    else if (a === "--dry-run") args.commit = false
    else if (a === "--days") {
      args.days = Number(argv[++i])
      if (!Number.isInteger(args.days) || args.days < 1) {
        console.error("❌  --days must be a positive whole number")
        process.exit(1)
      }
    } else {
      console.error(`❌  Unknown argument "${a}"`)
      process.exit(1)
    }
  }
  return args
}

function monthKey(date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  console.log(args.commit ? "✍️   COMMIT MODE — changes WILL be written.\n" : "🔍  DRY RUN — nothing will be written. Re-run with --commit to apply.\n")

  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  const db = mongoose.connection.db
  const importedUsers = await db
    .collection("users")
    .find({ $or: [{ isImported: true }, { email: IMPORTED_EMAIL_REGEX }] })
    .project({ _id: 1 })
    .toArray()
  const reviews = await db
    .collection("reviews")
    .find({ user: { $in: importedUsers.map((u) => u._id) } })
    .project({ createdAt: 1, userName: 1 })
    .toArray()
  const totalReviews = await db.collection("reviews").countDocuments()

  const now = Date.now()
  const start = new Date(now - args.days * DAY_MS)
  console.log(`   imported reviews to re-date : ${reviews.length} (of ${totalReviews} total; real customer reviews untouched)`)
  console.log(`   new window                  : ${start.toISOString().slice(0, 10)} → ${new Date(now).toISOString().slice(0, 10)} (${args.days} days)\n`)

  const plan = reviews.map((r) => ({ review: r, next: new Date(now - Math.floor(Math.random() * args.days * DAY_MS)) }))

  // How the product page ("Mon YYYY") would read afterwards.
  const byMonth = new Map()
  for (const { next } of plan) {
    const key = new Date(next.getFullYear(), next.getMonth(), 1).getTime()
    byMonth.set(key, (byMonth.get(key) || 0) + 1)
  }
  console.log("   reviews per month label after re-dating:")
  for (const [key, n] of [...byMonth.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`     ${monthKey(new Date(key)).padEnd(9)} ${String(n).padStart(3)}  ${"▇".repeat(Math.ceil(n / 3))}`)
  }

  console.log("\n   sample:")
  for (const { review, next } of plan.slice(0, 5)) {
    const before = review.createdAt ? new Date(review.createdAt).toISOString().slice(0, 10) : "—"
    console.log(`     ${String(review.userName || "").padEnd(18)} ${before} → ${next.toISOString().slice(0, 10)}`)
  }

  if (args.commit && plan.length) {
    // updatedAt matches createdAt so the reviews don't all look "edited today".
    const res = await db.collection("reviews").bulkWrite(
      plan.map(({ review, next }) => ({
        updateOne: { filter: { _id: review._id }, update: { $set: { createdAt: next, updatedAt: next } } },
      })),
    )
    console.log(`\nUpdated ${res.modifiedCount} review(s).`)
  }

  console.log(`\nDone. ${args.commit ? "Re-dated" : "Would re-date"}: ${plan.length}`)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error("❌  Failed:", err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
