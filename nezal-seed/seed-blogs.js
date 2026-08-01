/**
 * ============================================================
 *  NEZAL — Blog Seed Script
 *  seed-blogs.js
 *
 *  Inserts starter blog posts into the existing MongoDB database,
 *  linked to the admin user and Nezal Herbocare company.
 *
 *  SAFE TO RE-RUN: uses findOneAndUpdate with upsert, keyed on
 *  slug (which is unique on the Blog schema), so running this
 *  twice will NOT create duplicates — it just updates existing posts.
 *
 *  USAGE:
 *    1. Make sure MONGODB_URI is set in .env.local at the project root
 *       (same file the Next.js app uses), or export it manually:
 *         export MONGODB_URI="mongodb+srv://...."
 *    2. From the project root:
 *         node nezal-seed/seed-blogs.js
 * ============================================================
 */

const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")

// ── Load MONGODB_URI from .env.local, same pattern as seed-client-reviews.js ──
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
    name: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
)
const User = mongoose.models.User || mongoose.model("User", userSchema)

const companySchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, lowercase: true },
  },
  { timestamps: true },
)
const Company = mongoose.models.Company || mongoose.model("Company", companySchema)

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    excerpt: String,
    image: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    tags: [String],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
)
const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema)

// ── BLOG DATA ──────────────────────────────────────────────────
const BLOGS = [
  {
    title: "Why Niacinamide Belongs in Every Skincare Routine",
    slug: "why-niacinamide-belongs-in-every-skincare-routine",
    excerpt:
      "A closer look at Niacinamide — the quiet workhorse behind clearer, calmer, more balanced-looking skin — and why it's central to our face serum.",
    content: `<p>If you've spent any time reading skincare labels lately, you've probably seen Niacinamide listed near the top. It's not a trend ingredient — it's a form of Vitamin B3 that's been studied for decades, and for good reason.</p>

<h2>What Niacinamide Actually Does</h2>
<p>Niacinamide supports the skin's natural barrier, helps even out the look of skin tone, and works well alongside almost every other active ingredient — which is part of why it's so widely used. Unlike stronger actives that can be harsh on sensitive skin, Niacinamide tends to be well tolerated by most skin types, including oily, combination, and acne-prone skin.</p>

<h2>What to Expect</h2>
<p>Skincare results take time and consistency — there's no honest shortcut here. With regular use, many people notice their skin looking calmer, more even, and less prone to excess shine over several weeks of consistent use.</p>

<h2>How We Use It</h2>
<p>In our face serum, Niacinamide is formulated at a supportive concentration alongside complementary botanicals, so it works with your skin rather than overwhelming it. We name it on the label because we believe you should always know exactly what you're putting on your skin.</p>

<h2>Making It Part of Your Routine</h2>
<p>A simple way to start: cleanse, apply a few drops of serum to damp skin, follow with a moisturizer, and always finish your morning routine with sunscreen. Small, consistent steps tend to outperform complicated ten-step routines.</p>`,
    tags: ["skincare", "niacinamide", "ingredients", "face-serum"],
    isPublished: true,
  },
  {
    title: "Redensyl and the Science of Stronger-Looking Hair",
    slug: "redensyl-and-the-science-of-stronger-looking-hair",
    excerpt:
      "Hair thinning is one of the most common concerns we hear about. Here's what Redensyl is, how it's studied to work, and what a realistic timeline looks like.",
    content: `<p>Hair concerns are deeply personal, and they're also one of the questions we get asked about most. So let's talk plainly about one ingredient that's become central to modern hair care: Redensyl.</p>

<h2>What Is Redensyl?</h2>
<p>Redensyl is a plant-derived complex developed to support the hair growth cycle at the follicle level. It's designed as a gentler alternative within hair care formulations, aimed at supporting the look and feel of fuller hair over time.</p>

<h2>Setting Realistic Expectations</h2>
<p>No topical hair product works overnight, and we'd rather be honest about that than make promises we can't keep. Visible changes in hair care typically take consistent use over 8–12 weeks, as hair growth itself is a slow biological process.</p>

<h2>Why We Chose It</h2>
<p>We formulated our hair serum around Redensyl because it fit our broader philosophy: effective ingredients, honestly labeled, without unnecessary harshness. It's paired with supporting botanicals — Anagain and Biotin — that nourish the scalp environment as a whole.</p>

<h2>Getting the Most From Your Hair Serum</h2>
<p>Consistency matters more than quantity. A small amount applied directly to a clean, dry or towel-dried scalp, massaged in gently, tends to work better than a heavy application used sporadically.</p>`,
    tags: ["haircare", "redensyl", "ingredients", "hair-serum"],
    isPublished: true,
  },
  {
    title: "Ayurveda Meets Modern Formulation: How We Think About Skincare",
    slug: "ayurveda-meets-modern-formulation",
    excerpt:
      "Natural doesn't have to mean unscientific. Here's how we bring traditional Ayurvedic ingredients and modern formulation science together in every product.",
    content: `<p>There's a common misconception that you have to choose between "natural" skincare and "effective" skincare — as though the two are opposites. We've never believed that, and it shapes everything we make.</p>

<h2>Where Tradition Meets Formulation Science</h2>
<p>Ingredients like Aloe Vera, Shea Butter, and Saffron have been used in skincare and wellness practices for generations. What's changed is our understanding of exactly how and why they work — which lets us formulate them more precisely, at concentrations designed for visible benefit, not just tradition for tradition's sake.</p>

<h2>Aloe Vera: More Than a Soothing Gel</h2>
<p>Aloe Vera is often reduced to "the sunburn plant," but its benefits go further — supporting hydration and helping the skin feel calmer after exposure to environmental stress. We use it across multiple product lines for exactly this reason.</p>

<h2>Himalayan Salt: Wellness Beyond the Skin's Surface</h2>
<p>In our bath salts, Himalayan Salt isn't there for aesthetics. It's chosen for its mineral composition and the ritual of a warm soak — a moment of genuine wind-down in an otherwise fast-paced day.</p>

<h2>Why This Matters to Us</h2>
<p>Every formulation we release is manufactured under strict quality standards, with ingredients we can name plainly on the label. We're not choosing between "natural" and "effective" — we're formulating for both, deliberately, every time.</p>`,
    tags: ["ayurveda", "ingredients", "brand-philosophy", "natural-skincare"],
    isPublished: true,
  },
]

// ── MAIN ──────────────────────────────────────────────────────
async function run() {
  console.log("🔌  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected.\n")

  // ── Find the admin user and company to attach these blogs to ──
  const admin = await User.findOne({ role: "admin" })
  if (!admin) {
    console.error("❌  No admin user found. Run seed.js first to create the admin account.")
    process.exit(1)
  }

  const company = await Company.findOne({ slug: "nezal-herbocare" })
  if (!company) {
    console.error("❌  Company 'nezal-herbocare' not found. Run seed.js first.")
    process.exit(1)
  }

  console.log(`👤  Attaching posts to admin: ${admin.name} (${admin.email})`)
  console.log(`🏢  Attaching posts to company: ${company.name}\n`)

  let created = 0
  let updated = 0

  for (const post of BLOGS) {
    const result = await Blog.findOneAndUpdate(
      { slug: post.slug },
      {
        ...post,
        author: admin._id,
        company: company._id,
      },
      { upsert: true, new: true, rawResult: true },
    )

    if (result.lastErrorObject?.upserted) {
      created++
      console.log(`   ✓ created "${post.title}"`)
    } else {
      updated++
      console.log(`   ↻ updated "${post.title}"`)
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("❌  Seed failed:", err)
  process.exit(1)
})