/**
 * ============================================================
 *  NEZAL HERBOCARE — Delta Seed (New Products Only)
 *  nezal-seed/seed-nezal-new-products.js
 *
 *  Run:  node nezal-seed/seed-nezal-new-products.js
 *
 *  ⚠️  ADDITIVE ONLY — does NOT wipe anything.
 *      Skips products whose slug already exists.
 *
 *  Adds 19 new products:
 *    - 11 Face Care products (moisturizer, face washes, serums, scrubs)
 *    - 5  Bathing Bar soaps (Citrus Blast, Fasli Gulab, Morning Fresh,
 *         Neem & Tulsi, Passion)
 *    - 1  Designer Soap (Pastry)
 *    - 2  Doobie Soaps (Neem & Tulsi, Rustic Sandal)
 * ============================================================
 */

const mongoose = require("mongoose")

// ── CONNECTION ──────────────────────────────────────────────
const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority"

// ── SCHEMAS ─────────────────────────────────────────────────
const categorySchema = new mongoose.Schema(
  { name: String, slug: String, company: mongoose.Schema.Types.ObjectId, parent: mongoose.Schema.Types.ObjectId, isActive: Boolean },
  { timestamps: true }
)
delete mongoose.models.Category
const Category = mongoose.model("Category", categorySchema)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    price: { type: Number, required: true },
    discountPrice: Number,
    image: String,
    images: [String],
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    stock: { type: Number, default: 100 },
    sku: String,
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],
    collectionSlug: { type: String, lowercase: true, trim: true },
    variantLabel: { type: String, trim: true },
    skinTypes: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    keyIngredients: [{ name: String, benefit: String, icon: String }],
    ritualStep: { type: String, enum: ["cleanse", "exfoliate", "treat", "moisturize", "protect", "style", "other"], default: "other" },
    results: [{ image: String, title: String, text: String }],
    sizes: [{ size: String, unit: String, quantity: Number, price: Number, discountPrice: Number, stock: Number, sku: String }],
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true }
)
delete mongoose.models.Product
const Product = mongoose.model("Product", productSchema)

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ══════════════════════════════════════════════════════════
async function seed() {
  console.log("\n🌱  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected to nezal-db\n")

  // ── 1. FIND COMPANY ──────────────────────────────────────
  const companyDoc = await mongoose.connection.db
    .collection("companies")
    .findOne({ slug: "nezal-herbocare" })
  if (!companyDoc) throw new Error("Company 'nezal-herbocare' not found.")
  const companyId = companyDoc._id
  console.log(`🏢  Found company: ${companyDoc.name} (${companyId})\n`)

  // ── 2. LOAD CATEGORIES ───────────────────────────────────
  const categories = await Category.find({ company: companyId })
  const cat = (slug) => categories.find((c) => c.slug === slug)?._id

  // ── 3. BUILD NEW PRODUCTS ────────────────────────────────
  const newProducts = [

    // ════════════════════════════════════════════════════════
    //  FACE CARE — Moisturizer
    // ════════════════════════════════════════════════════════

    {
      name: "Almond Bliss Oil-Free Face Moisturizer",
      slug: "almond-bliss-face-moisturizer",
      description: "Indulge in the nourishing power of almonds with Almond Bliss Face Moisturizer, expertly crafted to provide long-lasting hydration for all skin types. Locks in moisture for up to 24 hours, soothes and calms dry irritated skin, supports the skin's natural barrier function and leaves skin feeling soft, supple and radiant.",
      price: 125,
      discountPrice: null,
      image: "/products/almond-bliss-moisturizer.jpg",
      category: cat("face-care"),
      collectionSlug: "face-moisturizer",
      variantLabel: "Almond Bliss",
      skinTypes: ["all", "dry", "sensitive", "normal"],
      concerns: ["dryness", "hydration"],
      keyIngredients: [
        { name: "Sweet Almond Oil", benefit: "Rich in vitamins A, B, E and fatty acids — deeply nourishes and moisturizes" },
        { name: "Hyaluronic Acid",  benefit: "Attracts and retains moisture for optimal hydration" },
        { name: "Glycerin",         benefit: "Humectant properties help retain moisture and soothe dryness" },
      ],
      ritualStep: "moisturize",
      ingredients: ["Sweet Almond Oil", "Hyaluronic Acid", "Glycerin", "Aqua"],
      benefits: ["24-hour moisture lock", "Soothes dry irritated skin", "Non-greasy oil-free formula", "Supports natural skin barrier"],
      usage: "Apply to clean toned face and neck. Gently massage into skin until absorbed. Use daily for optimal hydration.",
      suitableFor: ["All skin types", "Sensitive skin", "Dry skin"],
      sizes: [
        { size: "50gm",  unit: "g", quantity: 50,  price: 125, stock: 100, sku: "NZ-FC-ABM-50"  },
        { size: "100gm", unit: "g", quantity: 100, price: 225, stock: 100, sku: "NZ-FC-ABM-100" },
      ],
      sku: "NZ-FC-ABM-50",
      stock: 100,
    },

    // ════════════════════════════════════════════════════════
    //  FACE CARE — Face Wash
    // ════════════════════════════════════════════════════════

    {
      name: "Foaming Face Wash Aloe Vera & Vitamin C",
      slug: "foaming-face-wash-aloevera-vitamin-c",
      description: "Sulfate and Paraben free formula created to clean your soft and delicate facial skin gently. Aloe Vera acts as skin conditioner and natural moisturizer while Vitamin C helps in reduction of wrinkles, promotes collagen production, reduces hyperpigmentation, protects against sun damage, evens skin tone, brightens complexion and protects against pollution.",
      price: 350,
      image: "/products/foaming-facewash-aloevera-vitc.jpg",
      category: cat("face-care"),
      collectionSlug: "face-wash",
      variantLabel: "Aloe Vera & Vitamin C",
      skinTypes: ["all", "dry", "normal", "sensitive"],
      concerns: ["dullness", "pigmentation", "dryness"],
      keyIngredients: [
        { name: "Vitamin C",   benefit: "Promotes collagen, reduces hyperpigmentation, brightens complexion" },
        { name: "Aloe Vera",   benefit: "Skin conditioner and natural moisturizer" },
        { name: "Kojic Acid",  benefit: "Reduces pigmentation and dark spots" },
        { name: "Liquorice",   benefit: "Natural skin brightening" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sodium Methyl Cocoyl Taurate", "Sodium Methyl Oleoyl Taurate", "Kojic Acid Dipalmitate", "Liquorice Extract", "CAPB", "Glycerine", "EDTA", "Ethylhexylglycerine", "Phenoxyethanol", "Vitamin C", "Aloe Vera Extract", "Perfume", "Aqua"],
      benefits: ["Sulphate & paraben free", "Brightens complexion", "Collagen production", "Reduces hyperpigmentation"],
      usage: "Press foam pump and apply foam to wet face with the soft brush. Massage in circular motions all over and wash with lukewarm water. Pat dry with soft cotton towel.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 350, stock: 100, sku: "NZ-FW-AVC-150" },
      ],
      sku: "NZ-FW-AVC-150",
      stock: 100,
    },

    {
      name: "Foaming Face Wash Apple Cider Vinegar",
      slug: "foaming-facewash-apple-cider-vinegar",
      description: "Sulphate and Paraben free formula created to clean your soft and delicate facial skin gently. Aloe Vera acts as skin conditioner and natural moisturizer while Apple Cider extract will cleanse skin, clear clogged pores and helps prevent acne. Both ingredients work synergistically to cleanse the skin of dirt and reduce pigmentation.",
      price: 350,
      image: "/products/foaming-facewash-apple-cider.jpg",
      category: cat("face-care"),
      collectionSlug: "face-wash",
      variantLabel: "Apple Cider Vinegar",
      skinTypes: ["oily", "acne-prone", "combination", "all"],
      concerns: ["acne", "pigmentation", "oily-skin", "open-pores"],
      keyIngredients: [
        { name: "Apple Cider Vinegar", benefit: "Cleanses skin, clears clogged pores, prevents acne" },
        { name: "Aloe Vera",           benefit: "Skin conditioner and natural moisturizer" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sodium Methyl Cocoyl Taurate", "Sodium Methyl Oleoyl Taurate", "CAPB", "Glycerine", "EDTA", "Ethylhexylglycerine", "Phenoxyethanol", "Apple Cider Extract", "Vinegar", "Perfume", "Aqua"],
      benefits: ["Sulphate & paraben free", "Clears clogged pores", "Prevents acne", "Reduces pigmentation"],
      usage: "Press foam pump and apply foam to wet face. Massage in circular motions and wash with lukewarm water. Pat dry.",
      suitableFor: ["All skin types", "Oily skin", "Acne-prone skin"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 350, stock: 100, sku: "NZ-FW-ACV-150" },
      ],
      sku: "NZ-FW-ACV-150",
      stock: 100,
    },

    {
      name: "Natural Ubtan Face Wash for Radiant Complexion",
      slug: "natural-ubtan-face-wash",
      description: "Unveil radiant, healthy-looking skin with our Natural Ubtan Face Wash, inspired by ancient Ayurvedic wisdom. Gently cleanses and purifies, exfoliates and removes dead skin cells, brightens and evens skin tone, hydrates and nourishes dry skin.",
      price: 120,
      image: "/products/ubtan-face-wash.jpg",
      category: cat("face-care"),
      collectionSlug: "face-wash",
      variantLabel: "Natural Ubtan",
      skinTypes: ["all", "dry", "sensitive", "normal"],
      concerns: ["dullness", "pigmentation", "dryness"],
      keyIngredients: [
        { name: "Turmeric",     benefit: "Natural antiseptic and anti-inflammatory" },
        { name: "Neem",         benefit: "Purifies and protects skin" },
        { name: "Sandalwood",   benefit: "Soothes and calms irritated skin" },
        { name: "Rose Petals",  benefit: "Hydrates and nourishes dry skin" },
        { name: "Aloe Vera",    benefit: "Moisturizes and softens skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Turmeric Extract", "Neem Extract", "Sandalwood Powder", "Rose Petal Extract", "Aloe Vera", "Glycerin", "Aqua"],
      benefits: ["Brightens complexion", "Exfoliates dead cells", "Even skin tone", "Ayurvedic formula"],
      usage: "Wet face and neck. Apply a small amount, massage gently. Rinse with lukewarm water. Use twice daily.",
      suitableFor: ["All skin types", "Sensitive skin"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 120, stock: 100, sku: "NZ-FW-UBT-150" },
      ],
      sku: "NZ-FW-UBT-150",
      stock: 100,
    },

    {
      name: "Neem & Tulsi Face Wash | Acne Control | Gentle Cleanser",
      slug: "neem-tulsi-face-wash-acne-control",
      description: "A gentle cleanser for daily use with unique combination of Neem & Tulsi extracts which will cleanse and soothe your delicate facial skin. Aloe Vera extract and Glycerin rehydrate your facial skin by retaining essential moisture and keeps you fresh and glowing all day long.",
      price: 120,
      image: "/products/neem-tulsi-face-wash.jpg",
      category: cat("face-care"),
      collectionSlug: "face-wash",
      variantLabel: "Neem & Tulsi",
      skinTypes: ["oily", "acne-prone", "combination", "all"],
      concerns: ["acne", "oily-skin", "dullness"],
      keyIngredients: [
        { name: "Neem Extract",  benefit: "Antibacterial, controls acne and pimples" },
        { name: "Tulsi Extract", benefit: "Antioxidant, soothes and cleanses skin" },
        { name: "Aloe Vera",     benefit: "Moisturizes and keeps skin fresh" },
        { name: "Glycerin",      benefit: "Retains essential moisture" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Neem Extract", "Tulsi Extract", "Aloe Vera Extract", "Glycerin", "CAPB", "Sodium Lauryl Ether Sulphate", "Allantoin", "Ethyl Hexyl Glycerin", "Phenoxyethanol", "Perfume", "Water"],
      benefits: ["Controls acne", "Gentle daily cleanser", "Retains moisture", "Keeps skin fresh and glowing"],
      usage: "Withdraw ample quantity of gel and gently massage on complete facial skin. Clean face with lukewarm water and pat dry with soft towel.",
      suitableFor: ["All skin types", "Oily skin", "Acne-prone skin"],
      sizes: [
        { size: "100gm", unit: "g", quantity: 100, price: 120, stock: 100, sku: "NZ-FW-NT-100" },
      ],
      sku: "NZ-FW-NT-100",
      stock: 100,
    },

    {
      name: "Foam Sulphate & Paraben-Free Face Wash",
      slug: "foam-sulphate-paraben-free-face-wash",
      description: "A sulphate and paraben free foaming face wash that gently cleanses the skin. Reduces fine lines and wrinkles, brightens and evens skin tone, hydrates and plumps the skin, improves skin elasticity and firmness and soothes and calms irritated skin.",
      price: 350,
      image: "/products/foam-sulphate-free-face-wash.jpg",
      category: cat("face-care"),
      collectionSlug: "face-wash",
      variantLabel: "Sulphate Free Foam",
      skinTypes: ["all", "sensitive"],
      concerns: ["dryness", "sensitive-skin", "dullness"],
      keyIngredients: [
        { name: "Hyaluronic Acid", benefit: "Locks in moisture and soothes dryness" },
        { name: "Vitamin C",       benefit: "Boosts collagen, fades dark spots" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Sodium Methyl Cocoyl Taurate", "Sodium Methyl Oleoyl Taurate", "CAPB", "Glycerine", "EDTA", "Aqua"],
      benefits: ["Sulphate & paraben free", "Gentle cleansing", "Skin hydration", "Improves elasticity"],
      usage: "Apply foam to wet face. Massage gently in circular motions. Rinse with lukewarm water and pat dry.",
      suitableFor: ["All skin types", "Sensitive skin"],
      sizes: [
        { size: "150ml", unit: "ml", quantity: 150, price: 350, stock: 100, sku: "NZ-FW-SF-150" },
      ],
      sku: "NZ-FW-SF-150",
      stock: 100,
    },

    // ════════════════════════════════════════════════════════
    //  FACE CARE — Serums
    // ════════════════════════════════════════════════════════

    {
      name: "Spotless Skin Tea Tree & Salicylic Acid Acne Serum",
      slug: "spotless-skin-tea-tree-salicylic-acne-serum",
      description: "Say goodbye to acne and hello to clear, radiant skin with this powerful non-comedogenic formula that combines the antibacterial properties of Tea Tree Oil with the exfoliating benefits of Salicylic Acid. Reduces acne and prevents future breakouts, unclogs pores and minimizes their appearance, soothes redness and inflammation.",
      price: 750,
      image: "/products/tea-tree-salicylic-serum.jpg",
      category: cat("face-care"),
      collectionSlug: "face-serum",
      variantLabel: "Tea Tree & Salicylic Acid",
      skinTypes: ["oily", "acne-prone", "combination"],
      concerns: ["acne", "oily-skin", "open-pores"],
      keyIngredients: [
        { name: "3% Tea Tree Oil",  benefit: "Natural antibacterial and antifungal properties" },
        { name: "2% Salicylic Acid", benefit: "Exfoliates and unclogs pores" },
        { name: "Hyaluronic Acid",   benefit: "Hydrates and plumps the skin" },
      ],
      ritualStep: "treat",
      ingredients: ["Tea Tree Oil (3%)", "Salicylic Acid (2%)", "Hyaluronic Acid", "Glycerin", "Aqua"],
      benefits: ["Reduces acne", "Unclogs pores", "Soothes redness", "Prevents future breakouts"],
      usage: "Apply 2–3 drops to clean toned face. Gently massage into skin. Use daily for optimal results.",
      suitableFor: ["Oily skin", "Acne-prone skin", "Combination skin"],
      sizes: [
        { size: "30ml", unit: "ml", quantity: 30, price: 750, stock: 100, sku: "NZ-FS-TTS-30" },
      ],
      sku: "NZ-FS-TTS-30",
      stock: 100,
    },

    {
      name: "Face Serum Hyaluronic Acid & Niacinamide | Anti-Aging",
      slug: "face-serum-hyaluronic-acid-niacinamide",
      description: "Niacinamide (Vitamin B3) is a unique skin recharger — the most gentle skin nourisher which helps enhance your natural skin creating, making skin firm and feel younger. Hyaluronic Acid in this formula helps in hydrating skin, unclogs pores, heals breakouts, controls oil secretion and reduces spots. Both work synergistically for complete skincare and fresh skin regeneration.",
      price: 750,
      image: "/products/hyaluronic-niacinamide-serum.jpg",
      category: cat("face-care"),
      collectionSlug: "face-serum",
      variantLabel: "Hyaluronic Acid & Niacinamide",
      skinTypes: ["all", "dry", "oily", "combination"],
      concerns: ["dryness", "hydration", "acne", "open-pores"],
      keyIngredients: [
        { name: "Niacinamide (Vitamin B3)", benefit: "Skin recharger — firms skin and makes it feel younger" },
        { name: "Hyaluronic Acid",          benefit: "Hydrates, unclogs pores, controls oil, reduces spots" },
      ],
      ritualStep: "treat",
      ingredients: ["Niacinamide", "Propanediol", "Glycerin", "EHGP", "Hyaluronic Acid", "Aqua"],
      benefits: ["Anti-aging", "Deep hydration", "Pore cleansing", "Oil control", "Glowing skin all seasons"],
      usage: "Withdraw few drops from the dispenser bottle and apply gently to previously washed facial skin. Allow the actives to absorb.",
      suitableFor: ["All skin types", "Dry to oily skin"],
      sizes: [
        { size: "30ml", unit: "ml", quantity: 30, price: 750, stock: 100, sku: "NZ-FS-HAN-30" },
      ],
      sku: "NZ-FS-HAN-30",
      stock: 100,
    },

    {
      name: "Face Serum Vitamin C & Niacinamide | Collagen Production | Natural Glow",
      slug: "face-serum-vitamin-c-niacinamide",
      description: "Niacinamide (Vitamin B3) is the most gentle skin nourisher which makes skin firm and feel younger. Vitamin C serum promotes collagen production, reduces hyperpigmentation, protects against sun damage, evens skin tone, brightens complexion and protects against pollution. Both ingredients combined work synergistically to enhance skin conditioning for a flawless appearance.",
      price: 750,
      image: "/products/vitamin-c-niacinamide-serum.jpg",
      category: cat("face-care"),
      collectionSlug: "face-serum",
      variantLabel: "Vitamin C & Niacinamide",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness", "pigmentation"],
      keyIngredients: [
        { name: "Vitamin C",    benefit: "Collagen production, reduces hyperpigmentation, brightens complexion" },
        { name: "Niacinamide",  benefit: "Firms skin, the most gentle skin nourisher" },
      ],
      ritualStep: "treat",
      ingredients: ["Niacinamide", "Propanediol", "Glycerin", "EHGP", "Hydroxy Ethyl Cellulose", "Vitamin C", "Aqua"],
      benefits: ["Collagen production", "Reduces hyperpigmentation", "Natural glow", "Sun damage protection", "Even skin tone"],
      usage: "Withdraw few drops from the dispenser bottle and apply gently to previously washed facial skin. Allow the actives to absorb.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "30ml", unit: "ml", quantity: 30, price: 750, stock: 100, sku: "NZ-FS-VCN-30" },
      ],
      sku: "NZ-FS-VCN-30",
      stock: 100,
    },

    // ════════════════════════════════════════════════════════
    //  FACE CARE — Scrubs
    // ════════════════════════════════════════════════════════

    {
      name: "Skin Polish Apricot Seed Face Scrub",
      slug: "skin-polish-apricot-seed-face-scrub",
      description: "Unveil smoother, brighter skin with this Apricot Glow Exfoliating Face Scrub. This gentle yet effective formula combines the natural goodness of apricot seeds and walnut shell to gently exfoliate and remove dead skin cells, reveal radiant even-toned complexion, soften fine lines and unclog pores. Enriched with Vitamin E and natural antioxidants.",
      price: 95,
      image: "/products/apricot-seed-face-scrub.jpg",
      category: cat("face-care"),
      collectionSlug: "face-scrub",
      variantLabel: "Apricot Seed (100gm)",
      skinTypes: ["all", "dull", "normal"],
      concerns: ["dullness", "open-pores", "acne"],
      keyIngredients: [
        { name: "Apricot Seeds",   benefit: "Natural exfoliant rich in antioxidants" },
        { name: "Walnut Shell",    benefit: "Gentle effective exfoliator" },
        { name: "Vitamin E",       benefit: "Moisturizes and protects skin" },
      ],
      ritualStep: "exfoliate",
      ingredients: ["Apricot Seed Powder", "Walnut Shell Powder", "Vitamin E", "Natural Antioxidants", "Glycerin", "Aqua"],
      benefits: ["Removes dead skin cells", "Reveals radiant complexion", "Unclogs pores", "Removes blackheads and whiteheads"],
      usage: "Massage onto damp face in circular motions. Rinse thoroughly with warm water. Use 1–2 times a week.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100gm", unit: "g", quantity: 100, price: 95, stock: 100, sku: "NZ-FS-APS-100" },
      ],
      sku: "NZ-FS-APS-100",
      stock: 100,
    },

    {
      name: "Apricot Face Scrub with Niacinamide",
      slug: "apricot-face-scrub-niacinamide",
      description: "This unique formula contains walnut scrub beads with apricot extract which help in gentle and mild exfoliation, cleans clogged pores and helps in reducing acne. Niacinamide (Vitamin B-3) in this formula helps retain moisture, reduces inflammation and rebuilds healthy skin cells post damage due to sun exposure.",
      price: 95,
      image: "/products/apricot-scrub-niacinamide.jpg",
      category: cat("face-care"),
      collectionSlug: "face-scrub",
      variantLabel: "Apricot & Niacinamide",
      skinTypes: ["all", "oily", "acne-prone"],
      concerns: ["acne", "dullness", "open-pores"],
      keyIngredients: [
        { name: "Apricot Extract", benefit: "Gentle mild exfoliation, cleans clogged pores" },
        { name: "Walnut Powder",   benefit: "Exfoliating scrub beads" },
        { name: "Niacinamide",     benefit: "Retains moisture, reduces inflammation, rebuilds healthy skin cells" },
      ],
      ritualStep: "exfoliate",
      ingredients: ["Xanthan Gum", "Carbomer 940", "Glycerin", "Niacinamide", "Walnut Powder", "Apricot Extract", "Apricot Perfume", "Ethyl Hexyl Glycerin", "Phenoxyethanol", "Aloe Vera Extract", "Aqua"],
      benefits: ["Gentle exfoliation", "Reduces acne", "Retains moisture", "Anti-inflammatory", "Rebuilds healthy skin cells"],
      usage: "Step 1: Clean face with lukewarm water and pat dry. Step 2: Apply small quantity in gentle circular motion over face and neck. Step 3: Rinse with lukewarm water and pat dry with soft cotton napkin.",
      suitableFor: ["All skin types", "Oily skin", "Acne-prone skin"],
      sizes: [
        { size: "100gm", unit: "g", quantity: 100, price: 95, stock: 100, sku: "NZ-FS-APN-100" },
      ],
      sku: "NZ-FS-APN-100",
      stock: 100,
    },

    // ════════════════════════════════════════════════════════
    //  SOAPS — Designer Soap (new)
    // ════════════════════════════════════════════════════════

    {
      name: "Pastry Designer Soap",
      slug: "pastry-designer-soap",
      description: "A beautifully crafted pastry-shaped designer soap by Nezal Herbocare. A unique handmade soap that looks as good as it feels — perfect for gifting or as a luxurious bathroom addition.",
      price: 149,
      image: "/products/pastry-designer-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "designer-soap",
      variantLabel: "Pastry",
      skinTypes: ["all"],
      concerns: [],
      keyIngredients: [
        { name: "Natural Soap Base", benefit: "Gentle cleansing with moisturizing properties" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Glycerin", "Coconut Oil", "Fragrance"],
      benefits: ["Unique pastry shape", "Gentle cleansing", "Moisturizing", "Great for gifting"],
      usage: "Use daily for bathing. Lather well on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, stock: 150, sku: "NZ-DS-PT-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 447, stock: 80, sku: "NZ-DS-PT-300" },
      ],
      sku: "NZ-DS-PT-100",
      stock: 150,
    },

    // ════════════════════════════════════════════════════════
    //  SOAPS — Bathing Bar (new sub-collection)
    // ════════════════════════════════════════════════════════

    {
      name: "Citrus Blast Bathing Bar",
      slug: "citrus-blast-bathing-bar",
      description: "CITRUS BLAST — a gentle transparent soap with refreshing tangy orange fragrance which helps in complete cleansing of your body without excessive drying. Contains rich natural glycerin with aloe vera extract which helps your delicate skin stay conditioned and hydrated post each use.",
      price: 60,
      image: "/products/citrus-blast-bathing-bar.jpg",
      category: cat("soaps"),
      collectionSlug: "bathing-bar",
      variantLabel: "Citrus Blast",
      skinTypes: ["all", "normal", "dry"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Orange Fragrance", benefit: "Refreshing tangy citrus freshness" },
        { name: "Natural Glycerin", benefit: "Conditions and hydrates skin post wash" },
        { name: "Aloe Vera",        benefit: "Keeps delicate skin conditioned" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Glycerin", "Aloe Vera Extract", "Orange Fragrance"],
      benefits: ["Gentle cleansing", "No excessive drying", "Skin conditioning", "Refreshing citrus scent"],
      usage: "Use daily for bathing. Lather well on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 60, stock: 150, sku: "NZ-BB-CB-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 180, stock: 80, sku: "NZ-BB-CB-300" },
      ],
      sku: "NZ-BB-CB-100",
      stock: 150,
    },

    {
      name: "Fasli Gulab Bathing Bar",
      slug: "fasli-gulab-bathing-bar",
      description: "FASLI GULAB — Natural combination of exotic rose fragrance cherished since ages. Rose oil used in the product gives you an enhanced feeling of empowerment. Aloe Vera adds to the skin conditioning properties making this soap a unique value addition to your daily bathing routine.",
      price: 60,
      image: "/products/fasli-gulab-bathing-bar.jpg",
      category: cat("soaps"),
      collectionSlug: "bathing-bar",
      variantLabel: "Fasli Gulab (Rose)",
      skinTypes: ["all", "dry", "sensitive"],
      concerns: ["dryness", "sensitive-skin"],
      keyIngredients: [
        { name: "Rose Oil",   benefit: "Empowering fragrance and skin nourishment" },
        { name: "Aloe Vera",  benefit: "Skin conditioning properties" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Rose Oil", "Aloe Vera Extract", "Glycerin"],
      benefits: ["Exotic rose fragrance", "Skin conditioning", "Empowering bathing experience", "Gentle cleansing"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 60, stock: 150, sku: "NZ-BB-FG-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 180, stock: 80, sku: "NZ-BB-FG-300" },
      ],
      sku: "NZ-BB-FG-100",
      stock: 150,
    },

    {
      name: "Morning Fresh Bathing Bar",
      slug: "morning-fresh-bathing-bar",
      description: "MORNING FRESH — This natural soap gives a complete refreshment to clean up and be ready for a hard day's work. The fragrance will remind you of the early morning freshness of a beach. Gently cleanses with soft moisturizing properties to start your day on a positive note.",
      price: 60,
      image: "/products/morning-fresh-bathing-bar.jpg",
      category: cat("soaps"),
      collectionSlug: "bathing-bar",
      variantLabel: "Morning Fresh",
      skinTypes: ["all", "normal"],
      concerns: [],
      keyIngredients: [
        { name: "Sea Fresh Fragrance", benefit: "Morning beach freshness for the senses" },
        { name: "Natural Glycerin",    benefit: "Moisturizing and gentle cleansing" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Glycerin", "Aloe Vera Extract", "Sea Fresh Fragrance"],
      benefits: ["Morning freshness", "Gentle cleansing", "Moisturizing", "Positive start to day"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 60, stock: 150, sku: "NZ-BB-MF-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 180, stock: 80, sku: "NZ-BB-MF-300" },
      ],
      sku: "NZ-BB-MF-100",
      stock: 150,
    },

    {
      name: "Neem & Tulsi Bathing Bar",
      slug: "neem-tulsi-bathing-bar",
      description: "NEEM & TULSI — Both Neem and Tulsi are natural extracts which help in complete disinfection of your skin, adding to the gentle cleansing properties of this formula. Glycerin and Aloe Vera present in this unique formula replenish the excessive loss of moisture which is a general phenomenon with soap use on delicate skin.",
      price: 60,
      image: "/products/neem-tulsi-bathing-bar.jpg",
      category: cat("soaps"),
      collectionSlug: "bathing-bar",
      variantLabel: "Neem & Tulsi",
      skinTypes: ["all", "oily", "acne-prone"],
      concerns: ["acne", "oily-skin"],
      keyIngredients: [
        { name: "Neem Extract",  benefit: "Natural disinfection and antibacterial cleansing" },
        { name: "Tulsi Extract", benefit: "Antioxidant and skin purifying" },
        { name: "Aloe Vera",     benefit: "Replenishes moisture loss" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Neem Extract", "Tulsi Extract", "Glycerin", "Aloe Vera Extract"],
      benefits: ["Natural disinfection", "Prevents moisture loss", "Gentle cleansing", "Antibacterial"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Oily skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 60, stock: 150, sku: "NZ-BB-NT-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 180, stock: 80, sku: "NZ-BB-NT-300" },
      ],
      sku: "NZ-BB-NT-100",
      stock: 150,
    },

    {
      name: "Passion Bathing Bar",
      slug: "passion-bathing-bar",
      description: "PASSION — This soap creates a feeling of wellbeing and enhances your personal confidence. The glycerin and aloe vera will prepare your delicate skin for every intimate occasion with soft nourished skin.",
      price: 60,
      image: "/products/passion-bathing-bar.jpg",
      category: cat("soaps"),
      collectionSlug: "bathing-bar",
      variantLabel: "Passion",
      skinTypes: ["all", "sensitive"],
      concerns: [],
      keyIngredients: [
        { name: "Natural Glycerin", benefit: "Softens and prepares delicate skin" },
        { name: "Aloe Vera",        benefit: "Conditions and soothes skin" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Natural Soap Base", "Glycerin", "Aloe Vera Extract", "Fragrance"],
      benefits: ["Wellbeing feeling", "Confidence boosting", "Soft nourished skin", "Gentle formula"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 60, stock: 150, sku: "NZ-BB-PS-100" },
        { size: "3-pack (300g)", unit: "g", quantity: 300, price: 180, stock: 80, sku: "NZ-BB-PS-300" },
      ],
      sku: "NZ-BB-PS-100",
      stock: 150,
    },

    // ════════════════════════════════════════════════════════
    //  SOAPS — Doobie (additional variants)
    // ════════════════════════════════════════════════════════

    {
      name: "Doobie Neem & Tulsi Bath Soap",
      slug: "doobie-neem-tulsi-bath-soap",
      description: "Doobie Neem & Tulsi pure natural soap provides intensive softening and moisturizes skin while helping protect against dirt, viruses and infectious bacteria. Neem and Tulsi extracts provide natural antibacterial disinfection. This special formula is designed for day to day cleansing and nourishing for smooth, fresh and radiant looking skin.",
      price: 108,
      image: "/products/doobie-neem-tulsi-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "doobie-soap",
      variantLabel: "Neem & Tulsi",
      skinTypes: ["all", "oily", "acne-prone"],
      concerns: ["acne", "oily-skin"],
      keyIngredients: [
        { name: "Neem Extract",  benefit: "Natural antibacterial and antiviral protection" },
        { name: "Tulsi Extract", benefit: "Antioxidant and skin purifying" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Grade 1 Soap Base", "Neem Extract", "Tulsi Extract", "Glycerin", "Coconut Oil"],
      benefits: ["Antibacterial protection", "Deep cleansing", "Skin softening", "Daily nourishment"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "120g", unit: "g", quantity: 120, price: 108, stock: 150, sku: "NZ-DB-NT-120" },
      ],
      sku: "NZ-DB-NT-120",
      stock: 150,
    },

    {
      name: "Doobie Rustic Sandal Bath Soap",
      slug: "doobie-rustic-sandal-bath-soap",
      description: "Doobie Rustic Sandal pure natural soap provides intensive softening and moisturizes skin while protecting against dirt, viruses and infectious bacteria. Sandalwood gives a feel of well-being and aromatherapy that elates mood and senses. Specially designed for day to day cleansing and nourishing for smooth, fresh and radiant looking skin.",
      price: 108,
      image: "/products/doobie-rustic-sandal-soap.jpg",
      category: cat("soaps"),
      collectionSlug: "doobie-soap",
      variantLabel: "Rustic Sandal",
      skinTypes: ["all", "dry", "normal"],
      concerns: ["dryness"],
      keyIngredients: [
        { name: "Sandalwood",   benefit: "Aromatherapy, mood elevation and skin softening" },
        { name: "Glycerin",     benefit: "Deep moisturizing and skin conditioning" },
      ],
      ritualStep: "cleanse",
      ingredients: ["Grade 1 Soap Base", "Sandalwood Extract", "Glycerin", "Coconut Oil", "Fragrance"],
      benefits: ["Sandalwood aromatherapy", "Skin softening", "Deep cleansing", "Mood elevation"],
      usage: "Use daily for bathing. Lather on wet skin and rinse.",
      suitableFor: ["All skin types"],
      sizes: [
        { size: "120g", unit: "g", quantity: 120, price: 108, stock: 150, sku: "NZ-DB-RS-120" },
      ],
      sku: "NZ-DB-RS-120",
      stock: 150,
    },
  ]

  // ── 4. INSERT (skip existing slugs) ──────────────────────
  console.log(`📦  Checking ${newProducts.length} products for duplicates...`)

  const existingSlugs = new Set(
    (await Product.find({ company: companyId }).select("slug").lean()).map((p) => p.slug)
  )

  const toInsert = newProducts.filter((p) => {
    if (existingSlugs.has(p.slug)) {
      console.log(`   ⏭️  Skipping (already exists): ${p.slug}`)
      return false
    }
    return true
  })

  if (toInsert.length === 0) {
    console.log("\n✅  All products already exist — nothing to insert.\n")
    await mongoose.disconnect()
    process.exit(0)
  }

  const inserted = await Product.insertMany(
    toInsert.map((p) => ({ ...p, company: companyId, isActive: true }))
  )

  // ── 5. SUMMARY ───────────────────────────────────────────
  const total = await Product.countDocuments({ company: companyId })

  console.log("\n══════════════════════════════════════════════════")
  console.log("✅  DELTA SEED COMPLETE — Summary:")
  console.log(`   📦 New products inserted : ${inserted.length}`)
  console.log(`   📦 Total products now    : ${total}`)
  console.log("\n   Inserted:")
  inserted.forEach((p) => console.log(`     • ${p.name}`))
  console.log("══════════════════════════════════════════════════\n")

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message)
  console.error(err)
  process.exit(1)
})