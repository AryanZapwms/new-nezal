/**
 * ============================================================
 *  NEZAL — Client-Provided Reviews Importer
 *  seed-client-reviews.js
 *
 *  Inserts the batch of reviews supplied by the client into the
 *  existing MongoDB database, matched to existing products by slug.
 *
 *  SAFE TO RE-RUN: uses findOneAndUpdate with upsert, keyed on the
 *  same (product, user) pair the Review schema already enforces as
 *  unique, so running this twice will NOT create duplicates.
 *
 *  USAGE:
 *    1. Set your connection string as an env var (don't hardcode it):
 *         export MONGODB_URI="mongodb+srv://...."
 *    2. From the project root:
 *         node nezal-seed/seed-client-reviews.js
 *
 *  NOTE: The "Saffron Designer Soap" review (Sajit, Madhavi) was
 *  skipped — no matching product currently exists in the catalog.
 *  Add it to the REVIEWS array below once that product exists.
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

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

// ── MINIMAL SCHEMAS (mirrors lib/models/*) ───────────────────
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
)
const User = mongoose.models.User || mongoose.model("User", userSchema)

const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, lowercase: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
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
  },
  { timestamps: true },
)
reviewSchema.index({ product: 1, user: 1 }, { unique: true })
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema)

// ── CLIENT REVIEW DATA (verbatim text, exactly as supplied) ──
// nameKeywords: words that must ALL appear (case-insensitive) in the
// product name — used to find the right product even if slugs differ
// from what we expected.
const REVIEWS = [
  {
    nameKeywords: ["lavender", "bath salt"],
    name: "Anu",
    rating: 5,
    comment:
      "Amazing product. I was too stresses and bought this and honestly wasn't expecting much. Lavender fragrance is calming without being overpowering, and this made my bath time feel genuinely relaxing. After around 20 minutes, I felt noticeably more refreshed and less tense. To my surprised my skin felt so smooth after the bath, without any dryness. I liked the premium packaging. Going to use this more often especially on Sundays.",
  },
  {
    nameKeywords: ["lavender", "bath salt"],
    name: "Pariniti",
    rating: 5,
    comment:
      "Really enjoyed this bath salt. The lavender scent is relaxing and not too strong. This helped me unwind after a long week. After the bath, my skin was soft and not dry. The product delivery was exactly what I hoped for. Must try.",
  },
  {
    nameKeywords: ["vitamin c", "niacinamide", "serum"],
    name: "Yuvannsh",
    rating: 4,
    comment:
      "I tried several Vitamin C serums earlier, but this one suited my sensitive skin. I am using this from last 6 weeks, now my skin tone looks more even and some old acne marks appear less noticeable. This serum is lightweight, it absorbs quickly, and sits well under moisturiser and makeup. Results are gradual rather than exaggerated. Did not have any irritation or breakouts, and enough improvement for me to confidently add it to my regular skincare routine.",
  },
  {
    nameKeywords: ["saffron", "sandalwood", "turmeric"],
    name: "Nitin",
    rating: 4,
    comment:
      "I was not very sure when I ordered this soap. Usually a soap is a basic purchase, but this bar feels like genuinely premium. Its saffron, sandalwood, and turmeric fragrance is elegant without being overwhelming. Soap doesn't become soft or mushy after a few uses. After regular use for a couple of weeks, my skin felt smoother, especially during cooler weather.",
  },
  {
    nameKeywords: ["saffron", "sandalwood", "turmeric"],
    name: "Karan",
    rating: 5,
    comment:
      "This soap feels noticeably more premium than the regular bars. Fragrance is rich and pleasant, and the bar lasts much longer than expected. It lathers well, cleans effectively, and leaves my skin feeling comfortable rather than dry. Excellent quality from the first use itself. Although it's little more expensive than ordinary soap, but the performance and longevity justifies the cost.",
  },
  {
    nameKeywords: ["redensyl", "anagain", "serum"],
    name: "Amit Ag",
    rating: 4,
    comment:
      "I started using Nezal hair serum after experiencing increased hair fall and decided to give it a proper trial. After around two months of use, I noticed that my hair shedding is reduced and I saw some new growth around my hairline. It's a lightweight serum, very easy to apply, and doesn't leave my scalp greasy. The bottle and equipment to use comes with the box so I don't have to buy anything. The fragrance is mild. I know it is not an overnight solution and I need to be patient and consistent, for which I am ready looking at the results. Good Product.",
  },
  {
    // NOTE: source text had this reviewer's name garbled ("shouleview 2").
    // Kept literally as supplied — correct via admin panel if you know the real name.
    nameKeywords: ["redensyl", "anagain", "serum"],
    name: "shouleview 2",
    rating: 4,
    comment:
      "I've been using this serum every night since last 2 and half months and have seen a noticeable reduction in hair fall. It is easy to apply directly to the scalp. Not too much of smell but has mild fragrance. Results will take time as expected with such products. As of now, it has given me enough confidence to continue using it long term.",
  },
  {
    nameKeywords: ["cedarwood", "massage oil"],
    name: "Rajesh Maheshka",
    rating: 5,
    comment:
      "I purchased this massage oil for my father and he was very happy after the use. He told me that the cedarwood fragrance is warm, calming, and not overly sweet. It provides excellent glide during massage without leaving an oily residue afterwards. The use of oil is low and it goes a long way, so the bottle lasts surprisingly well.",
  },
  {
    nameKeywords: ["cedarwood", "massage oil"],
    name: "Rohit",
    rating: 5,
    comment:
      "This massage oil has now become a part of my weekly relaxation routine. The scent is warm and soothing without being overpowering. It spreads easily, provides good glide during massage, and doesn't leave the skin feeling excessively greasy afterwards. The quality is premium and a small goes a long way. An amazing feeling and a great choice if you're looking to create a simple at-home spa experience. It has actually helped turn a simple massage into a relaxing weekly ritual. It's now one of those products I genuinely look forward to using regularly.",
  },
]

// ── HELPERS ───────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "")
}

// Cache so we only print "found via keyword search" once per unique keyword set
const productCache = new Map()

async function findProductByKeywords(keywords) {
  const cacheKey = keywords.join("|")
  if (productCache.has(cacheKey)) return productCache.get(cacheKey)

  const andConditions = keywords.map((kw) => ({ name: { $regex: kw, $options: "i" } }))
  const matches = await Product.find({ $and: andConditions })

  let result = null
  if (matches.length === 1) {
    result = matches[0]
  } else if (matches.length > 1) {
    console.warn(
      `⚠️   Multiple products match [${keywords.join(", ")}]: ${matches
        .map((m) => `"${m.name}" (${m.slug})`)
        .join(", ")} — using the first one. Adjust nameKeywords to narrow this down if wrong.`,
    )
    result = matches[0]
  }
  productCache.set(cacheKey, result)
  return result
}
async function findOrCreateReviewerUser(name) {
  const placeholderEmail = `${slugify(name)}@imported.nezal`
  let user = await User.findOne({ email: placeholderEmail })
  if (!user) {
    const password = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10)
    user = await User.create({
      email: placeholderEmail,
      password,
      name,
      role: "user",
      isActive: true,
      isVerified: true,
    })
    console.log(`   + created placeholder user for "${name}" (${placeholderEmail})`)
  }
  return user
}

// ── MAIN ──────────────────────────────────────────────────────
async function run() {
  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  let created = 0
  let updated = 0
  let skipped = 0

  for (const r of REVIEWS) {
    const product = await findProductByKeywords(r.nameKeywords)
    if (!product) {
      console.warn(`⚠️   Skipping review by "${r.name}" — no product matched keywords [${r.nameKeywords.join(", ")}]`)
      skipped++
      continue
    }

    const user = await findOrCreateReviewerUser(r.name)
    const userEmail = user.email

    const result = await Review.findOneAndUpdate(
      { product: product._id, user: user._id },
      {
        product: product._id,
        company: product.company,
        user: user._id,
        rating: r.rating,
        comment: r.comment,
        userName: r.name,
        userEmail,
      },
      { upsert: true, new: true, rawResult: true },
    )

    if (result.lastErrorObject?.upserted) {
      created++
      console.log(`   ✓ added review by "${r.name}" on "${product.name}"`)
    } else {
      updated++
      console.log(`   ↻ updated existing review by "${r.name}" on "${product.name}"`)
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("❌  Seed failed:", err)
  process.exit(1)
})