/**
 * ============================================================
 *  NEZAL HERBOCARE — Products-Only Seed Script
 *  nezal-seed/seed-nezal-products.js
 *
 *  Run:  node nezal-seed/seed-nezal-products.js
 *
 *  ⚠️  PRODUCTS-ONLY — does NOT wipe users, orders, reviews
 *      Only wipes: Category + Product documents for this company
 *
 *  Seeds (from real Nezal product list):
 *    - 8 Categories
 *    - 70+ Products across all categories with real prices,
 *      descriptions, sizes, ingredients, and benefits
 * ============================================================
 */

const mongoose = require("mongoose")

// ── CONNECTION ──────────────────────────────────────────────
const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority"

// ── SCHEMAS (minimal — just enough to write to DB) ──────────

const categorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    slug:        { type: String, required: true, lowercase: true },
    description: String,
    image:       String,
    company:     { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    parent:      { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
)
delete mongoose.models.Category
const Category = mongoose.model("Category", categorySchema)

const productSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    slug:          { type: String, required: true, lowercase: true },
    description:   String,
    price:         { type: Number, required: true },
    discountPrice: Number,
    image:         String,
    images:        [String],
    category:      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    company:       { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    stock:         { type: Number, default: 100 },
    sku:           String,
    ingredients:   [String],
    benefits:      [String],
    usage:         String,
    suitableFor:   [String],
    collectionSlug: { type: String, lowercase: true, trim: true },
    variantLabel:   { type: String, trim: true },
    skinTypes:      { type: [String], default: [] },
    concerns:       { type: [String], default: [] },
    keyIngredients: [{ name: String, benefit: String, icon: String }],
    ritualStep:     { type: String, enum: ["cleanse", "exfoliate", "treat", "moisturize", "protect", "style", "other"], default: "other" },
    results:       [{ image: String, title: String, text: String }],
    sizes: [
      {
        size:          String,
        unit:          { type: String, enum: ["ml", "l", "g", "kg"], default: "ml" },
        quantity:      Number,
        price:         Number,
        discountPrice: Number,
        stock:         { type: Number, default: 100 },
        sku:           String,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true }
)
delete mongoose.models.Product
const Product = mongoose.model("Product", productSchema)

// ── HELPERS ─────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ══════════════════════════════════════════════════════════
//  SEED FUNCTION
// ══════════════════════════════════════════════════════════

async function seed() {
  console.log("\n🌱  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected to nezal-db\n")

  // ── 1. FIND COMPANY ──────────────────────────────────────
  const companyDoc = await mongoose.connection.db
    .collection("companies")
    .findOne({ slug: "nezal-herbocare" })
  if (!companyDoc) throw new Error("Company 'nezal-herbocare' not found. Run seed.js first.")
  const companyId = companyDoc._id
  console.log(`🏢  Found company: ${companyDoc.name} (${companyId})\n`)

  // ── 2. WIPE EXISTING CATEGORIES + PRODUCTS FOR THIS COMPANY
  console.log("🗑️   Wiping existing categories and products for this company...")
  await Category.deleteMany({ company: companyId })
  await Product.deleteMany({ company: companyId })
  console.log("✅  Cleared\n")

  // ── 3. CATEGORIES ────────────────────────────────────────
  console.log("📂  Seeding categories...")

  const categoryData = [
    { name: "Hair Care",        slug: "hair-care",        description: "Natural hair care — shampoos, conditioners, serums for strong healthy hair",    image: "/categories/hair-care.jpg"        },
    { name: "Body Care",        slug: "body-care",        description: "Nourishing body lotions, oils, scrubs and gels for soft glowing skin",           image: "/categories/body-care.jpg"        },
    { name: "Face Care",        slug: "face-care",        description: "Complete face care — face wash, serums and creams for glowing skin",             image: "/categories/face-care.jpg"        },
    { name: "Bath & Shower",    slug: "bath-shower",      description: "Bath salts, shower gels and handwashes for a refreshing cleanse",               image: "/categories/bath-shower.jpg"      },
    { name: "Soaps",            slug: "soaps",            description: "Handcrafted natural soaps — Rock, Designer, Round, Premium, Aissis, Chip",       image: "/categories/soaps.jpg"            },
    { name: "Intimate Hygiene", slug: "intimate-hygiene", description: "Gentle pH-balanced intimate hygiene washes for daily care",                     image: "/categories/intimate-hygiene.jpg" },
    { name: "Gift Kits",        slug: "gift-kits",        description: "Beautifully curated gift sets for every occasion",                               image: "/categories/gift-kits.jpg"        },
    { name: "Massage Oil",      slug: "massage-oil",      description: "Relaxing body massage oils for deep muscle relief and skin nourishment",         image: "/categories/massage-oil.jpg"      },
  ]

  const categories = await Category.insertMany(
    categoryData.map((c) => ({ ...c, company: companyId, isActive: true }))
  )
  console.log(`   ✓ ${categories.length} categories created`)

  // Helper: find category ObjectId by slug
  const cat = (slug) => categories.find((c) => c.slug === slug)?._id

  // ── 4. PRODUCTS ──────────────────────────────────────────
  console.log("📦  Building products data...")

  const productsData = [

    // ════════════════════════════════════════════════════════
    //  HAIR CARE
    // ════════════════════════════════════════════════════════

    // ── Shampoos ────────────────────────────────────────────

    {
      name: "Black Pepper & Cucumber Dandruff Control Shampoo 250ml",
      slug: "black-pepper-cucumber-dandruff-shampoo-250ml",
      description: "A carefully designed combination that helps reduce dandruff naturally. Black pepper extract contains vitamins B, C and potassium which help reduce dandruff-causing dry skin flakes. In combination with cucumber extract — which balances the skin's pH — this makes a potent anti-dandruff formula. Honey adds a smooth, shiny feel to hair.",
      price: 140,
      image: "/products/black-pepper-cucumber-shampoo.jpg",
      category: cat("hair-care"),
      collectionSlug: "shampoo",
      variantLabel: "Black Pepper & Cucumber (250ml)",
      skinTypes: ["all", "oily-scalp", "dandruff-prone"],
      concerns: ["dandruff", "hairfall"],
      keyIngredients: [
        { name: "Black Pepper Extract", benefit: "Reduces dandruff-causing dry flakes" },
        { name: "Cucumber Extract",     benefit: "Balances scalp pH and soothes irritation" },
        { name: "Honey",                benefit: "Gives hair a smooth shiny feel" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Black Pepper Extract", "Cucumber Extract", "Honey", "Aqua"],
      benefits: ["Dandruff control", "Scalp pH balance", "Smooth shiny hair", "Natural formula"],
      usage: "Apply to wet hair, massage into scalp. Rinse thoroughly with warm water. Follow with conditioner for best results.",
      suitableFor: ["All hair types", "Dandruff-prone scalp", "Oily scalp"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 140, stock: 100, sku: "NZ-SH-BPC-250" },
        { size: "500ml", unit: "ml", quantity: 500, price: 265, stock: 100, sku: "NZ-SH-BPC-500" },
      ],
      sku: "NZ-SH-BPC-250",
      stock: 100,
    },

    {
      name: "Cucumber & Black Pepper Scalp Soothing Dandruff Shampoo 500ml",
      slug: "cucumber-black-pepper-scalp-soothing-dandruff-shampoo-500ml",
      description: "Revitalize your hair and scalp with our Black Pepper & Cucumber Shampoo — expertly blended to stimulate blood flow and reduce dandruff with Black Pepper's natural warming properties. Cucumber soothes and calms irritated scalp while nourishing and hydrating hair with essential vitamins and minerals.",
      price: 265,
      image: "/products/cucumber-black-pepper-shampoo.jpg",
      category: cat("hair-care"),
      collectionSlug: "shampoo",
      variantLabel: "Cucumber & Black Pepper (500ml)",
      skinTypes: ["all", "oily-scalp", "dandruff-prone"],
      concerns: ["dandruff", "hairfall", "scalp-irritation"],
      keyIngredients: [
        { name: "Black Pepper",    benefit: "Anti-fungal properties to reduce dandruff" },
        { name: "Cucumber",        benefit: "Soothes and calms irritated scalp" },
        { name: "Tea Tree Oil",    benefit: "Natural antifungal and antibacterial agent" },
        { name: "Coconut Oil",     benefit: "Moisturizes and nourishes hair follicles" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Black Pepper Extract", "Cucumber Extract", "Tea Tree Oil", "Coconut Oil", "Aqua"],
      benefits: ["Reduces frizz and adds shine", "Eliminates itchiness and flakiness", "Balances scalp pH", "Cruelty-free and vegan"],
      usage: "Apply to wet hair, massage into scalp. Rinse thoroughly with warm water. Follow with conditioner for optimal results.",
      suitableFor: ["All hair types", "Dandruff-prone scalp"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 140, stock: 100, sku: "NZ-SH-CBS-250" },
        { size: "500ml", unit: "ml", quantity: 500, price: 265, stock: 100, sku: "NZ-SH-CBS-500" },
      ],
      sku: "NZ-SH-CBS-500",
      stock: 100,
    },

    {
      name: "Amla & Shikakai Shampoo | Controls Hairloss 250ml",
      slug: "amla-shikakai-hairloss-control-shampoo-250ml",
      description: "Carefully formulated with appropriate proportions of Amla and Shikakai with honey to help stop hair loss. Both Amla and Shikakai are rich in antioxidant properties which reduce free radical movement. Vitamin C in Amla improves blood circulation to the hair follicles. Honey nourishes the hair follicle at the root level.",
      price: 140,
      image: "/products/amla-shikakai-shampoo.jpg",
      category: cat("hair-care"),
      collectionSlug: "shampoo",
      variantLabel: "Amla & Shikakai (250ml)",
      skinTypes: ["all", "hair-fall", "dry-hair"],
      concerns: ["hairfall", "dryness"],
      keyIngredients: [
        { name: "Amla (Indian Gooseberry)", benefit: "Rich in Vitamin C, improves blood circulation to follicles" },
        { name: "Shikakai",                 benefit: "Antioxidant properties reduce free radical damage" },
        { name: "Honey",                    benefit: "Nourishes hair follicles at the root level" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Amla Extract", "Shikakai Extract", "Honey", "Aloe Vera", "Aqua"],
      benefits: ["Controls hair loss", "Strengthens follicles", "Antioxidant protection", "Root nourishment"],
      usage: "Apply to wet hair, massage into scalp for 2 minutes. Rinse well with water. Use 3–4 times per week for best results.",
      suitableFor: ["All hair types", "Hair-loss prone", "Weak hair"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 140, stock: 100, sku: "NZ-SH-AS-250" },
        { size: "500ml", unit: "ml", quantity: 500, price: 265, stock: 100, sku: "NZ-SH-AS-500" },
      ],
      sku: "NZ-SH-AS-250",
      stock: 100,
    },

    {
      name: "Aloe Vera with Amla & Shikakai Shampoo | Controls Hairloss",
      slug: "aloe-vera-amla-shikakai-hairloss-shampoo",
      description: "An enhanced version of the classic Amla & Shikakai formula — with pure Aloe Vera added for extra scalp soothing and hydration. Controls hair loss while keeping hair clean, soft and nourished.",
      price: 265,
      image: "/products/aloe-amla-shikakai-shampoo.jpg",
      category: cat("hair-care"),
      collectionSlug: "shampoo",
      variantLabel: "Aloe Vera + Amla & Shikakai",
      skinTypes: ["all", "hair-fall", "dry-hair"],
      concerns: ["hairfall", "dryness", "scalp-irritation"],
      keyIngredients: [
        { name: "Aloe Vera",    benefit: "Soothes scalp and adds moisture" },
        { name: "Amla",         benefit: "Vitamin C for blood circulation to follicles" },
        { name: "Shikakai",     benefit: "Natural cleansing and hair conditioning" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Aloe Vera", "Amla Extract", "Shikakai Extract", "Honey", "Aqua"],
      benefits: ["Controls hair loss", "Scalp soothing", "Deep hydration", "Strengthens roots"],
      usage: "Apply to wet hair, massage into scalp for 2 minutes. Rinse well. Use regularly for best results.",
      suitableFor: ["All hair types", "Dry scalp", "Hair-fall prone"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 265, stock: 100, sku: "NZ-SH-AAAS-250" },
      ],
      sku: "NZ-SH-AAAS-250",
      stock: 100,
    },

    {
      name: "Neem & Tulsi with Aloe Vera Shampoo | Hair Growth",
      slug: "neem-tulsi-aloe-vera-hair-growth-shampoo",
      description: "Carefully formulated with Neem & Tulsi extracts with honey to gently clean hair. Both Neem & Tulsi are rich in antioxidants and have mild disinfecting properties to remove infectious dirt. Promotes a healthy scalp environment for better hair growth.",
      price: 140,
      image: "/products/neem-tulsi-shampoo.jpg",
      category: cat("hair-care"),
      collectionSlug: "shampoo",
      variantLabel: "Neem & Tulsi with Aloe Vera",
      skinTypes: ["all", "oily-scalp", "dandruff-prone"],
      concerns: ["hairfall", "dandruff", "scalp-health"],
      keyIngredients: [
        { name: "Neem Extract", benefit: "Antibacterial, removes infectious dirt" },
        { name: "Tulsi",        benefit: "Antioxidant, reduces free radical damage" },
        { name: "Aloe Vera",    benefit: "Soothes and hydrates scalp" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Neem Extract", "Tulsi Extract", "Aloe Vera", "Honey", "Aqua"],
      benefits: ["Promotes hair growth", "Scalp disinfection", "Antioxidant protection", "Gentle cleansing"],
      usage: "Apply to wet hair and scalp, massage gently for 2 minutes. Rinse thoroughly. Use 3–4 times per week.",
      suitableFor: ["All hair types", "Oily scalp", "Dandruff-prone"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 140, stock: 100, sku: "NZ-SH-NTA-250" },
        { size: "500ml", unit: "ml", quantity: 500, price: 265, stock: 100, sku: "NZ-SH-NTA-500" },
      ],
      sku: "NZ-SH-NTA-250",
      stock: 100,
    },

    // ── Conditioner ─────────────────────────────────────────

    {
      name: "Black Grapes Conditioner for Dry, Damaged Hair | Hydrate & Nourish",
      slug: "black-grapes-conditioner-dry-damaged-hair",
      description: "Indulge in the power of black grapes for healthy, luscious locks. Expertly formulated to provide deep nourishment and hydration to dry, damaged, or colour-treated hair. Enriched with the antioxidant power of black grapes, this lightweight yet ultra-hydrating conditioner helps restore moisture, reduce frizz and enhance natural shine.",
      price: 180,
      image: "/products/black-grapes-conditioner.jpg",
      category: cat("hair-care"),
      collectionSlug: "conditioner",
      variantLabel: "Black Grapes",
      skinTypes: ["dry-hair", "damaged-hair", "colour-treated"],
      concerns: ["frizz", "dryness", "hairfall"],
      keyIngredients: [
        { name: "Black Grape Extract", benefit: "Antioxidant-rich, restores moisture and enhances shine" },
        { name: "Vitamins & Minerals", benefit: "Nourishes and moisturizes hair deeply" },
      ],
      ritualStep: "treat",
      ingredients: ["Black Grape Extract", "Vitamins A, C, E", "Mineral Complex", "Conditioning Agents", "Aqua"],
      benefits: ["Deep hydration", "Frizz control and shine", "Hair strengthening", "Colour protection"],
      usage: "After shampooing, apply on hair lengths. Leave for 2–3 minutes. Rinse thoroughly with water.",
      suitableFor: ["Dry hair", "Damaged hair", "Colour-treated hair", "Frizzy hair"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 180, stock: 100, sku: "NZ-CN-BG-250" },
      ],
      sku: "NZ-CN-BG-250",
      stock: 100,
    },

    // ── Hair Serum ───────────────────────────────────────────

    {
      name: "Advanced Hair Regrowth Serum | Anagain & Redensyl",
      slug: "advanced-hair-regrowth-serum-anagain-redensyl",
      description: "Anagain and Redensyl are nature-derived actives that enhance blood flow at your hair root level, strengthening existing hair and regenerating new hair follicles. Camellia Sinensis Leaf Extract protects hair from UV damage. Anagain (from pea sprouts) aids hair regrowth from the root. This combination works synergistically to stop hair loss and regenerate natural hair.",
      price: 2100,
      image: "/products/hair-regrowth-serum.jpg",
      category: cat("hair-care"),
      collectionSlug: "hair-serum",
      variantLabel: "Anagain & Redensyl",
      skinTypes: ["all", "thinning-hair", "hair-fall"],
      concerns: ["hairfall", "thinning-hair"],
      keyIngredients: [
        { name: "Anagain",                        benefit: "Pea sprout extract that regrows hair from root level" },
        { name: "Redensyl",                       benefit: "Enhances blood flow at hair roots, strengthens follicles" },
        { name: "Camellia Sinensis Leaf Extract", benefit: "Protects hair from UV damage" },
        { name: "D-Panthenol",                    benefit: "Nourishes and strengthens each strand" },
        { name: "Zinc Chloride",                  benefit: "Supports scalp health" },
      ],
      ritualStep: "treat",
      ingredients: ["Anagain", "Redensyl", "European Larch Wood Extract", "Camellia Sinensis Leaf Extract", "Xanthan Gum", "Propylene Glycol", "Glycerin", "Caffeine", "Zinc Chloride", "D-Panthenol", "Aqua"],
      benefits: ["Stops hair loss", "Stimulates new hair growth", "Strengthens existing hair", "UV protection for hair"],
      usage: "Use the exclusive derma roller on your complete scalp with gentle circular motion to prepare hair roots. Take a few drops from the dropper bottle, massage evenly to complete scalp. Leave for absorption. Repeat 2–3 times a day.",
      suitableFor: ["All hair types", "Hair-fall prone", "Thinning hair", "Men and women"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 2100, stock: 50, sku: "NZ-HS-AR-250" },
      ],
      sku: "NZ-HS-AR-250",
      stock: 50,
    },

    // ── Apricot Scrub (Hair category as per doc) ─────────────

    {
      name: "Apricot Scrub",
      slug: "apricot-scrub",
      description: "A gentle exfoliating scrub with apricot kernel powder that removes dead skin cells, unclogs pores and leaves skin smooth and radiant.",
      price: 340,
      image: "/products/apricot-scrub.jpg",
      category: cat("face-care"),
      collectionSlug: "face-care",
      variantLabel: "Apricot",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness", "pigmentation"],
      keyIngredients: [
        { name: "Apricot Kernel Powder", benefit: "Gentle natural exfoliation to remove dead cells" },
      ],
      ritualStep: "exfoliate",
      ingredients: ["Apricot Kernel Powder", "Glycerin", "Aloe Vera", "Vitamin E", "Aqua"],
      benefits: ["Exfoliates dead skin", "Unclogs pores", "Smooth radiant skin", "Brightening"],
      usage: "Apply on damp face, scrub gently in circular motions for 1–2 minutes. Rinse with water. Use 2–3 times per week.",
      suitableFor: ["All skin types", "Dull skin"],
      sizes: [
        { size: "200g", unit: "g", quantity: 200, price: 340, stock: 100, sku: "NZ-FC-APS-200" },
      ],
      sku: "NZ-FC-APS-200",
      stock: 100,
    },


    // ════════════════════════════════════════════════════════
    //  BODY CARE
    // ════════════════════════════════════════════════════════

    // ── Aloe Vera Gel ────────────────────────────────────────

    {
      name: "Aloe Vera Gel for Hydrating Body & Face",
      slug: "aloe-vera-gel-body-face",
      description: "Nourish your skin, hair and body with this versatile multipurpose Aloe Vera Gel. Soothes sunburns, irritations and redness. Hydrates and moisturizes dry skin. Calms acne, eczema and rosacea. Conditions and softens hair. 99% Pure Aloe Vera Extract rich in vitamins A, C, E and minerals.",
      price: 275,
      image: "/products/aloe-vera-gel.jpg",
      category: cat("body-care"),
      collectionSlug: "aloe-vera-gel",
      variantLabel: "Pure Aloe Vera",
      skinTypes: ["all", "sensitive", "dry", "oily"],
      concerns: ["hydration", "sensitive-skin", "dryness", "acne"],
      keyIngredients: [
        { name: "99% Pure Aloe Vera Extract", benefit: "Rich in vitamins A, C, E — soothes, hydrates and nourishes" },
        { name: "Vitamin E",                   benefit: "Antioxidant properties protect against skin damage" },
      ],
      ritualStep: "moisturize",
      ingredients: ["Aloe Vera Extract (99%)", "Vitamin E", "Natural Preservatives", "Aqua"],
      benefits: ["Soothes sunburn and irritation", "Deep hydration", "Calms acne and rosacea", "Conditions hair"],
      usage: "Apply to affected area as needed. Gently massage into skin or hair. Use as a moisturizer, after-sun care or hair mask. Patch test before first use.",
      suitableFor: ["All skin types", "Sensitive skin", "Sunburned skin", "All hair types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 275, stock: 100, sku: "NZ-BC-AVG-250" },
        { size: "500ml", unit: "ml", quantity: 500, price: 499, stock: 100, sku: "NZ-BC-AVG-500" },
      ],
      sku: "NZ-BC-AVG-250",
      stock: 100,
    },

    // ── Body Lotion ──────────────────────────────────────────

    {
      name: "Moisturizing Honey Body Lotion for Soft Skin",
      slug: "moisturizing-honey-body-lotion",
      description: "Indulge in the golden goodness of honey with this Nourishing Honey Cream Body Lotion, crafted to hydrate and soften dry skin. Locks in moisture for up to 24 hours. Formulated with 20% Real Honey Extract, Coconut Oil, Shea Butter and Vitamin E.",
      price: 240,
      image: "/products/honey-body-lotion.jpg",
      category: cat("body-care"),
      collectionSlug: "body-lotion",
      variantLabel: "Honey Cream",
      skinTypes: ["dry", "normal", "all"],
      concerns: ["dryness", "hydration"],
      keyIngredients: [
        { name: "20% Real Honey Extract", benefit: "Natural humectant and antioxidant" },
        { name: "Coconut Oil",             benefit: "Hydrates and nourishes skin" },
        { name: "Shea Butter",             benefit: "Moisturizes and protects skin" },
        { name: "Vitamin E",               benefit: "Protects against environmental stressors" },
      ],
      ritualStep: "moisturize",
      ingredients: ["Honey Extract", "Coconut Oil", "Shea Butter", "Vitamin E", "Glycerin", "Aqua"],
      benefits: ["24-hour moisture lock", "Soothes dry skin", "Natural barrier function", "Silky smooth skin"],
      usage: "Apply to clean dry skin after bath or shower. Massage into skin until fully absorbed. Use daily for optimal hydration.",
      suitableFor: ["Dry skin", "Normal skin", "Sensitive skin", "All skin types"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 140, stock: 100, sku: "NZ-BL-HC-100" },
        { size: "200ml", unit: "ml", quantity: 200, price: 240, stock: 100, sku: "NZ-BL-HC-200" },
      ],
      sku: "NZ-BL-HC-200",
      stock: 100,
    },

    {
      name: "Body Lotion Caramel Crush | Brightening & Lightening",
      slug: "body-lotion-caramel-crush-brightening",
      description: "Specially designed to enhance your confidence with soft, nourished, glowing and bright skin. Carefully crafted with Natural Aloe Vera, Liquorice Extract, Shea Butter and Kojic Acid to keep your skin moisturized and brighten your complexion.",
      price: 140,
      image: "/products/caramel-body-lotion.jpg",
      category: cat("body-care"),
      collectionSlug: "body-lotion",
      variantLabel: "Caramel Crush",
      skinTypes: ["dry", "normal", "all", "dull"],
      concerns: ["dryness", "pigmentation", "dullness"],
      keyIngredients: [
        { name: "Natural Aloe Vera",    benefit: "Deep soothing hydration" },
        { name: "Liquorice Extract",    benefit: "Natural skin brightening" },
        { name: "Shea Butter",          benefit: "Rich nourishment and lasting softness" },
        { name: "Kojic Acid",           benefit: "Reduces pigmentation and dark spots" },
      ],
      ritualStep: "moisturize",
      ingredients: ["Aloe Vera", "Liquorice Extract", "Shea Butter", "Kojic Acid", "Cetaryl Alcohol", "Glycerin", "Aqua"],
      benefits: ["Brightening and lightening", "Deep moisturization", "Glowing skin", "Pigmentation reduction"],
      usage: "Apply generously on body after bathing. Massage until fully absorbed. Use daily.",
      suitableFor: ["All skin types", "Dull skin", "Pigmented skin"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 140, stock: 100, sku: "NZ-BL-CC-100" },
        { size: "200ml", unit: "ml", quantity: 200, price: 240, stock: 100, sku: "NZ-BL-CC-200" },
      ],
      sku: "NZ-BL-CC-100",
      stock: 100,
    },

    // ── Body Massage Oil ─────────────────────────────────────

    {
      name: "Natural Cedarwood Body Massage Oil for Deep Relaxation",
      slug: "cedarwood-body-massage-oil-deep-relaxation",
      description: "Escape into tranquility with this Relaxing Cedarwood Body Massage Oil, blended to soothe mind, body and spirit. Eases muscle tension and stress, promotes relaxation and calmness, nourishes and moisturizes the skin with a long-lasting natural woody fragrance.",
      price: 400,
      image: "/products/cedarwood-massage-oil.jpg",
      category: cat("massage-oil"),
      collectionSlug: "body-massage-oil",
      variantLabel: "Cedarwood",
      skinTypes: ["all", "dry", "normal"],
      concerns: ["dryness", "stress-relief"],
      keyIngredients: [
        { name: "Cedarwood Essential Oil", benefit: "Promotes deep relaxation and calms stressed muscles" },
        { name: "Carrier Oils",            benefit: "Leaves skin soft, supple and nourished" },
      ],
      ritualStep: "treat",
      ingredients: ["Cedarwood Essential Oil", "Sweet Almond Oil", "Jojoba Oil", "Vitamin E", "Aqua"],
      benefits: ["Muscle relaxation", "Stress relief", "Skin nourishment", "Long-lasting fragrance"],
      usage: "Warm a few drops between palms. Massage gently on body in circular motions. Best used after shower.",
      suitableFor: ["All skin types", "Stressed muscles", "Dry skin"],
      sizes: [
        { size: "180ml", unit: "ml", quantity: 180, price: 400, stock: 100, sku: "NZ-MO-CW-180" },
      ],
      sku: "NZ-MO-CW-180",
      stock: 100,
    },


    // ════════════════════════════════════════════════════════
    //  BATH & SHOWER
    // ════════════════════════════════════════════════════════

    // ── Shower Gels ──────────────────────────────────────────

    {
      name: "Nourishing Orange Shower Gel for Healthy Glowing Skin",
      slug: "nourishing-orange-shower-gel",
      description: "Start your day with a burst of citrus energy! This refreshing and nourishing shower gel cleanses, hydrates and energises your senses. Enriched with Aloe Vera and Allantoin for conditioning that leaves skin clean, smooth and fresh.",
      price: 250,
      image: "/products/orange-shower-gel.jpg",
      category: cat("bath-shower"),
      collectionSlug: "shower-gel",
      variantLabel: "Orange Fresh",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness", "dryness"],
      keyIngredients: [
        { name: "Orange Extract", benefit: "Citrus freshness and skin conditioning" },
        { name: "Aloe Vera",      benefit: "Conditions and soothes skin post-wash" },
        { name: "Allantoin",      benefit: "Smoothing and skin conditioning" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Cocamidopropyl Betaine", "SLES 70%", "Disodium EDTA", "Glycerine", "PEG 200 Hydrogenated Glyceryl Palmate", "PEG 7 Glyceryl Cocoate", "Aloe Vera Extract", "Allantoin", "Orange Extract", "Perfume", "Aqua"],
      benefits: ["Energising citrus scent", "Deep cleansing", "Skin conditioning", "Long-lasting freshness"],
      usage: "Apply to wet skin, lather and massage. Rinse thoroughly with water. Pat skin dry gently.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 250, stock: 100, sku: "NZ-SG-OR-250" },
      ],
      sku: "NZ-SG-OR-250",
      stock: 100,
    },

    {
      name: "Coffee Beans Body Shower Gel",
      slug: "coffee-beans-body-shower-gel",
      description: "Refreshing coffee beans fragrance enhances your senses and makes you feel fresh for the day. Special ingredients in this formulation will leave your skin clean and smooth to make you feel confident.",
      price: 250,
      image: "/products/coffee-shower-gel.jpg",
      category: cat("bath-shower"),
      collectionSlug: "shower-gel",
      variantLabel: "Coffee Beans",
      skinTypes: ["all", "normal", "dull"],
      concerns: ["dullness"],
      keyIngredients: [
        { name: "Coffee Extract", benefit: "Energizing cleanse and skin revitalization" },
        { name: "Aloe Vera",      benefit: "Conditions and soothes skin post-wash" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Cocamidopropyl Betaine", "SLES 70%", "Disodium EDTA", "Glycerine", "PEG 200 Hydrogenated Glyceryl Palmate", "Coffee Extract", "Perfume", "Aqua"],
      benefits: ["Energising coffee scent", "Smooth clean skin", "All-day confidence", "Gentle cleansing"],
      usage: "Withdraw ample quantity of gel, gently massage on wet body skin for a few minutes. Rinse with water and pat skin dry with soft towel.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 250, stock: 100, sku: "NZ-SG-CB-250" },
      ],
      sku: "NZ-SG-CB-250",
      stock: 100,
    },

    {
      name: "Sea Fresh Body Shower Gel",
      slug: "sea-fresh-body-shower-gel",
      description: "Refreshing sea fresh fragrance enhances your senses and makes you feel fresh for the day. Special ingredients leave your skin clean and smooth. Enriched with Aloe Vera and Allantoin for skin conditioning with every wash.",
      price: 250,
      image: "/products/seafresh-shower-gel.jpg",
      category: cat("bath-shower"),
      collectionSlug: "shower-gel",
      variantLabel: "Seafresh",
      skinTypes: ["all", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Sea Extracts", benefit: "Refreshing hydration and long-lasting freshness" },
        { name: "Aloe Vera",    benefit: "Conditions and soothes skin" },
        { name: "Allantoin",    benefit: "Skin conditioning and smoothing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Cocamidopropyl Betaine", "SLES 70%", "Disodium EDTA", "Glycerine", "PEG 200 Hydrogenated Glyceryl Palmate", "PEG 7 Glyceryl Cocoate", "Aloe Vera Extract", "Allantoin", "Ethyl Hexyl Glycerin", "Phenoxyethanol", "Perfume", "Sodium Chloride", "Aqua"],
      benefits: ["Sea-fresh fragrance", "Smooth skin", "Skin conditioning", "Refreshing cleanse"],
      usage: "Apply to wet skin, lather and massage. Rinse thoroughly. Pat skin dry with soft towel.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 250, stock: 100, sku: "NZ-SG-SF-250" },
      ],
      sku: "NZ-SG-SF-250",
      stock: 100,
    },

    // ── Bath Salts ───────────────────────────────────────────

    {
      name: "Pure Rose Bathing Salt for Relaxation and Calm",
      slug: "pure-rose-bathing-salt",
      description: "Immerse yourself in the soothing essence of roses with this Relaxing Rose Petal Bathing Salt, carefully crafted to calm mind, body and spirit. A luxurious blend of Himalayan salts and rose essential oil that relieves stress and leaves skin soft and rejuvenated.",
      price: 340,
      image: "/products/rose-bathing-salt.jpg",
      category: cat("bath-shower"),
      collectionSlug: "bath-salt",
      variantLabel: "Rose",
      skinTypes: ["all", "dry", "sensitive"],
      concerns: ["dryness", "stress-relief"],
      keyIngredients: [
        { name: "Himalayan Pink Salt", benefit: "Detoxifies and draws out skin impurities" },
        { name: "Rose Essential Oil",  benefit: "Floral freshness and skin rejuvenation" },
        { name: "Rose Petals",         benefit: "Soothing aromatherapy and skin softening" },
      ],
      ritualStep: "treat",
      ingredients: ["Himalayan Pink Salt", "Rose Petals", "Rose Essential Oil", "Lavender Oil", "Vitamin E"],
      benefits: ["Muscle relaxation", "Skin softening", "Aromatherapy", "Stress relief"],
      usage: "Add 2–3 tablespoons to warm bath water. Soak for 15–20 minutes. Rinse off. Follow with body lotion.",
      suitableFor: ["All skin types", "Stress relief", "After workout"],
      sizes: [
        { size: "500g", unit: "g", quantity: 500, price: 340, stock: 100, sku: "NZ-BS-RO-500" },
      ],
      sku: "NZ-BS-RO-500",
      stock: 100,
    },

    {
      name: "Lavender Bath Salt | Deep Exfoliation & Muscle Relaxant",
      slug: "lavender-bath-salt-muscle-relaxant",
      description: "Epsom salt famed for treating many ailments — relieves stress, heals muscle soreness and promotes healthy sleep. Enriched with the rejuvenating scent and healing properties of Lavender, this 100% Natural Bath Salt makes for a perfect bath. Lavender's anti-inflammation quality soothes skin and its antioxidants combat free radicals.",
      price: 340,
      image: "/products/lavender-bath-salt.jpg",
      category: cat("bath-shower"),
      collectionSlug: "bath-salt",
      variantLabel: "Lavender",
      skinTypes: ["all", "sensitive", "normal"],
      concerns: ["stress-relief", "sensitive-skin", "dryness"],
      keyIngredients: [
        { name: "Epsom Salt",   benefit: "Relieves muscle soreness and stress" },
        { name: "Lavender Oil", benefit: "Calming aromatherapy, anti-inflammatory" },
      ],
      ritualStep: "treat",
      ingredients: ["Epsom Salt", "Himalayan Salt", "Lavender Essential Oil", "Lavender Petals"],
      benefits: ["Deep exfoliation", "Muscle relaxation", "Promotes sleep", "Anti-inflammatory"],
      usage: "Add a generous handful to warm bath water. Soak for 15–20 minutes for best results. Always follow with body lotion.",
      suitableFor: ["All skin types", "Stress relief", "Post-workout recovery"],
      sizes: [
        { size: "500g", unit: "g", quantity: 500, price: 340, stock: 100, sku: "NZ-BS-LV-500" },
      ],
      sku: "NZ-BS-LV-500",
      stock: 100,
    },

    {
      name: "Sea Fresh Bath Salt | Deep Exfoliation & Aroma Therapy",
      slug: "sea-fresh-bath-salt-aroma-therapy",
      description: "Reinvent your everyday bathing experience with Nezal's Sea Fresh Epsom bath salt. Experience the lively natural fragrance of the sea while relaxing your body and mind. The perfectly curated blend cleanses your skin and removes dead cells while the sensuous ocean aroma helps alleviate stress and bring mindfulness.",
      price: 340,
      image: "/products/seafresh-bath-salt.jpg",
      category: cat("bath-shower"),
      collectionSlug: "bath-salt",
      variantLabel: "Seafresh",
      skinTypes: ["all", "normal"],
      concerns: ["stress-relief", "dryness"],
      keyIngredients: [
        { name: "Epsom Salt",     benefit: "Deep exfoliation and muscle relaxation" },
        { name: "Sea Minerals",   benefit: "Revitalizing freshness and skin restoration" },
      ],
      ritualStep: "treat",
      ingredients: ["Epsom Salt", "Sea Minerals", "Essential Oil Blend", "Natural Fragrance"],
      benefits: ["Deep exfoliation", "Muscle recovery", "Stress relief", "Cleansing"],
      usage: "Add a generous handful to warm bath water. Soak for 15–20 minutes. Rinse and follow with body lotion.",
      suitableFor: ["All skin types", "Stress relief"],
      sizes: [
        { size: "500g", unit: "g", quantity: 500, price: 340, stock: 100, sku: "NZ-BS-SEA-500" },
      ],
      sku: "NZ-BS-SEA-500",
      stock: 100,
    },

    // ── Handwash ─────────────────────────────────────────────

    {
      name: "Tulsi & Green Apple Handwash",
      slug: "tulsi-green-apple-handwash",
      description: "Herbal combination of Aloe Vera and Tulsi extracts blended with exquisite Green Apple fragrance. Disinfects your skin gently and prevents excessive drying to give you clean and soft hands after each wash.",
      price: 129,
      image: "/products/tulsi-green-apple-handwash.jpg",
      category: cat("bath-shower"),
      collectionSlug: "hand-wash",
      variantLabel: "Tulsi & Green Apple",
      skinTypes: ["all", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Tulsi Extract",       benefit: "Natural antibacterial and disinfecting care" },
        { name: "Green Apple Extract", benefit: "Crisp freshness and revitalizing care" },
        { name: "Aloe Vera",           benefit: "Prevents drying and keeps hands soft" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Tulsi Extract", "Green Apple Extract", "Aloe Vera", "Glycerin", "Aqua"],
      benefits: ["Gentle disinfection", "Prevents dryness", "Soft hands", "Refreshing fragrance"],
      usage: "Pump 1–2 times onto wet hands. Lather for 20 seconds. Rinse thoroughly with clean water.",
      suitableFor: ["All skin types", "Sensitive hands"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 129, stock: 100, sku: "NZ-HW-TGA-250" },
      ],
      sku: "NZ-HW-TGA-250",
      stock: 100,
    },

    {
      name: "Tulsi & Lime Handwash",
      slug: "tulsi-lime-handwash",
      description: "Herbal combination of Aloe Vera and Tulsi extracts blended with refreshing Lime fragrance. Disinfects your skin gently and prevents excessive drying to give you clean and soft hands after each wash.",
      price: 129,
      image: "/products/tulsi-lime-handwash.jpg",
      category: cat("bath-shower"),
      collectionSlug: "hand-wash",
      variantLabel: "Tulsi & Lime",
      skinTypes: ["all", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Tulsi Extract", benefit: "Natural antibacterial disinfection" },
        { name: "Lime Extract",  benefit: "Energizing citrus freshness" },
        { name: "Aloe Vera",     benefit: "Prevents drying, keeps hands soft" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Tulsi Extract", "Lime Extract", "Aloe Vera", "Glycerin", "Aqua"],
      benefits: ["Gentle disinfection", "Refreshing lime scent", "Soft hands", "Prevents drying"],
      usage: "Pump onto wet hands, lather for 20 seconds, rinse thoroughly.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 129, stock: 100, sku: "NZ-HW-TL-250" },
      ],
      sku: "NZ-HW-TL-250",
      stock: 100,
    },

    {
      name: "Tulsi & Peach Handwash",
      slug: "tulsi-peach-handwash",
      description: "Herbal combination of Aloe Vera and Tulsi extracts blended with a gentle Peach fragrance. Disinfects your skin gently and prevents excessive drying to give you clean and soft hands after each wash.",
      price: 129,
      image: "/products/tulsi-peach-handwash.jpg",
      category: cat("bath-shower"),
      collectionSlug: "hand-wash",
      variantLabel: "Tulsi & Peach",
      skinTypes: ["sensitive", "dry", "normal"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Tulsi Extract", benefit: "Natural antibacterial disinfection" },
        { name: "Peach Extract", benefit: "Gentle cleansing and skin softness" },
        { name: "Aloe Vera",     benefit: "Prevents drying, keeps hands soft" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Tulsi Extract", "Peach Extract", "Aloe Vera", "Glycerin", "Aqua"],
      benefits: ["Gentle disinfection", "Soft hands", "Gentle for sensitive skin", "Peach fragrance"],
      usage: "Pump onto wet hands, lather for 20 seconds, rinse thoroughly.",
      suitableFor: ["Sensitive hands", "Dry hands", "All skin types"],
      sizes: [
        { size: "250ml", unit: "ml", quantity: 250, price: 129, stock: 100, sku: "NZ-HW-TP-250" },
      ],
      sku: "NZ-HW-TP-250",
      stock: 100,
    },


    // ════════════════════════════════════════════════════════
    //  INTIMATE HYGIENE
    // ════════════════════════════════════════════════════════

    {
      name: "PH Balance Intimate Wash for His and Hers",
      slug: "ph-balance-intimate-wash-unisex",
      description: "Maintain intimate health and hygiene with our pH Balance Intimate Wash, designed for sensitive skin. This gentle unisex formula balances pH levels to prevent irritation, soothes and calms sensitive skin, gently cleanses and refreshes intimate areas, and protects against bacterial and fungal infections.",
      price: 350,
      image: "/products/ph-balance-intimate-wash.jpg",
      category: cat("intimate-hygiene"),
      collectionSlug: "intimate-wash",
      variantLabel: "pH Balance",
      skinTypes: ["all", "sensitive"],
      concerns: ["sensitive-skin"],
      keyIngredients: [
        { name: "Natural pH Balancers", benefit: "Maintains optimal intimate pH levels" },
        { name: "Soothing Botanicals",  benefit: "Calms and protects sensitive intimate skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["pH Balancing Agents", "Chamomile Extract", "Aloe Vera", "Witch Hazel", "Aqua"],
      benefits: ["pH balanced", "Prevents irritation", "Odour protection", "Supports natural flora"],
      usage: "Apply a small amount to intimate areas. Gently massage and rinse with warm water. Use daily or alternate days.",
      suitableFor: ["All skin types", "Sensitive skin", "Unisex"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 350, stock: 100, sku: "NZ-IH-PH-150" },
      ],
      sku: "NZ-IH-PH-150",
      stock: 100,
    },

    {
      name: "Intimate Hygiene Sulphate Free Unisex Foam Wash",
      slug: "intimate-hygiene-sulphate-free-foam-wash",
      description: "Sulphate and Paraben free formula created to clean your soft and delicate intimate skin gently. Contains Tea Tree Extract for controlling bacterial colonies and natural disinfection. Lactic Acid balances pH of the intimate area. Aloe Vera keeps the intimate area soft and supple post each wash.",
      price: 350,
      image: "/products/intimate-foam-wash.jpg",
      category: cat("intimate-hygiene"),
      collectionSlug: "intimate-wash",
      variantLabel: "Sulphate Free Foam Wash",
      skinTypes: ["all", "sensitive"],
      concerns: ["sensitive-skin"],
      keyIngredients: [
        { name: "Tea Tree Extract", benefit: "Controls bacterial colonies and acts as natural disinfectant" },
        { name: "Lactic Acid",      benefit: "Balances pH of the intimate area" },
        { name: "Aloe Vera",        benefit: "Keeps intimate area soft and supple after each wash" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sodium Methyl Cocoyl Taurate", "Sodium Methyl Oleoyl Taurate", "CAPB", "Lactic Acid", "Glycerine", "EDTA", "Ethylhexyl Glycerine", "Phenoxyethanol", "Tea Tree Extract", "Aloe Vera Extract", "Perfume", "Aqua"],
      benefits: ["Sulphate and paraben free", "Gentle cleansing", "pH balanced", "Soft post-wash feel"],
      usage: "The foam pump dispenses required foam directly. Massage gently to intimate areas, leave 2–3 minutes, rinse with lukewarm water. Tap dry with a soft cotton towel.",
      suitableFor: ["All skin types", "Sensitive skin", "Unisex"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 350, stock: 100, sku: "NZ-IH-SF-150" },
      ],
      sku: "NZ-IH-SF-150",
      stock: 100,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Designer Soap
    // ════════════════════════════════════════════════════════

    {
      name: "Brightening Lemon Designer Soap | Radiant Glow",
      slug: "brightening-lemon-designer-soap",
      description: "A refreshing handcrafted lemon soap with vitamin C and citrus extracts that brightens skin, removes blemishes and leaves a clean citrusy fragrance. The distinct lemon aroma makes each bath a refreshing experience.",
      price: 149,
      image: "/products/lemon-designer-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "designer-soap",
      variantLabel: "Lemon",
      skinTypes: ["all", "oily", "dull"],
      concerns: ["pigmentation", "dullness", "oily-skin"],
      keyIngredients: [
        { name: "Lemon Extract", benefit: "Deep cleansing with refreshing brightening effect" },
        { name: "Vitamin C",     benefit: "Antioxidant brightening and skin protection" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Lemon Extract", "Vitamin C", "Citric Acid", "Coconut Oil", "Shea Butter", "Glycerin"],
      benefits: ["Skin brightening", "Removes blemishes", "Deep cleansing", "Refreshing citrus scent"],
      usage: "Use daily for bathing. Lather well on wet skin and rinse thoroughly.",
      suitableFor: ["All skin types", "Dull skin", "Oily skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-DS-LM-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-DS-LM-300" },
      ],
      sku: "NZ-DS-LM-100",
      stock: 150,
    },

    {
      name: "Juicy Watermelon Designer Soap | Moisturizing Delight",
      slug: "juicy-watermelon-designer-soap",
      description: "A hydrating watermelon-infused designer soap that cools and moisturises sun-exposed skin. Rich in natural fruit extracts for a refreshing cleanse and all-day soft skin.",
      price: 149,
      image: "/products/watermelon-designer-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "designer-soap",
      variantLabel: "Watermelon",
      skinTypes: ["all", "dry", "normal"],
      concerns: ["dryness", "hydration"],
      keyIngredients: [
        { name: "Watermelon Extract", benefit: "Hydrates and cools sun-exposed skin" },
        { name: "Coconut Oil",        benefit: "Deep moisture and skin softening" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Watermelon Extract", "Coconut Oil", "Glycerin", "Shea Butter", "Aqua"],
      benefits: ["Deep hydration", "Cools skin", "Refreshing scent", "Soft skin"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Dry skin", "Sun-exposed skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-DS-WM-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-DS-WM-300" },
      ],
      sku: "NZ-DS-WM-100",
      stock: 150,
    },

    {
      name: "Orange Brightening Designer Soap | Moisturizing",
      slug: "orange-brightening-designer-soap",
      description: "An energising orange soap that tones and brightens skin with the power of citrus extracts. Leaves a vibrant fresh fragrance and visibly glowing skin with regular use.",
      price: 149,
      image: "/products/orange-designer-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "designer-soap",
      variantLabel: "Orange",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness"],
      keyIngredients: [
        { name: "Orange Extract", benefit: "Energizes and tones skin" },
        { name: "Vitamin C",      benefit: "Antioxidant brightening" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Orange Extract", "Vitamin C", "Coconut Oil", "Glycerin", "Aqua"],
      benefits: ["Skin toning", "Brightening", "Energising orange scent", "Glowing skin"],
      usage: "Use daily for bathing. Lather well on wet skin and rinse.",
      suitableFor: ["All skin types", "Dull skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-DS-OR-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-DS-OR-300" },
      ],
      sku: "NZ-DS-OR-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Premium Soap
    // ════════════════════════════════════════════════════════

    {
      name: "Papaya Fruit Soap | Whitening, De-Tanning & Nourishing",
      slug: "papaya-fruit-soap-whitening-detanning",
      description: "A premium papaya soap for skin renewal and natural brightening. Papaya enzymes gently exfoliate, reducing tan lines and dark spots while nourishing skin to a visibly lighter and smoother complexion.",
      price: 149,
      image: "/products/papaya-premium-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Papaya Whitening",
      skinTypes: ["all", "dull", "pigmented"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Papaya Extract", benefit: "Skin renewal, de-tanning and natural brightening" },
        { name: "Kojic Acid",     benefit: "Reduces dark spots and pigmentation" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Papaya Extract", "Kojic Acid", "Shea Butter", "Coconut Oil", "Glycerin"],
      benefits: ["Whitening and brightening", "De-tanning", "Reduces dark spots", "Nourishing"],
      usage: "Use daily for bathing. Lather well and rinse thoroughly.",
      suitableFor: ["All skin types", "Pigmented skin", "Tanned skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-PA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-PA-300" },
      ],
      sku: "NZ-PS-PA-100",
      stock: 150,
    },

    {
      name: "Rich Chocolate Indulgence Premium Moisturizing Soap",
      slug: "rich-chocolate-indulgence-premium-soap",
      description: "A luxurious chocolate-infused premium soap that deeply moisturises and nourishes skin with the richness of cocoa butter and vanilla. Leaves skin irresistibly soft and smooth.",
      price: 149,
      image: "/products/chocolate-premium-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Chocolate Vanilla",
      skinTypes: ["dry", "normal", "all"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Cocoa Butter",   benefit: "Deep nourishment and skin softness" },
        { name: "Vanilla Extract",benefit: "Soothing scent and skin conditioning" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Cocoa Butter", "Vanilla Extract", "Shea Butter", "Coconut Oil", "Glycerin"],
      benefits: ["Deep moisturization", "Irresistibly soft skin", "Rich indulgent scent", "Nourishing"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["Dry skin", "Normal skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-CH-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-CH-300" },
      ],
      sku: "NZ-PS-CH-100",
      stock: 150,
    },

    {
      name: "Saffron & Sandalwood with Turmeric Premium Soap",
      slug: "saffron-sandalwood-turmeric-premium-soap",
      description: "A luxury premium soap blending the power of three golden ingredients — Saffron for radiance, Sandalwood for deep nourishment and Turmeric for brightening and even skin tone.",
      price: 149,
      image: "/products/saffron-sandalwood-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Saffron Sandalwood & Turmeric",
      skinTypes: ["all", "dull", "pigmented"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Saffron",    benefit: "Radiance and skin rejuvenation" },
        { name: "Turmeric",   benefit: "Brightening and even skin tone" },
        { name: "Sandalwood", benefit: "Deep nourishment and skin texture improvement" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Saffron Extract", "Sandalwood Powder", "Turmeric Extract", "Coconut Oil", "Glycerin"],
      benefits: ["Radiance enhancement", "Skin brightening", "Even skin tone", "Deep nourishment"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Dull skin", "Pigmented skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-SST-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-SST-300" },
      ],
      sku: "NZ-PS-SST-100",
      stock: 150,
    },

    {
      name: "Strawberry & Mulberry Premium Soap",
      slug: "strawberry-mulberry-premium-soap",
      description: "A brightening premium soap combining strawberry's antioxidant power with mulberry's natural skin tone improvement for a visibly radiant, glowing complexion.",
      price: 149,
      image: "/products/strawberry-mulberry-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Strawberry & Mulberry",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Strawberry Extract", benefit: "Antioxidant brightening and Vitamin C" },
        { name: "Mulberry Extract",   benefit: "Natural skin tone improvement" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Strawberry Extract", "Mulberry Extract", "Coconut Oil", "Shea Butter", "Glycerin"],
      benefits: ["Antioxidant protection", "Brightening", "Even skin tone", "Radiant glow"],
      usage: "Use daily for bathing. Lather well and rinse thoroughly.",
      suitableFor: ["All skin types", "Dull skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-SM-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-SM-300" },
      ],
      sku: "NZ-PS-SM-100",
      stock: 150,
    },

    {
      name: "Charcoal Lemon Premium Soap | Pore Cleansing",
      slug: "charcoal-lemon-premium-soap",
      description: "A powerful detoxifying premium soap with activated charcoal to draw out impurities and lemon to control oil and prevent breakouts. Leaves skin deeply cleansed and refreshed.",
      price: 149,
      image: "/products/charcoal-lemon-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Charcoal Lemon",
      skinTypes: ["oily", "acne-prone", "combination"],
      concerns: ["acne", "oily-skin", "open-pores"],
      keyIngredients: [
        { name: "Activated Charcoal", benefit: "Detox cleansing and oil control" },
        { name: "Lemon Extract",      benefit: "Anti-acne and skin brightening" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Activated Charcoal", "Lemon Extract", "Tea Tree Oil", "Kaolin Clay", "Coconut Oil"],
      benefits: ["Pore cleansing", "Detoxifying", "Oil control", "Anti-acne"],
      usage: "Use daily. Lather on wet skin, leave for 30 seconds, rinse thoroughly.",
      suitableFor: ["Oily skin", "Acne-prone skin", "Combination skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-CL-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-CL-300" },
      ],
      sku: "NZ-PS-CL-100",
      stock: 150,
    },

    {
      name: "Rose Aqua Moisturising Premium Soap",
      slug: "rose-aqua-moisturising-premium-soap",
      description: "Intense rose-infused moisturizing premium soap with high water content that cleanses skin from inside, effectively moisturises and creates a barrier to reduce moisture loss.",
      price: 149,
      image: "/products/rose-aqua-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Rose Aqua Moisturising",
      skinTypes: ["dry", "sensitive", "normal"],
      concerns: ["dryness", "hydration"],
      keyIngredients: [
        { name: "Rose Aqua",       benefit: "Intense hydration and skin freshness" },
        { name: "Rose Essential Oil", benefit: "Deeply moisturises and soothes skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Rose Extract", "Rose Essential Oil", "Aqua", "Glycerin", "Shea Butter", "Coconut Oil"],
      benefits: ["Intense moisturization", "Soft skin", "Soothing rose scent", "Moisture barrier"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["Dry skin", "Sensitive skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-RA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-RA-300" },
      ],
      sku: "NZ-PS-RA-100",
      stock: 150,
    },

    {
      name: "Black Grapes Premium Soap | Anti-Aging",
      slug: "black-grapes-premium-soap",
      description: "A premium soap enriched with black grape extract for anti-aging and skin repair. Antioxidants in black grapes fight free radicals, improve skin texture and restore a youthful glow.",
      price: 149,
      image: "/products/black-grapes-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Black Grapes",
      skinTypes: ["all", "mature", "dull"],
      concerns: ["dullness", "pigmentation"],
      keyIngredients: [
        { name: "Black Grape Extract", benefit: "Anti-aging, antioxidant skin repair" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Black Grape Extract", "Coconut Oil", "Shea Butter", "Glycerin", "Vitamin E"],
      benefits: ["Anti-aging", "Antioxidant protection", "Skin repair", "Radiant glow"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Mature skin", "Dull skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-BG-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-BG-300" },
      ],
      sku: "NZ-PS-BG-100",
      stock: 150,
    },

    {
      name: "Pineapple Aqua Premium Soap",
      slug: "pineapple-aqua-premium-soap",
      description: "A brightening premium soap combining pineapple's Vitamin C boost with deep hydration. Pineapple enzymes gently exfoliate for a glowing, fresh complexion.",
      price: 149,
      image: "/products/pineapple-aqua-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Pineapple Aqua",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness", "hydration"],
      keyIngredients: [
        { name: "Pineapple Extract", benefit: "Vitamin C boost and skin brightening" },
        { name: "Aqua Base",         benefit: "Deep hydration and freshness" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Pineapple Extract", "Coconut Oil", "Glycerin", "Aqua", "Shea Butter"],
      benefits: ["Brightening", "Deep hydration", "Fresh tropical scent", "Vitamin C boost"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-PIN-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-PIN-300" },
      ],
      sku: "NZ-PS-PIN-100",
      stock: 150,
    },

    {
      name: "Lemongrass Peppermint Premium Soap",
      slug: "lemongrass-peppermint-premium-soap",
      description: "A purifying premium soap combining lemongrass for deep cleansing with peppermint's cooling freshness and oil control properties.",
      price: 149,
      image: "/products/lemongrass-peppermint-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Lemongrass & Peppermint",
      skinTypes: ["oily", "combination", "all"],
      concerns: ["oily-skin", "acne"],
      keyIngredients: [
        { name: "Lemongrass", benefit: "Deep cleansing and skin purifying" },
        { name: "Peppermint", benefit: "Cooling freshness and oil control" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Lemongrass Extract", "Peppermint Oil", "Lemon Extract", "Coconut Oil", "Glycerin"],
      benefits: ["Oil control", "Deep cleansing", "Refreshing scent", "Acne prevention"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["Oily skin", "Combination skin", "Acne-prone skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-LGP-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-LGP-300" },
      ],
      sku: "NZ-PS-LGP-100",
      stock: 150,
    },

    {
      name: "Coconut Milk Honey Premium Soap",
      slug: "coconut-milk-honey-premium-soap",
      description: "A rich and creamy premium soap with coconut milk and honey for deep nourishment and silky smooth skin. Perfect for dry and sensitive skin types.",
      price: 149,
      image: "/products/coconut-milk-honey-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "premium-soap",
      variantLabel: "Coconut Milk Honey",
      skinTypes: ["dry", "sensitive", "normal"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Coconut Milk", benefit: "Rich moisture and smooth skin" },
        { name: "Honey",        benefit: "Natural humectant for lasting softness" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Coconut Milk", "Honey", "Shea Butter", "Glycerin", "Coconut Oil"],
      benefits: ["Deep moisturization", "Silky smooth skin", "Nourishing", "Gentle on sensitive skin"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["Dry skin", "Sensitive skin", "Normal skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-PS-CMH-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-PS-CMH-300" },
      ],
      sku: "NZ-PS-CMH-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Aissis Soap
    // ════════════════════════════════════════════════════════

    {
      name: "Green Tea Scrub Aissis Soap | Anti-Oxidant | Treats Acne",
      slug: "green-tea-scrub-aissis-soap",
      description: "A 100% natural handmade herbal soap with Green Tea extract for antioxidant protection and gentle exfoliation. Effectively treats acne and pimples with its dermatological benefits.",
      price: 95,
      image: "/products/green-tea-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Green Tea Scrub",
      skinTypes: ["oily", "acne-prone", "combination"],
      concerns: ["acne", "oily-skin", "dullness"],
      keyIngredients: [
        { name: "Green Tea Extract", benefit: "Antioxidant protection and oil control" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Green Tea Extract", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Antioxidant protection", "Treats acne", "Gentle exfoliation", "Oil control"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Oily skin", "Acne-prone skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-GT-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-GT-300" },
      ],
      sku: "NZ-AS-GT-100",
      stock: 150,
    },

    {
      name: "Handmade Jasmine Aissis Soap | Antiseptic | Heals Wounds | Uplifts Mood",
      slug: "jasmine-aissis-soap-antiseptic",
      description: "A natural antiseptic handmade soap with jasmine extract that heals wounds, moisturises dry skin and uplifts the mood with its romantic floral fragrance.",
      price: 95,
      image: "/products/jasmine-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Jasmine",
      skinTypes: ["all", "dry", "sensitive"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Jasmine Extract",  benefit: "Natural antiseptic, heals wounds and uplifts mood" },
        { name: "Jasmine Essential Oil", benefit: "Moisturises and softens dry skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Jasmine Extract", "Jasmine Essential Oil", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Natural antiseptic", "Wound healing", "Mood uplift", "Moisturizing for dry skin"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types", "Dry skin", "Sensitive skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-JA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-JA-300" },
      ],
      sku: "NZ-AS-JA-100",
      stock: 150,
    },

    {
      name: "Rose Essential Oil Aissis Soap | Toner | Anti-Ageing",
      slug: "rose-essential-oil-aissis-soap",
      description: "A handmade herbal soap with rose essential oil that tones skin, reverses signs of ageing and provides medicinal benefits. Anti-inflammatory and antiseptic properties reduce scars and strengthen skin.",
      price: 95,
      image: "/products/rose-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Rose",
      skinTypes: ["dry", "sensitive", "normal"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Rose Essential Oil", benefit: "Tones skin and reverses signs of ageing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Rose Essential Oil", "Rose Extract", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Skin toning", "Anti-ageing", "Soothing fragrance", "Moisturizing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Dry skin", "Sensitive skin", "Mature skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-RO-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-RO-300" },
      ],
      sku: "NZ-AS-RO-100",
      stock: 150,
    },

    {
      name: "Orange Peel Aissis Soap | Skin Lightening | Toner",
      slug: "orange-peel-aissis-soap-skin-lightening",
      description: "A handmade herbal soap with orange peel for skin lightening, whitening and a natural glow. Acts as a toner that tightens pores and reduces premature skin ageing.",
      price: 95,
      image: "/products/orange-peel-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Orange Peel Scrub",
      skinTypes: ["all", "dull", "pigmented"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Orange Peel", benefit: "Natural exfoliation and brightening glow" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Orange Peel Extract", "Vitamin C", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Skin lightening", "Brightening", "Skin toning", "Anti-ageing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types", "Dull skin", "Pigmented skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-OP-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-OP-300" },
      ],
      sku: "NZ-AS-OP-100",
      stock: 150,
    },

    {
      name: "Peppermint & Cucumber Aissis Soap | Prevents Pimples | Anti-Inflammatory",
      slug: "peppermint-cucumber-aissis-soap",
      description: "A handmade herbal soap with peppermint and cucumber that prevents pimples, has anti-inflammatory properties and deeply moisturises the skin.",
      price: 95,
      image: "/products/peppermint-cucumber-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Peppermint & Cucumber",
      skinTypes: ["oily", "combination", "acne-prone"],
      concerns: ["acne", "oily-skin"],
      keyIngredients: [
        { name: "Peppermint", benefit: "Cooling freshness and oil balance" },
        { name: "Cucumber",   benefit: "Anti-inflammatory and skin soothing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Peppermint Oil", "Cucumber Extract", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Prevents pimples", "Anti-inflammatory", "Moisturising", "Oil control"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Oily skin", "Combination skin", "Acne-prone skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-PC-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-PC-300" },
      ],
      sku: "NZ-AS-PC-100",
      stock: 150,
    },

    {
      name: "Sandalwood & Almond Aissis Soap | Removes Dark Spots | Sun Protection",
      slug: "sandalwood-almond-aissis-soap",
      description: "A handmade herbal soap with Sandalwood and Almond that removes dark spots, protects against sun damage and has anti-inflammatory properties.",
      price: 95,
      image: "/products/sandalwood-almond-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Sandalwood & Almond",
      skinTypes: ["dry", "normal", "all"],
      concerns: ["pigmentation", "dryness"],
      keyIngredients: [
        { name: "Sandalwood",  benefit: "Removes dark spots and improves skin radiance" },
        { name: "Almond Oil",  benefit: "Rich moisture and sun damage protection" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sandalwood Powder", "Almond Oil", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Removes dark spots", "Sun protection", "Anti-inflammatory", "Deep nourishment"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Dry skin", "Normal skin", "All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-SA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-SA-300" },
      ],
      sku: "NZ-AS-SA-100",
      stock: 150,
    },

    {
      name: "Seafresh Aissis Soap | Restores Discoloration | Detoxifying",
      slug: "seafresh-aissis-soap",
      description: "A handmade herbal soap with sea-fresh extracts that restores skin discoloration, detoxifies and balances oil. Refreshing natural cleanse for all skin types.",
      price: 95,
      image: "/products/seafresh-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Seafresh",
      skinTypes: ["all", "normal"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Sea Extracts", benefit: "Restores discoloration and detoxifies skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sea Extracts", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Restores discoloration", "Detoxifying", "Oil balancing", "Refreshing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-SEA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-SEA-300" },
      ],
      sku: "NZ-AS-SEA-100",
      stock: 150,
    },

    {
      name: "Tropical Aissis Soap | Prevents Wrinkles | Removes Dead Cells",
      slug: "tropical-aissis-soap",
      description: "A handmade bathing soap with tropical extracts that prevents wrinkles, removes dead skin cells and supports skin repair for a youthful, refreshed complexion.",
      price: 95,
      image: "/products/tropical-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Tropical",
      skinTypes: ["all", "dry", "normal"],
      concerns: ["dullness", "dryness"],
      keyIngredients: [
        { name: "Tropical Extracts", benefit: "Exotic nourishment and skin revitalization" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Tropical Fruit Extracts", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Prevents wrinkles", "Removes dead cells", "Skin repair", "Tropical fragrance"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-TR-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-TR-300" },
      ],
      sku: "NZ-AS-TR-100",
      stock: 150,
    },

    {
      name: "Green Apple Aissis Soap",
      slug: "green-apple-aissis-soap",
      description: "A refreshing green apple handmade herbal soap that revitalizes skin and gives it a crisp, fruity freshness with every wash.",
      price: 95,
      image: "/products/green-apple-aissis-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "aissis-soap",
      variantLabel: "Green Apple",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness"],
      keyIngredients: [
        { name: "Green Apple Extract", benefit: "Skin revitalization and crisp freshness" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Green Apple Extract", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Skin revitalization", "Refreshing scent", "Gentle cleansing", "Toning"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 95, stock: 150, sku: "NZ-AS-GA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 285, stock: 80, sku: "NZ-AS-GA-300" },
      ],
      sku: "NZ-AS-GA-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Rock Soap
    // ════════════════════════════════════════════════════════

    {
      name: "Handmade Jasmine Rock Soap | Antiseptic | Moisturizer | Anti-Ageing",
      slug: "jasmine-rock-soap-moisturizer-anti-ageing",
      description: "100% Pure Natural and Vegan Nezal Herbal Jasmine Rock Soap. Perfumed with sweet romantic jasmine fragrance that calms and relaxes mood. Treats infections, moisturises dry skin with even tone, reverses signs of ageing, soothes irritated skin and eliminates scars and acne spots.",
      price: 90,
      image: "/products/jasmine-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Jasmine",
      skinTypes: ["all", "dry", "sensitive"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Jasmine Extract",    benefit: "Natural antiseptic, treats infections" },
        { name: "Jasmine Essential Oil", benefit: "Moisturizes dry skin and reverses ageing" },
        { name: "Glycerin",           benefit: "Locks in moisture post-wash" },
        { name: "Aloe Vera",          benefit: "Soothes irritated skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Jasmine Extract", "Jasmine Essential Oil", "Glycerin", "Aloe Vera", "Coconut Oil"],
      benefits: ["Natural antiseptic", "Moisturizer for dry skin", "Anti-ageing", "Mood calming"],
      usage: "Use daily for bathing. Lather well on wet skin, massage gently and rinse.",
      suitableFor: ["All skin types", "Dry skin", "Sensitive skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-JA-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-JA-300" },
      ],
      sku: "NZ-RS-JA-100",
      stock: 150,
    },

    {
      name: "Lavender Handmade Rock Soap | Relaxing | Promotes Sleep | Soothing",
      slug: "lavender-rock-soap-relaxing-sleep",
      description: "100% Natural Vegan Handmade Nezal Herbal Lavender Rock Soap made with lavender, coconut oil and aloe vera. Detoxifies skin, promotes mental well-being, clears the mind and relieves stress. Anti-microbial, anti-inflammatory and antiseptic properties fight breakouts and balance skin pH.",
      price: 90,
      image: "/products/lavender-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Lavender",
      skinTypes: ["all", "sensitive", "acne-prone"],
      concerns: ["stress-relief", "sensitive-skin", "acne"],
      keyIngredients: [
        { name: "Lavender Essential Oil", benefit: "Calming, stress-relieving and anti-inflammatory" },
        { name: "Coconut Oil",            benefit: "Deep nourishment" },
        { name: "Aloe Vera",              benefit: "Soothing and skin balancing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Lavender Essential Oil", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Relaxing bathing experience", "Promotes sleep", "Calms skin irritation", "Anti-acne"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Sensitive skin", "Stress relief"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-LV-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-LV-300" },
      ],
      sku: "NZ-RS-LV-100",
      stock: 150,
    },

    {
      name: "Peppermint & Cucumber Rock Soap | Deep Cleanser | Heals Skin",
      slug: "peppermint-cucumber-rock-soap-heals-skin",
      description: "100% Vegan, Natural Nezal Herbal Peppermint and Cucumber Rock Soap. Suitable for all skin types, especially oily and combination skin. A perfect blend of toner, moisturizer and enchanter that removes impurities, tightens pores and gives a radiant glow. Peppermint's antiseptic properties speed skin healing.",
      price: 90,
      image: "/products/peppermint-cucumber-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Peppermint & Cucumber",
      skinTypes: ["oily", "combination", "acne-prone"],
      concerns: ["acne", "oily-skin", "open-pores"],
      keyIngredients: [
        { name: "Peppermint Oil",   benefit: "Deep cleansing, toning and oil control" },
        { name: "Cucumber Oil",     benefit: "Refreshing hydration and skin soothing" },
        { name: "Essential Oils",   benefit: "Natural moisturizing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Peppermint Oil", "Cucumber Oil", "Natural Essential Oils", "Coconut Oil", "Glycerin"],
      benefits: ["Deep cleansing", "Skin toning", "Oil control", "Heals skin"],
      usage: "Use daily for bathing. Lather on wet skin, massage gently and rinse.",
      suitableFor: ["Oily skin", "Combination skin", "Acne-prone skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-PC-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-PC-300" },
      ],
      sku: "NZ-RS-PC-100",
      stock: 150,
    },

    {
      name: "Rose Rock Soap | Reduce Scars | Good for Sensitive Skin",
      slug: "rose-rock-soap-reduce-scars",
      description: "100% Natural Handmade Rose Rock Soap with real rose extracts and rose essential oil. Mood-enhancing rose fragrance. Perfect for sensitive skin — moisturises and restores oil balance without drying. Anti-inflammatory properties reduce redness and scars.",
      price: 90,
      image: "/products/rose-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Rose",
      skinTypes: ["sensitive", "dry", "normal"],
      concerns: ["sensitive-skin", "dryness"],
      keyIngredients: [
        { name: "Rose Essential Oil", benefit: "Anti-inflammatory, reduces redness and scars" },
        { name: "Rose Extract",       benefit: "Mood enhancing and deeply moisturising" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Rose Extract", "Rose Essential Oil", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Reduces scars", "Strengthens skin", "Moisturizing", "Stress relief"],
      usage: "Use daily for bathing. Lather well on wet skin and rinse.",
      suitableFor: ["Sensitive skin", "Dry skin", "Normal skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-RO-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-RO-300" },
      ],
      sku: "NZ-RS-RO-100",
      stock: 150,
    },

    {
      name: "Strawberry Rock Soap | Anti-Aging | UV Protection | Acne Prevention",
      slug: "strawberry-rock-soap-anti-aging",
      description: "100% Vegan Natural Nezal Herbal Strawberry Rock Soap. Filled with the goodness of strawberry extracts — rich in Vitamin C, antioxidants and ellagic acid which fight free radicals, eliminate signs of premature ageing, shield skin from UV rays and reduce dark spots.",
      price: 90,
      image: "/products/strawberry-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Strawberry",
      skinTypes: ["all", "dull", "oily"],
      concerns: ["pigmentation", "dullness", "acne"],
      keyIngredients: [
        { name: "Strawberry Extract", benefit: "Rich in Vitamin C, fights free radicals" },
        { name: "Ellagic Acid",       benefit: "UV protection and skin lightening" },
        { name: "Aloe Vera",          benefit: "Anti-microbial and anti-inflammatory" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Strawberry Extract", "Ellagic Acid", "Aloe Vera", "Coconut Oil", "Glycerin"],
      benefits: ["Anti-aging", "Oil-free skin", "Skin lightening", "UV protection", "Acne prevention"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types", "Oily skin", "Dull skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-ST-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-ST-300" },
      ],
      sku: "NZ-RS-ST-100",
      stock: 150,
    },

    {
      name: "Sandalwood Rock Soap | Reduces Dark Spots | Aromatherapy",
      slug: "sandalwood-rock-soap-reduces-dark-spots",
      description: "Created with sandalwood to give a feel of well-being and aromatherapy that elates your mood and senses. Fortified with glycerin and aloe vera to revitalize the delicate skin for a smooth and soft feel post every use.",
      price: 90,
      image: "/products/sandalwood-rock-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "rock-soap",
      variantLabel: "Sandalwood",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["pigmentation", "dullness"],
      keyIngredients: [
        { name: "Sandalwood",  benefit: "Aromatherapy and mood elevation" },
        { name: "Glycerin",    benefit: "Revitalizes and softens skin" },
        { name: "Aloe Vera",   benefit: "Soothing and moisturizing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sandalwood Extract", "Glycerin", "Aloe Vera", "Coconut Oil"],
      benefits: ["Reduces dark spots", "Aromatherapy", "Soft smooth skin", "Mood elevation"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-RS-SW-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-RS-SW-300" },
      ],
      sku: "NZ-RS-SW-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Chip Soap (handmade herbal sliced soaps)
    // ════════════════════════════════════════════════════════

    {
      name: "Strawberry Chip Soap | Anti-Aging | Skin Lightening | UV Protection",
      slug: "strawberry-chip-soap-anti-aging",
      description: "100% Vegan Premium Handmade Chip Soap filled with goodness of Strawberry extracts. Rich in Vitamin C and antioxidants — fights free radicals, shields from UV rays and has skin lightening properties. Slightly acidic nature removes excess sebum for clean oil-free skin.",
      price: 90,
      image: "/products/strawberry-chip-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "chip-soap",
      variantLabel: "Strawberry",
      skinTypes: ["all", "oily", "dull"],
      concerns: ["acne", "pigmentation", "dullness"],
      keyIngredients: [
        { name: "Strawberry Extract", benefit: "Vitamin C, fights free radicals and skin lightening" },
        { name: "Ellagic Acid",       benefit: "UV protection properties" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Strawberry Extract", "Ellagic Acid", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Anti-aging", "Oil-free skin", "Skin lightening", "UV protection", "Acne treatment"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types", "Oily skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-CS-ST-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-CS-ST-300" },
      ],
      sku: "NZ-CS-ST-100",
      stock: 150,
    },

    {
      name: "Seafresh Chip Soap | Skin Exfoliation | Reduces Cellulite",
      slug: "seafresh-chip-soap-exfoliation",
      description: "100% Natural Vegan Nezal Herbal Seaweed Chip Soap. Seaweed is rich in Omega-3 fatty acids, polyphenols, vitamins B12 and minerals. With Coconut Oil and Aloe Vera it nourishes, exfoliates, detoxifies, hydrates and stimulates skin. Reduces appearance of cellulite and stretch marks.",
      price: 90,
      image: "/products/seafresh-chip-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "chip-soap",
      variantLabel: "Seafresh (Seaweed)",
      skinTypes: ["all", "normal"],
      concerns: ["dryness", "dullness"],
      keyIngredients: [
        { name: "Seaweed Extract", benefit: "Rich in Omega-3, exfoliates and detoxifies" },
        { name: "Coconut Oil",     benefit: "Hydrates and maintains skin flexibility" },
        { name: "Aloe Vera",       benefit: "Natural moisturizer" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Seaweed Extract", "Coconut Oil", "Aloe Vera", "Glycerin"],
      benefits: ["Skin exfoliation", "Cellulite reduction", "Nourishing", "Anti-inflammatory"],
      usage: "Use daily for bathing. The chip texture gently exfoliates. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-CS-SF-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-CS-SF-300" },
      ],
      sku: "NZ-CS-SF-100",
      stock: 150,
    },

    {
      name: "Lemongrass Chip Soap | Treats Acne | Toner | Relieves Stress",
      slug: "lemongrass-chip-soap-acne-toner",
      description: "100% Natural Vegan Handmade Nezal Herbal Lemongrass Chip Soap. Zesty lemon aroma, rich in vitamins A, B1-B6, folate, C and minerals. Lemongrass works as a toner and natural deodorizer. Antibacterial and antifungal properties prevent acne. Citral component relieves stress and de-stresses the mind.",
      price: 90,
      image: "/products/lemongrass-chip-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "chip-soap",
      variantLabel: "Lemongrass",
      skinTypes: ["oily", "acne-prone", "combination"],
      concerns: ["acne", "oily-skin"],
      keyIngredients: [
        { name: "Lemongrass Extract", benefit: "Anti-bacterial, toner and stress relief" },
        { name: "Coconut Oil",        benefit: "Nourishing and skin softening" },
        { name: "Aloe Vera",          benefit: "Natural deodorizer and moisturizer" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Lemongrass Extract", "Coconut Oil", "Aloe Vera", "Glycerin", "Vitamins Complex"],
      benefits: ["Treats acne", "Skin toning", "Relieves stress", "Stops body odour"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Oily skin", "Acne-prone skin", "Combination skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 90, stock: 150, sku: "NZ-CS-LG-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 270, stock: 80, sku: "NZ-CS-LG-300" },
      ],
      sku: "NZ-CS-LG-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Round Soap
    // ════════════════════════════════════════════════════════

    {
      name: "Milk & Rose Handmade Soap | Brightens | Sensitive Skin",
      slug: "milk-rose-round-soap-brightens",
      description: "A handmade herbal round soap with milk protein and rose extract. Brightens skin, removes dead cells and is especially good for sensitive skin. Gentle and nourishing with a beautiful floral fragrance.",
      price: 70,
      image: "/products/milk-rose-round-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "round-soap",
      variantLabel: "Milk & Rose",
      skinTypes: ["dry", "sensitive", "normal"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Milk Protein", benefit: "Brightens and nourishes skin gently" },
        { name: "Rose Extract", benefit: "Soothing and gentle hydration" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Milk Protein", "Rose Extract", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Brightens skin", "Removes dead cells", "Good for sensitive skin", "Nourishing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["Sensitive skin", "Dry skin"],
      sizes: [
        { size: "70g", unit: "g", quantity: 70, price: 70, stock: 150, sku: "NZ-RND-MR-70" },
        { size: "3-pack (210g)", unit: "g", quantity: 210, price: 210, stock: 80, sku: "NZ-RND-MR-210" },
      ],
      sku: "NZ-RND-MR-70",
      stock: 150,
    },

    {
      name: "Handmade Apple Blossom Soap | Skin Conditioning | Gentle Exfoliation",
      slug: "apple-blossom-round-soap",
      description: "A handmade herbal round soap with apple blossom extract for skin conditioning and gentle exfoliation. Leaves skin fresh, toned and radiantly clean.",
      price: 70,
      image: "/products/apple-blossom-round-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "round-soap",
      variantLabel: "Apple Blossom",
      skinTypes: ["all", "normal"],
      concerns: ["dullness"],
      keyIngredients: [
        { name: "Apple Blossom Extract", benefit: "Skin freshness, toning and gentle exfoliation" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Apple Blossom Extract", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Skin conditioning", "Gentle exfoliation", "Fresh scent", "Toning"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "70g", unit: "g", quantity: 70, price: 70, stock: 150, sku: "NZ-RND-AB-70" },
        { size: "3-pack (210g)", unit: "g", quantity: 210, price: 210, stock: 80, sku: "NZ-RND-AB-210" },
      ],
      sku: "NZ-RND-AB-70",
      stock: 150,
    },

    {
      name: "Handmade Peach & Mix Fruit Soap | Natural Moisturizer | Skin Protection",
      slug: "peach-mix-fruit-round-soap",
      description: "A handmade herbal round soap with peach and mixed fruit extracts that acts as a natural moisturizer and provides skin protection with a delightful fruity fragrance.",
      price: 70,
      image: "/products/peach-mix-fruit-round-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "round-soap",
      variantLabel: "Peach & Mix Fruit",
      skinTypes: ["all", "dry", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Peach Extract",        benefit: "Natural moisturizer and skin protection" },
        { name: "Mixed Fruit Extracts", benefit: "Vitamin-rich nourishment" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Peach Extract", "Mixed Fruit Extracts", "Coconut Oil", "Glycerin", "Aloe Vera"],
      benefits: ["Natural moisturizing", "Skin protection", "Fruity fragrance", "Nourishing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types", "Dry skin"],
      sizes: [
        { size: "70g", unit: "g", quantity: 70, price: 70, stock: 150, sku: "NZ-RND-PF-70" },
        { size: "3-pack (210g)", unit: "g", quantity: 210, price: 210, stock: 80, sku: "NZ-RND-PF-210" },
      ],
      sku: "NZ-RND-PF-70",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  SOAPS — Doobie Soap (Bathing Bar)
    // ════════════════════════════════════════════════════════

    {
      name: "Doobie Cincinnati White Bath Soap",
      slug: "doobie-cincinnati-white-bath-soap",
      description: "Doobie Bath Soap in Cincinnati White — crafted with carefully selected grade one ingredients. Removes impurities and daily buildup with a refreshing mood-enhancing fragrance that keeps you feeling fresh all day.",
      price: 108,
      image: "/products/doobie-cincinnati-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "doobie-soap",
      variantLabel: "Cincinnati White",
      skinTypes: ["all", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Fragrance Blend", benefit: "Refreshing mood-enhancing freshness" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Grade 1 Soap Base", "Fragrance Blend", "Glycerin", "Coconut Oil"],
      benefits: ["Deep cleansing", "Refreshing scent", "All-day freshness", "Gentle"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 108, stock: 150, sku: "NZ-DB-CW-100" },
      ],
      sku: "NZ-DB-CW-100",
      stock: 150,
    },


    // ════════════════════════════════════════════════════════
    //  GIFT KITS
    // ════════════════════════════════════════════════════════

    {
      name: "Comfort Mono Gift Kit",
      slug: "comfort-mono-gift-kit",
      description: "A thoughtfully curated Comfort Mono Gift Kit by Nezal Herbocare. Includes: Black Pepper & Cucumber Shampoo, Tulsi & Orange Hand Wash, Designer Soap Watermelon, Designer Soap Orange, Round Soap Peach, Chip Soap Rose & Rosemary, Premium Lemongrass, Rock Peppermint, Rock Strawberry — beautifully packaged for gifting.",
      price: 1000,
      image: "/products/comfort-mono-gift-kit.jpg",
      category: cat("gift-kits"),
      collectionSlug: "gift-kits",
      variantLabel: "Comfort Mono",
      skinTypes: ["all"],
      concerns: [],
      keyIngredients: [],
      ritualStep: "other",
      benefits: ["Perfect gifting option", "9 premium products included", "Beautiful eco-friendly packaging", "All occasions"],
      usage: "Contains: Black Pepper & Cucumber Shampoo, Tulsi & Orange Hand Wash, Designer Soap Watermelon, Designer Soap Orange, Round Soap Peach, Chip Soap Rose & Rosemary, Premium Lemongrass, Rock Peppermint, Rock Strawberry.",
      suitableFor: ["Gifting", "All occasions", "Birthdays", "Festivals"],
      sizes: [],
      sku: "NZ-GK-MONO",
      stock: 50,
    },

    {
      name: "Comfort Neo Gift Kit",
      slug: "comfort-neo-gift-kit",
      description: "A premium Comfort Neo Gift Kit by Nezal Herbocare. Includes: Amla & Shikakai Shampoo, Tulsi & Orange Hand Wash, Designer Soap Watermelon, Aissis Sandalwood, Round Multani Matti, Chip Soap Saffron, Premium Papaya, Premium Lemongrass, Rock Soap Rose — elegantly packaged for loved ones.",
      price: 1000,
      image: "/products/comfort-neo-gift-kit.jpg",
      category: cat("gift-kits"),
      collectionSlug: "gift-kits",
      variantLabel: "Comfort Neo",
      skinTypes: ["all"],
      concerns: [],
      keyIngredients: [],
      ritualStep: "other",
      benefits: ["9 premium products", "Luxury gift packaging", "Perfect for birthdays and festivals", "Free gift wrapping"],
      usage: "Contains: Amla & Shikakai Shampoo, Tulsi & Orange Hand Wash, Designer Soap Watermelon, Aissis Sandalwood, Round Multani Matti, Chip Soap Saffron, Premium Papaya, Premium Lemongrass, Rock Soap Rose.",
      suitableFor: ["Gifting", "Birthdays", "Festivals"],
      sizes: [],
      sku: "NZ-GK-NEO",
      stock: 50,
    },

    {
      name: "Essential Gift Kit",
      slug: "essential-gift-kit",
      description: "A curated Essential Gift Kit for everyday skincare needs. Includes: Black Pepper & Cucumber Shampoo, Tulsi & Orange Hand Wash, Rock Soap Strawberry, Rock Soap Lavender, Rock Soap Peppermint, Aissis Soap Tropical, Chip Soap Rose & Rosemary, Round Soap Peach.",
      price: 750,
      discountPrice: 764,
      image: "/products/essential-gift-kit.jpg",
      category: cat("gift-kits"),
      collectionSlug: "gift-kits",
      variantLabel: "Essential",
      skinTypes: ["all"],
      concerns: [],
      keyIngredients: [],
      ritualStep: "other",
      benefits: ["8 products included", "Everyday essentials", "Gift-ready packaging", "Great value"],
      usage: "Contains: Black Pepper & Cucumber Shampoo, Tulsi & Orange Hand Wash, Rock Soap Strawberry, Rock Soap Lavender, Rock Soap Peppermint, Aissis Soap Tropical, Chip Soap Rose & Rosemary, Round Soap Peach.",
      suitableFor: ["Gifting", "All occasions"],
      sizes: [],
      sku: "NZ-GK-ESS",
      stock: 50,
    },

    {
      name: "Essential Plus Gift Kit",
      slug: "essential-plus-gift-kit",
      description: "The Essential Plus Gift Kit — an upgraded selection of Nezal bestsellers. Includes: Neem & Tulsi Shampoo, Tulsi & Green Apple Hand Wash, Designer Soap Lime, Aissis Green Apple Soap, Round Multani Matti, Chip Soap Jasmine, Premium Papaya, Rock Soap Rose.",
      price: 850,
      discountPrice: 882,
      image: "/products/essential-plus-gift-kit.jpg",
      category: cat("gift-kits"),
      collectionSlug: "gift-kits",
      variantLabel: "Essential Plus",
      skinTypes: ["all"],
      concerns: [],
      keyIngredients: [],
      ritualStep: "other",
      benefits: ["8 premium products", "Upgrade gift option", "Elegant packaging", "Ideal for special occasions"],
      usage: "Contains: Neem & Tulsi Shampoo, Tulsi & Green Apple Hand Wash, Designer Soap Lime, Aissis Green Apple Soap, Round Multani Matti, Chip Soap Jasmine, Premium Papaya, Rock Soap Rose.",
      suitableFor: ["Gifting", "Birthdays", "Anniversaries", "Festivals"],
      sizes: [],
      sku: "NZ-GK-ESSP",
      stock: 50,
    },
  ]

  // ── 5. INSERT PRODUCTS ───────────────────────────────────
  console.log(`📦  Inserting ${productsData.length} products...`)

  const products = await Product.insertMany(
    productsData.map((p) => ({ ...p, company: companyId, isActive: true }))
  )
  console.log(`   ✓ ${products.length} products created`)

  // ── 6. SUMMARY ───────────────────────────────────────────
  const byCategory = {}
  for (const p of products) {
    const catDoc = categories.find((c) => c._id.toString() === p.category?.toString())
    const label = catDoc?.name ?? "Uncategorised"
    byCategory[label] = (byCategory[label] || 0) + 1
  }

  console.log("\n══════════════════════════════════════════════════")
  console.log("✅  SEED COMPLETE — Summary:")
  console.log(`   📂 Categories : ${categories.length}`)
  console.log(`   📦 Products   : ${products.length}`)
  console.log("\n   Products by category:")
  for (const [name, count] of Object.entries(byCategory)) {
    console.log(`     • ${name.padEnd(22)} ${count} products`)
  }
  console.log("══════════════════════════════════════════════════\n")

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message)
  console.error(err)
  process.exit(1)
})