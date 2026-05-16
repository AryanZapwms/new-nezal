/**
 * ============================================================
 *  NEZAL HERBOCARE — Full Fresh Seed Script
 *  Run: node nezal-seed/seed-full.js
 *
 *  ⚠️  DESTRUCTIVE — wipes Collection + Product collections
 *      Run only on a clean DB or when you want a full reset.
 *
 *  Seeds:
 *    - 18 Collection documents
 *    - All product variants (one document per variant)
 * ============================================================
 */

const mongoose = require("mongoose")

// ── CONNECTION ──────────────────────────────────────────────
const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority"

// ── SCHEMAS ─────────────────────────────────────────────────

const collectionSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    slug:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline:          { type: String, trim: true },
    heroImage:        String,
    heroHeadline:     String,
    heroSubheadline:  String,
    storyText:        String,
    keyIngredients:   [{ name: { type: String, required: true }, benefit: { type: String, required: true }, icon: String }],
    concerns:         { type: [String], default: [] },
    ritualSteps:      [{ step: { type: Number, required: true }, label: { type: String, required: true }, description: String, linkedCollectionSlug: String }],
    relatedCollections: { type: [String], default: [] },
    faq:              [{ question: { type: String, required: true }, answer: { type: String, required: true } }],
    seoTitle:         String,
    seoDescription:   String,
    metaKeywords:     [String],
    navCategory:      { type: String, enum: ["face-care", "body-care", "hair-care", "gift-kits"], required: true },
    subCategory:      { type: String, enum: ["face-care", "soaps", "body-care", "hair-care", "gift-kits"], required: true },
    sortOrder:        { type: Number, default: 0 },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
)
delete mongoose.models.Collection
const Collection = mongoose.model("Collection", collectionSchema)

const productSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    slug:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    price:          { type: Number, required: true },
    discountPrice:  Number,
    image:          String,
    images:         [String],
    collectionSlug: String,
    variantLabel:   String,
    skinTypes:      [String],
    concerns:       [String],
    keyIngredients: [{ name: String, benefit: String, icon: String }],
    ritualStep:     String,
    sizes:          [{ size: String, unit: String, quantity: Number, price: Number, discountPrice: Number, stock: Number }],
    stock:          { type: Number, default: 100 },
    isActive:       { type: Boolean, default: true },
    company:        { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  },
  { strict: false, timestamps: true }
)
delete mongoose.models.Product
const Product = mongoose.model("Product", productSchema)

// Helper — generate slug from name
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ══════════════════════════════════════════════════════════
//  COLLECTIONS DATA
// ══════════════════════════════════════════════════════════

const collectionsData = [

  // ── FACE CARE ─────────────────────────────────────────────

  {
    name: "Foaming Face Wash",
    slug: "foaming-face-wash",
    tagline: "Deep cleanse without stripping your skin",
    heroImage: "/collections/foaming-face-wash-hero.jpg",
    heroHeadline: "Deep Cleansing & Skin Freshness",
    heroSubheadline: "A gentle foaming cleanser that removes dirt, excess oil and impurities while maintaining skin hydration.",
    storyText: "Great skin starts with a clean canvas. Our foaming face wash is formulated with Vitamin C and Apple Cider Vinegar — two powerhouse actives that cleanse deeply without disrupting your skin's natural moisture barrier. Gentle enough for daily use, effective enough to see results.",
    keyIngredients: [
      { name: "Vitamin C",          benefit: "Brightens and evens skin tone"         },
      { name: "Apple Cider Vinegar",benefit: "Balances pH and keeps pores clear"      },
      { name: "Aloe Vera",          benefit: "Soothes and hydrates post-cleanse"      },
    ],
    concerns: ["acne", "oily-skin", "pigmentation", "dullness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Use morning and night on wet skin",         linkedCollectionSlug: "foaming-face-wash" },
      { step: 2, label: "Treat",      description: "Follow with a targeted face serum",          linkedCollectionSlug: "face-serum"        },
      { step: 3, label: "Moisturize", description: "Lock in hydration with a light moisturizer", linkedCollectionSlug: "body-lotion"       },
    ],
    relatedCollections: ["face-serum", "aloe-vera-gel"],
    faq: [
      { question: "Is the foaming face wash suitable for daily use?",       answer: "Yes, both variants are formulated for twice-daily use — morning and night." },
      { question: "Which variant is better for acne-prone skin?",           answer: "The Apple Cider Vinegar variant helps keep pores clear and supports a balanced complexion." },
      { question: "Can I use Vitamin C face wash in the morning?",          answer: "Absolutely. Vitamin C in the morning adds antioxidant protection throughout the day." },
      { question: "Is it safe for sensitive skin?",                         answer: "Both formulas are mild and pH-balanced. If you have very sensitive skin, patch test first." },
    ],
    seoTitle: "Herbal Foaming Face Wash | Vitamin C & ACV Cleanser by Nezal",
    seoDescription: "Shop Nezal's foaming face wash — Vitamin C and Apple Cider Vinegar variants for deep cleansing, clear pores and glowing skin.",
    metaKeywords: ["foaming face wash", "vitamin c face wash", "apple cider vinegar face wash", "herbal cleanser india"],
    navCategory: "face-care",
    subCategory: "face-care",
    sortOrder: 1,
  },

  {
    name: "Face Serum",
    slug: "face-serum",
    tagline: "Targeted actives for every skin story",
    heroImage: "/collections/face-serum-hero.jpg",
    heroHeadline: "Science Meets Botanical Wisdom",
    heroSubheadline: "Concentrated herbal serums that target your specific skin concerns — acne, dullness, or dehydration.",
    storyText: "A serum is where your skincare ritual gets serious. Nezal's face serum collection pairs Ayurvedic botanical extracts with modern active ingredients — salicylic acid, niacinamide, vitamin C and hyaluronic acid — to deliver targeted results without compromising on natural formulation.",
    keyIngredients: [
      { name: "Tea Tree Oil",     benefit: "Controls excess sebum naturally"          },
      { name: "Salicylic Acid",   benefit: "Unclogs pores and clears breakouts"       },
      { name: "Vitamin C",        benefit: "Brightens and evens skin tone"            },
      { name: "Niacinamide",      benefit: "Minimises pores and reduces pigmentation" },
      { name: "Hyaluronic Acid",  benefit: "Locks in deep, long-lasting hydration"   },
    ],
    concerns: ["acne", "pigmentation", "open-pores", "dullness", "dehydration"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Start with foaming face wash",              linkedCollectionSlug: "foaming-face-wash" },
      { step: 2, label: "Serum",      description: "Apply 2–3 drops, press gently into skin",   linkedCollectionSlug: "face-serum"        },
      { step: 3, label: "Moisturize", description: "Seal with aloe vera gel or a moisturizer",  linkedCollectionSlug: "aloe-vera-gel"     },
    ],
    relatedCollections: ["foaming-face-wash", "aloe-vera-gel"],
    faq: [
      { question: "Which serum is right for acne-prone skin?",  answer: "Tea Tree + Salicylic Acid serum controls sebum and clears pores without over-drying." },
      { question: "Can I use Vitamin C serum in the morning?",  answer: "Yes — Vitamin C provides antioxidant protection against environmental damage all day." },
      { question: "Can I layer two serums?",                    answer: "Use one serum at a time. Alternate morning/night if targeting multiple concerns."      },
      { question: "How long before I see results?",             answer: "Most customers notice changes in 3–4 weeks. For pigmentation allow 6–8 weeks."         },
    ],
    seoTitle: "Herbal Face Serum | Vitamin C, Tea Tree, Hyaluronic Acid by Nezal",
    seoDescription: "Shop Nezal's face serum collection — Vitamin C + Niacinamide, Tea Tree + Salicylic Acid, Hyaluronic Acid serums for every skin concern.",
    metaKeywords: ["herbal face serum india", "vitamin c serum", "tea tree serum acne", "hyaluronic acid serum", "niacinamide serum"],
    navCategory: "face-care",
    subCategory: "face-care",
    sortOrder: 2,
  },

  // ── SOAPS ─────────────────────────────────────────────────

  {
    name: "Rock Soap",
    slug: "rock-soap",
    tagline: "Ancient mineral-rich rocks meet Ayurvedic botanicals",
    heroImage: "/collections/rock-soap-hero.jpg",
    heroHeadline: "Pure Natural Cleansing Ritual",
    heroSubheadline: "Handcrafted with natural oils, botanical extracts and essential nutrients for deep cleansing while maintaining skin hydration.",
    storyText: "Rock soaps are one of nature's oldest skincare secrets. Nezal's Rock Soap collection blends mineral-rich natural formations with Ayurvedic botanicals — aloe vera, glycerine, coconut oil — to create a deeply cleansing yet hydrating bar that respects your skin's natural balance.",
    keyIngredients: [
      { name: "Aloe Vera",    benefit: "Soothes and hydrates while cleansing" },
      { name: "Glycerine",    benefit: "Locks in moisture and prevents dryness" },
      { name: "Coconut Oil",  benefit: "Deep nourishment and skin softening"   },
      { name: "Essential Oils", benefit: "Aromatherapy and natural fragrance"  },
    ],
    concerns: ["dryness", "oily-skin", "sensitive-skin", "body-odor"],
    ritualSteps: [
      { step: 1, label: "Wet",    description: "Wet skin thoroughly with warm water",      linkedCollectionSlug: "rock-soap"   },
      { step: 2, label: "Lather", description: "Work soap into a rich lather on the skin", linkedCollectionSlug: "rock-soap"   },
      { step: 3, label: "Nourish",description: "Follow with body lotion for all-day soft skin", linkedCollectionSlug: "body-lotion" },
    ],
    relatedCollections: ["body-lotion", "bath-salt", "premium-soap"],
    faq: [
      { question: "Are rock soaps suitable for sensitive skin?",    answer: "Yes. Rose and Lavender variants are especially gentle and ideal for sensitive skin types." },
      { question: "Do rock soaps lather well?",                     answer: "Yes — enriched with glycerine and coconut oil, they produce a rich, creamy lather." },
      { question: "How long does one rock soap last?",              answer: "With regular daily use, one bar typically lasts 3–4 weeks." },
      { question: "Can I use rock soap on my face?",               answer: "We recommend using our dedicated foaming face wash for the face. Rock soaps are formulated for body use." },
    ],
    seoTitle: "Rock Soap Collection | Natural Handcrafted Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's rock soap collection — Peppermint, Jasmine, Rose, Sandalwood, Lavender and Strawberry. Natural botanical bar soaps for every skin type.",
    metaKeywords: ["rock soap india", "natural bar soap", "herbal bath soap", "handcrafted soap india", "botanical soap"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 1,
  },

  {
    name: "Designer Soap",
    slug: "designer-soap",
    tagline: "Aesthetic skincare with functional benefits",
    heroImage: "/collections/designer-soap-hero.jpg",
    heroHeadline: "Where Beauty Meets Skincare",
    heroSubheadline: "Elegantly crafted soaps combining visual appeal with powerful natural skincare ingredients.",
    storyText: "Why should skincare be purely functional? Nezal Designer Soaps are crafted to be as beautiful as they are effective — combining fresh citrus and fruit extracts with skin-loving oils in visually stunning bar forms that elevate your daily bathing ritual.",
    keyIngredients: [
      { name: "Lemon Extract",      benefit: "Deep cleansing with refreshing effect"  },
      { name: "Orange Extract",     benefit: "Energizes and tones skin"               },
      { name: "Watermelon Extract", benefit: "Hydrates and cools sun-exposed skin"    },
      { name: "Vitamin C",          benefit: "Antioxidant brightening"                },
    ],
    concerns: ["pigmentation", "dullness", "oily-skin"],
    ritualSteps: [
      { step: 1, label: "Cleanse",  description: "Use daily for a refreshing cleanse",        linkedCollectionSlug: "designer-soap" },
      { step: 2, label: "Rinse",    description: "Rinse thoroughly with cool water",           linkedCollectionSlug: "designer-soap" },
      { step: 3, label: "Moisturize", description: "Follow with body lotion to seal softness", linkedCollectionSlug: "body-lotion"   },
    ],
    relatedCollections: ["premium-soap", "body-lotion", "rock-soap"],
    faq: [
      { question: "What makes Designer Soaps different?",         answer: "They combine aesthetic design with functional citrus and fruit extracts for visible skin benefits." },
      { question: "Which variant is best for brightening?",       answer: "The Lemon variant is formulated specifically for deep cleansing and a brightening effect." },
      { question: "Are these soaps suitable for daily use?",      answer: "Yes — all three variants are formulated for daily use." },
    ],
    seoTitle: "Designer Soap Collection | Aesthetic Natural Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's designer soap collection — Lemon, Orange and Watermelon. Visually stunning, naturally formulated soaps for glowing skin.",
    metaKeywords: ["designer soap india", "lemon soap", "orange soap", "natural soap", "fruit soap india"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 2,
  },

  {
    name: "Round Soap",
    slug: "round-soap",
    tagline: "Gentle care for everyday skin",
    heroImage: "/collections/round-soap-hero.jpg",
    heroHeadline: "Daily Ritual, Naturally",
    heroSubheadline: "Designed for daily use — the perfect balance of cleansing, hydration and nourishment for healthy skin.",
    storyText: "Sometimes the best skincare is the simplest. Nezal's Round Soap collection offers nine carefully crafted variants — from the exfoliating Honey & Oatmeal to the acne-fighting Tea Tree & Peppermint — each designed to make your daily cleanse a moment of genuine skin nourishment.",
    keyIngredients: [
      { name: "Honey",        benefit: "Natural humectant for deep hydration"   },
      { name: "Tea Tree Oil", benefit: "Antibacterial acne control"             },
      { name: "Oatmeal",      benefit: "Gentle exfoliation and soothing"        },
      { name: "Multani Mitti",benefit: "Oil control and deep pore cleansing"    },
      { name: "Lavender Oil", benefit: "Calming and stress-relieving aromatherapy" },
    ],
    concerns: ["acne", "oily-skin", "dryness", "sensitive-skin"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Lather and cleanse daily",                    linkedCollectionSlug: "round-soap"   },
      { step: 2, label: "Rinse",      description: "Rinse with cool water to close pores",        linkedCollectionSlug: "round-soap"   },
      { step: 3, label: "Moisturize", description: "Apply body lotion immediately after drying",  linkedCollectionSlug: "body-lotion"  },
    ],
    relatedCollections: ["body-lotion", "bath-salt", "rock-soap"],
    faq: [
      { question: "Which round soap is best for acne-prone skin?",   answer: "Tea Tree & Peppermint is specifically formulated to control acne and keep skin fresh." },
      { question: "Is Honey & Oatmeal good for dry skin?",           answer: "Yes — honey is a natural humectant and oatmeal gently exfoliates without stripping moisture." },
      { question: "Can kids use these soaps?",                       answer: "The Milk & Rose and Peach & Mix Fruit variants are gentle enough for older children." },
    ],
    seoTitle: "Round Soap Collection | Daily Natural Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's round soap collection — 9 variants including Tea Tree, Honey Oatmeal, Multani Mitti, Lavender. Gentle daily cleansing for every skin type.",
    metaKeywords: ["round soap india", "tea tree soap", "honey oatmeal soap", "multani mitti soap", "natural daily soap"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 3,
  },

  {
    name: "Aissis Soap",
    slug: "aissis-soap",
    tagline: "Advanced skincare solutions in every bar",
    heroImage: "/collections/aissis-soap-hero.jpg",
    heroHeadline: "Advanced Skincare Solutions",
    heroSubheadline: "A refined range combining natural extracts with enhanced skincare benefits for visible results.",
    storyText: "The Aissis collection represents Nezal's most advanced soap range — nine distinct formulations, each pairing a signature botanical extract with enhanced skincare actives. From the antioxidant-rich Green Tea Scrub to the cooling Peppermint & Cucumber, every bar delivers a purposeful skincare experience.",
    keyIngredients: [
      { name: "Green Tea Extract",  benefit: "Antioxidant protection and skin defence"  },
      { name: "Sandalwood",         benefit: "Deep nourishment and radiance improvement" },
      { name: "Orange Peel",        benefit: "Natural exfoliation and brightening glow"  },
      { name: "Jasmine Extract",    benefit: "Soft hydration and floral freshness"       },
      { name: "Peppermint",         benefit: "Cooling freshness and oil balance"         },
    ],
    concerns: ["pigmentation", "oily-skin", "dryness", "dullness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Work into a lather and cleanse skin",        linkedCollectionSlug: "aissis-soap"  },
      { step: 2, label: "Rinse",      description: "Rinse thoroughly with water",                linkedCollectionSlug: "aissis-soap"  },
      { step: 3, label: "Nourish",    description: "Complete with body lotion for lasting glow", linkedCollectionSlug: "body-lotion"  },
    ],
    relatedCollections: ["premium-soap", "body-lotion", "round-soap"],
    faq: [
      { question: "Which Aissis variant is best for brightening?",  answer: "Orange Peel Scrub is formulated specifically for exfoliation and skin brightening." },
      { question: "Is Green Tea Scrub suitable for sensitive skin?", answer: "The scrub is gentle but we recommend patch testing for very sensitive skin types." },
      { question: "What makes Aissis different from Round Soap?",   answer: "Aissis uses more advanced active extracts and is formulated for targeted skincare results." },
    ],
    seoTitle: "Aissis Soap Collection | Advanced Natural Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's Aissis soap collection — 9 variants with Green Tea, Sandalwood, Orange Peel, Jasmine and more. Advanced botanical skincare in every bar.",
    metaKeywords: ["aissis soap", "advanced natural soap india", "green tea soap", "sandalwood soap", "exfoliating soap india"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 4,
  },

  {
    name: "Premium Soap",
    slug: "premium-soap",
    tagline: "Luxury bathing reimagined with active botanicals",
    heroImage: "/collections/premium-soap-hero.jpg",
    heroHeadline: "Elevated Skincare Experience",
    heroSubheadline: "Crafted for those who seek superior quality, rich textures and visible skincare results.",
    storyText: "Premium shouldn't just mean expensive — it should mean better. Nezal's Premium Soap collection uses superior concentrations of aloe vera, glycerine, coconut oil and shea butter alongside active botanical extracts. Each of the ten variants delivers a spa-level experience while actively improving your skin.",
    keyIngredients: [
      { name: "Shea Butter",    benefit: "Extra conditioning and deep nourishment"     },
      { name: "Papaya Extract", benefit: "Skin renewal and natural brightening"        },
      { name: "Charcoal",       benefit: "Detox cleansing and oil control"             },
      { name: "Saffron",        benefit: "Radiance and skin rejuvenation"              },
      { name: "Coconut Oil",    benefit: "Rich moisture and skin softening"            },
    ],
    concerns: ["pigmentation", "dullness", "acne", "dryness"],
    ritualSteps: [
      { step: 1, label: "Lather",     description: "Work into a rich lather on wet skin",        linkedCollectionSlug: "premium-soap"  },
      { step: 2, label: "Cleanse",    description: "Massage gently and rinse thoroughly",         linkedCollectionSlug: "premium-soap"  },
      { step: 3, label: "Moisturize", description: "Follow with body lotion to lock in softness", linkedCollectionSlug: "body-lotion"   },
    ],
    relatedCollections: ["body-lotion", "rock-soap", "bath-salt"],
    faq: [
      { question: "What makes Premium Soap superior to regular soap?",   answer: "Premium soaps use higher concentrations of shea butter, coconut oil and active botanical extracts for visible skincare results." },
      { question: "Which variant is best for pigmentation?",             answer: "Papaya Whitening and Saffron Sandalwood with Turmeric are specifically formulated for brightening and pigmentation." },
      { question: "Is Charcoal Lemon good for acne?",                   answer: "Yes — activated charcoal draws out impurities while lemon helps control oil and prevent breakouts." },
      { question: "Can I use premium soap daily?",                      answer: "All variants are formulated for daily use and are gentle enough for regular bathing." },
    ],
    seoTitle: "Premium Soap Collection | Luxury Natural Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's premium soap collection — Papaya Whitening, Charcoal Lemon, Saffron Sandalwood and more. Luxury botanical soaps with visible results.",
    metaKeywords: ["premium soap india", "papaya whitening soap", "charcoal soap", "saffron soap", "luxury herbal soap"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 5,
  },

  {
    name: "Doobie Soap",
    slug: "doobie-soap",
    tagline: "Pure natural cleansing for everyday skin",
    heroImage: "/collections/doobie-soap-hero.jpg",
    heroHeadline: "Clean, Soft & Comfortably Refreshed",
    heroSubheadline: "Designed for everyday skin care — gently cleanses while maintaining skin balance, softness and freshness.",
    storyText: "Doobie Bath Soap is Nezal's everyday essential — crafted with carefully selected grade one ingredients to remove impurities and daily buildup without disrupting your skin's natural balance. Four distinct variants, each with a unique character to match your mood and skin need.",
    keyIngredients: [
      { name: "Neem Extract",  benefit: "Purifying and antibacterial cleansing"   },
      { name: "Tulsi",         benefit: "Maintains clean and balanced skin"        },
      { name: "Sandalwood",    benefit: "Improves texture with lasting freshness"  },
      { name: "Rose Extract",  benefit: "Gentle soothing and subtle fragrance"     },
    ],
    concerns: ["acne", "oily-skin", "sensitive-skin", "dryness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Lather and cleanse skin daily",              linkedCollectionSlug: "doobie-soap"  },
      { step: 2, label: "Rinse",      description: "Rinse with cool water",                      linkedCollectionSlug: "doobie-soap"  },
      { step: 3, label: "Moisturize", description: "Apply body lotion to maintain skin softness", linkedCollectionSlug: "body-lotion" },
    ],
    relatedCollections: ["round-soap", "body-lotion", "hand-wash"],
    faq: [
      { question: "Which Doobie variant is best for acne?",         answer: "Neem & Tulsi is formulated with purifying botanicals that help maintain clear, balanced skin." },
      { question: "Is Doobie Soap suitable for daily use?",         answer: "Yes — all four variants are grade one formulations safe for everyday use." },
      { question: "What does Cincinnati White smell like?",         answer: "A refreshing fragrance blend designed to energize your mood and keep you feeling fresh all day." },
    ],
    seoTitle: "Doobie Soap Collection | Everyday Natural Bar Soaps by Nezal",
    seoDescription: "Shop Nezal's Doobie soap collection — Cincinnati White, French Rose, Rustic Sandal and Neem Tulsi. Grade one natural bar soaps for everyday cleansing.",
    metaKeywords: ["doobie soap", "neem tulsi soap", "everyday natural soap india", "herbal bath soap"],
    navCategory: "body-care",
    subCategory: "soaps",
    sortOrder: 6,
  },

  // ── BODY CARE ─────────────────────────────────────────────

  {
    name: "Body Lotion",
    slug: "body-lotion",
    tagline: "All-day hydration, nature's way",
    heroImage: "/collections/body-lotion-hero.jpg",
    heroHeadline: "Deep Hydration & Skin Radiance",
    heroSubheadline: "A carefully crafted formulation to keep your skin soft, nourished and deeply moisturised throughout the day.",
    storyText: "Skin that's truly nourished from the outside in — that's what Nezal Body Lotion delivers. Enriched with aloe vera, liquorice extract, shea butter and kojic acid, each variant improves skin texture while enhancing natural glow, hydration and smoothness.",
    keyIngredients: [
      { name: "Aloe Vera",         benefit: "Deep soothing hydration"                  },
      { name: "Shea Butter",       benefit: "Rich nourishment and lasting softness"     },
      { name: "Liquorice Extract", benefit: "Natural skin brightening and even tone"    },
      { name: "Kojic Acid",        benefit: "Reduces pigmentation and dark spots"       },
    ],
    concerns: ["dryness", "pigmentation", "dullness", "hydration"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Shower or bathe with your preferred soap",     linkedCollectionSlug: "rock-soap"    },
      { step: 2, label: "Pat Dry",    description: "Pat skin dry, leaving it slightly damp",        linkedCollectionSlug: "body-lotion"  },
      { step: 3, label: "Moisturize", description: "Apply lotion immediately to lock in moisture",  linkedCollectionSlug: "body-lotion"  },
    ],
    relatedCollections: ["rock-soap", "body-massage-oil", "aloe-vera-gel"],
    faq: [
      { question: "When is the best time to apply body lotion?",        answer: "Apply immediately after bathing while skin is still slightly damp — this locks in the most moisture." },
      { question: "Which variant is best for pigmentation?",            answer: "All variants contain liquorice extract and kojic acid, but Honey Cream gives the richest coverage for dry, pigmented skin." },
      { question: "Can I use body lotion on my face?",                 answer: "We recommend using our dedicated face serum and face wash for facial care." },
      { question: "Is the lotion non-greasy?",                         answer: "Yes — all three variants are formulated to absorb quickly without leaving a greasy residue." },
    ],
    seoTitle: "Herbal Body Lotion | Deep Moisturising Lotion by Nezal",
    seoDescription: "Shop Nezal's body lotion collection — Honey Cream, Caramel and Frangipani. Enriched with aloe vera, shea butter and kojic acid for glowing, soft skin.",
    metaKeywords: ["herbal body lotion india", "moisturising body lotion", "shea butter lotion", "kojic acid lotion", "natural body moisturiser"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 7,
  },

  {
    name: "Aloe Vera Gel",
    slug: "aloe-vera-gel",
    tagline: "Pure soothing hydration for skin and hair",
    heroImage: "/collections/aloe-vera-gel-hero.jpg",
    heroHeadline: "Soothing Hydration & Skin Refresh",
    heroSubheadline: "Pure and natural aloe vera gel — lightweight, without artificial colours, for skin and hair.",
    storyText: "Aloe vera has been nature's skincare secret for thousands of years. Nezal's Aloe Vera Gel uses pure, natural aloe extract without artificial colours to cool, refresh and nourish both skin and hair. Lightweight enough to layer under anything, powerful enough to use alone.",
    keyIngredients: [
      { name: "Pure Aloe Vera", benefit: "Cools, soothes and deeply hydrates skin and hair" },
      { name: "Natural Extracts", benefit: "Supports moisture balance and skin softness"    },
    ],
    concerns: ["dryness", "sensitive-skin", "hydration", "dullness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",  description: "Cleanse skin or hair before application",     linkedCollectionSlug: "foaming-face-wash" },
      { step: 2, label: "Apply",    description: "Apply gel generously to skin or hair",         linkedCollectionSlug: "aloe-vera-gel"     },
      { step: 3, label: "Layer",    description: "Use under serum or moisturizer for extra hydration", linkedCollectionSlug: "face-serum"   },
    ],
    relatedCollections: ["face-serum", "body-lotion", "foaming-face-wash"],
    faq: [
      { question: "Can I use aloe vera gel on my hair?",           answer: "Yes — it's formulated for both skin and hair use. Apply to scalp and hair for hydration and frizz control." },
      { question: "Can I use it as a moisturizer?",               answer: "Yes — it's lightweight enough to use alone as a moisturizer for oily or combination skin." },
      { question: "Is it suitable for sunburn?",                  answer: "Aloe vera is known for its cooling and soothing properties and works well on sun-exposed skin." },
      { question: "Does it contain artificial colours?",          answer: "No — Nezal Aloe Vera Gel is formulated without any artificial colours." },
    ],
    seoTitle: "Pure Aloe Vera Gel | Skin & Hair Hydration by Nezal",
    seoDescription: "Shop Nezal's pure aloe vera gel — no artificial colours, enriched with natural extracts. Lightweight soothing hydration for skin and hair daily use.",
    metaKeywords: ["aloe vera gel india", "pure aloe vera gel", "natural aloe gel skin hair", "herbal aloe vera"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 8,
  },

  {
    name: "Body Massage Oil",
    slug: "body-massage-oil",
    tagline: "Relaxation and skin nourishment in every drop",
    heroImage: "/collections/body-massage-oil-hero.jpg",
    heroHeadline: "Relaxation & Skin Nourishment",
    heroSubheadline: "A smooth nourishing formulation enriched with cedarwood essential oil for a deeply relaxing massage experience.",
    storyText: "Self-care is a ritual, not a luxury. Nezal Body Massage Oil is enriched with cedarwood essential oils that promote deep relaxation of stressed muscles while leaving skin soft, supple and well-nourished. A moment of calm that your body deserves every day.",
    keyIngredients: [
      { name: "Cedarwood Essential Oil", benefit: "Promotes relaxation and calms stressed muscles" },
      { name: "Carrier Oils",            benefit: "Leaves skin soft, supple and nourished"         },
    ],
    concerns: ["dryness", "stress-relief", "body-care"],
    ritualSteps: [
      { step: 1, label: "Warm",    description: "Warm the oil slightly between palms",           linkedCollectionSlug: "body-massage-oil" },
      { step: 2, label: "Massage", description: "Apply with firm circular strokes on muscles",   linkedCollectionSlug: "body-massage-oil" },
      { step: 3, label: "Rest",    description: "Allow 15–20 minutes for full absorption",       linkedCollectionSlug: "body-massage-oil" },
    ],
    relatedCollections: ["body-lotion", "bath-salt", "aloe-vera-gel"],
    faq: [
      { question: "Can I use massage oil daily?",               answer: "Yes — it's formulated for regular use as part of a self-care ritual." },
      { question: "Is it suitable for all skin types?",         answer: "Yes — the cedarwood oil blend is balanced to work across all skin types." },
      { question: "Can it be used for hair massage too?",       answer: "It's formulated primarily for body use. For hair, we recommend our hair serum." },
    ],
    seoTitle: "Body Massage Oil | Cedarwood Relaxation Oil by Nezal",
    seoDescription: "Shop Nezal's body massage oil — enriched with cedarwood essential oils for deep relaxation and skin nourishment. Ideal for daily self-care rituals.",
    metaKeywords: ["body massage oil india", "cedarwood massage oil", "relaxation oil", "natural massage oil", "herbal body oil"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 9,
  },

  {
    name: "Shower Gel",
    slug: "shower-gel",
    tagline: "Your daily cleanse, elevated",
    heroImage: "/collections/shower-gel-hero.jpg",
    heroHeadline: "Deep Cleansing with Lasting Hydration",
    heroSubheadline: "Enriched with aloe vera and natural oils — refreshing, energising and conditioning with every wash.",
    storyText: "A great shower gel doesn't just clean — it conditions, energises and leaves you feeling genuinely refreshed. Nezal's Herbal Shower Gel is enriched with aloe vera, natural oils and allantoin for skin that's not just clean, but genuinely soft and conditioned post-wash.",
    keyIngredients: [
      { name: "Aloe Vera",   benefit: "Conditions and soothes skin post-wash"      },
      { name: "Allantoin",   benefit: "Skin conditioning and smoothing after each wash" },
      { name: "Natural Oils",benefit: "Moisturises and nourishes during cleansing"  },
    ],
    concerns: ["dryness", "dullness", "body-care"],
    ritualSteps: [
      { step: 1, label: "Apply",   description: "Apply to wet skin and lather",             linkedCollectionSlug: "shower-gel"   },
      { step: 2, label: "Cleanse", description: "Massage in circular motions, rinse well",   linkedCollectionSlug: "shower-gel"   },
      { step: 3, label: "Nourish", description: "Follow with body lotion for lasting moisture", linkedCollectionSlug: "body-lotion" },
    ],
    relatedCollections: ["body-lotion", "bath-salt", "hand-wash"],
    faq: [
      { question: "Which shower gel variant is best for energy?",    answer: "Coffee Beans is specifically formulated with an energising coffee scent to revitalise your senses." },
      { question: "Is shower gel better than bar soap?",            answer: "Shower gel is generally more hydrating — the allantoin and aloe vera condition skin during washing." },
      { question: "Can I use shower gel daily?",                    answer: "Yes — all three variants are designed for daily use and are gentle on skin." },
    ],
    seoTitle: "Herbal Shower Gel | Coffee, Seafresh, Orange Fresh by Nezal",
    seoDescription: "Shop Nezal's herbal shower gel — Coffee Beans, Seafresh, Orange Fresh. Enriched with aloe vera and allantoin for deep cleansing with lasting hydration.",
    metaKeywords: ["herbal shower gel india", "coffee shower gel", "natural body wash", "aloe vera shower gel", "moisturising shower gel"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 10,
  },

  {
    name: "Bath Salt",
    slug: "bath-salt",
    tagline: "Turn your bath into a ritual",
    heroImage: "/collections/bath-salt-hero.jpg",
    heroHeadline: "Relax · Detox · Rejuvenate",
    heroSubheadline: "A luxurious blend of Himalayan salts and essential oils that relieves stress and detoxifies skin.",
    storyText: "A bath salt ritual is more than just bathing — it's a moment of complete restoration. Nezal Bath Salts blend pure Himalayan salts with essential oils to draw out toxins, soothe tired muscles and leave skin soft and rejuvenated. Three variants to match your mood.",
    keyIngredients: [
      { name: "Himalayan Salt",    benefit: "Detoxifies and draws out skin impurities"  },
      { name: "Lavender Oil",      benefit: "Calming relaxation and stress relief"       },
      { name: "Rose Extract",      benefit: "Floral freshness and skin rejuvenation"     },
      { name: "Essential Oils",    benefit: "Aromatherapy and deep muscle relaxation"    },
    ],
    concerns: ["dryness", "stress-relief", "body-care"],
    ritualSteps: [
      { step: 1, label: "Dissolve", description: "Add a handful of bath salts to warm bathwater",  linkedCollectionSlug: "bath-salt"    },
      { step: 2, label: "Soak",     description: "Soak for 15–20 minutes for best results",         linkedCollectionSlug: "bath-salt"    },
      { step: 3, label: "Moisturize", description: "Apply body lotion immediately after drying",    linkedCollectionSlug: "body-lotion"  },
    ],
    relatedCollections: ["body-lotion", "body-massage-oil", "rock-soap"],
    faq: [
      { question: "How much bath salt should I use per bath?",      answer: "A generous handful (around 100g) dissolved in a full bathtub is ideal for best results." },
      { question: "Can I use bath salts daily?",                   answer: "2–3 times per week is ideal. Daily use may over-dry skin — always follow with body lotion." },
      { question: "Which variant is best for sleep?",              answer: "Lavender is formulated with calming aromatherapy specifically to promote relaxation and better sleep." },
    ],
    seoTitle: "Bath Salt Collection | Himalayan Salt Soak by Nezal",
    seoDescription: "Shop Nezal's bath salt collection — Lavender, Rose and Seafresh. Pure Himalayan salts with essential oils for stress relief, detox and skin rejuvenation.",
    metaKeywords: ["bath salt india", "himalayan bath salt", "lavender bath salt", "detox bath soak", "natural bath salt india"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 11,
  },

  {
    name: "Hand Wash",
    slug: "hand-wash",
    tagline: "Clean, protect and care for your hands",
    heroImage: "/collections/hand-wash-hero.jpg",
    heroHeadline: "Clean · Protect · Care",
    heroSubheadline: "Infused with tulsi extract for natural disinfection — gentle on skin, tough on germs.",
    storyText: "Your hands deserve more than just clean — they deserve care. Nezal Herbal Hand Wash uses tulsi extract, a natural disinfectant used in Ayurvedic tradition, alongside gentle fruit extracts to cleanse effectively while keeping hands soft and cared for.",
    keyIngredients: [
      { name: "Tulsi Extract",   benefit: "Natural disinfection and antibacterial care" },
      { name: "Orange Extract",  benefit: "Refreshing citrus cleanse and freshness"      },
      { name: "Peach Extract",   benefit: "Gentle cleansing and skin softness"           },
      { name: "Green Apple",     benefit: "Crisp freshness and revitalizing care"        },
    ],
    concerns: ["sensitive-skin", "dryness", "body-care"],
    ritualSteps: [
      { step: 1, label: "Pump",   description: "Pump 1–2 times onto wet hands",          linkedCollectionSlug: "hand-wash" },
      { step: 2, label: "Lather", description: "Lather for at least 20 seconds",          linkedCollectionSlug: "hand-wash" },
      { step: 3, label: "Rinse",  description: "Rinse thoroughly with clean water",        linkedCollectionSlug: "hand-wash" },
    ],
    relatedCollections: ["shower-gel", "body-lotion", "doobie-soap"],
    faq: [
      { question: "Is the hand wash antibacterial?",             answer: "Yes — infused with tulsi extract, a natural antibacterial known for its disinfecting properties." },
      { question: "Which variant is gentlest for dry hands?",   answer: "Peach is formulated for gentle cleansing and skin softness, ideal for dry or sensitive hands." },
      { question: "Can children use this hand wash?",           answer: "Yes — all variants are gentle enough for older children with regular hand washing." },
    ],
    seoTitle: "Herbal Hand Wash | Tulsi Extract Natural Hand Cleanser by Nezal",
    seoDescription: "Shop Nezal's herbal hand wash — Orange, Lime, Peach and Green Apple. Infused with tulsi extract for natural disinfection and gentle daily hand care.",
    metaKeywords: ["herbal hand wash india", "tulsi hand wash", "natural hand wash", "antibacterial hand wash india", "gentle hand wash"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 12,
  },

  {
    name: "Intimate Wash",
    slug: "intimate-wash",
    tagline: "Gentle care and daily freshness",
    heroImage: "/collections/intimate-wash-hero.jpg",
    heroHeadline: "Gentle Care & Daily Freshness",
    heroSubheadline: "A mild, carefully balanced formulation for gentle cleansing and everyday intimate hygiene.",
    storyText: "Intimate hygiene deserves the most carefully considered formulation. Nezal's Intimate Wash uses tea tree extract, aloe vera and lactic acid — a combination that gently cleanses while maintaining the natural pH balance essential for intimate health.",
    keyIngredients: [
      { name: "Tea Tree Extract", benefit: "Natural antiseptic and antibacterial care" },
      { name: "Aloe Vera",        benefit: "Soothing and gentle hydration"             },
      { name: "Lactic Acid",      benefit: "Maintains natural pH balance"              },
    ],
    concerns: ["sensitive-skin", "body-care"],
    ritualSteps: [
      { step: 1, label: "Apply",  description: "Apply a small amount to the intimate area",    linkedCollectionSlug: "intimate-wash" },
      { step: 2, label: "Cleanse",description: "Gently cleanse and rinse thoroughly with water", linkedCollectionSlug: "intimate-wash" },
      { step: 3, label: "Dry",    description: "Pat gently dry — avoid harsh rubbing",           linkedCollectionSlug: "intimate-wash" },
    ],
    relatedCollections: ["hand-wash", "shower-gel", "aloe-vera-gel"],
    faq: [
      { question: "Is it safe for daily use?",                    answer: "Yes — it's specifically formulated for gentle everyday use and pH balance maintenance." },
      { question: "Is it suitable for both men and women?",       answer: "Yes — the unisex formulation is suitable for all adults." },
      { question: "Does it contain harsh chemicals?",            answer: "No — it's free from harsh ingredients and uses natural antiseptic tea tree extract." },
    ],
    seoTitle: "Intimate Wash | Natural pH-Balanced Intimate Hygiene by Nezal",
    seoDescription: "Shop Nezal's intimate wash — enriched with tea tree extract, aloe vera and lactic acid. Gentle, pH-balanced daily intimate hygiene for men and women.",
    metaKeywords: ["intimate wash india", "natural intimate hygiene", "pH balanced intimate wash", "tea tree intimate wash", "gentle intimate cleanser"],
    navCategory: "body-care",
    subCategory: "body-care",
    sortOrder: 13,
  },

  // ── HAIR CARE ─────────────────────────────────────────────

  {
    name: "Shampoo",
    slug: "shampoo",
    tagline: "Cleanse your scalp, nourish your roots",
    heroImage: "/collections/shampoo-hero.jpg",
    heroHeadline: "Strong, Healthy & Nourished Hair",
    heroSubheadline: "Reduces hair fall, controls dandruff, strengthens roots and is gentle on your scalp.",
    storyText: "The foundation of great hair is a healthy scalp. Nezal's Herbal Shampoo collection draws from Ayurvedic wisdom — neem, tulsi, amla, shikakai — to deeply cleanse your scalp while nourishing and strengthening hair from root to tip. Three targeted variants for different hair concerns.",
    keyIngredients: [
      { name: "Neem & Tulsi",       benefit: "Scalp cleansing and dandruff control"      },
      { name: "Amla",               benefit: "Hair strengthening and nourishment"         },
      { name: "Shikakai",           benefit: "Natural cleansing and hair conditioning"    },
      { name: "Black Pepper",       benefit: "Scalp stimulation and revitalization"       },
    ],
    concerns: ["hairfall", "dandruff", "dryness", "frizz"],
    ritualSteps: [
      { step: 1, label: "Shampoo",     description: "Apply to wet hair, lather and massage scalp",   linkedCollectionSlug: "shampoo"     },
      { step: 2, label: "Condition",   description: "Follow with conditioner for smooth, soft hair",  linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",       description: "Apply hair serum on damp hair before styling",   linkedCollectionSlug: "hair-serum"  },
    ],
    relatedCollections: ["conditioner", "hair-serum"],
    faq: [
      { question: "Which shampoo is best for dandruff?",          answer: "Neem & Tulsi is specifically formulated to cleanse the scalp and control dandruff effectively." },
      { question: "How often should I shampoo?",                  answer: "2–3 times per week is ideal. Daily shampooing can strip natural scalp oils." },
      { question: "Is the shampoo sulphate-free?",               answer: "Our herbal shampoos use gentle cleansing agents — check product packaging for full ingredient details." },
      { question: "Which variant helps with hair fall?",          answer: "Amla & Shikakai is formulated for hair strengthening and reducing fall with regular use." },
    ],
    seoTitle: "Herbal Shampoo | Neem Tulsi, Amla Shikakai by Nezal",
    seoDescription: "Shop Nezal's herbal shampoo collection — Neem Tulsi, Amla Shikakai, Black Pepper Cucumber. Reduces hair fall, controls dandruff and strengthens roots.",
    metaKeywords: ["herbal shampoo india", "neem tulsi shampoo", "amla shikakai shampoo", "anti dandruff shampoo", "hair fall shampoo india"],
    navCategory: "hair-care",
    subCategory: "hair-care",
    sortOrder: 1,
  },

  {
    name: "Conditioner",
    slug: "conditioner",
    tagline: "Frizz-free, silky, nourished hair",
    heroImage: "/collections/conditioner-hero.jpg",
    heroHeadline: "Smooth, Shiny & Manageable Hair",
    heroSubheadline: "Deep nourishment with natural seaweed extract — strengthens hair, enhances shine and improves texture.",
    storyText: "A good conditioner completes what shampoo starts. Nezal's Herbal Conditioner uses natural seaweed extract alongside nourishing botanicals to deeply condition, strengthen and add shine to hair. The result: hair that's manageable, frizz-free and genuinely healthy-looking.",
    keyIngredients: [
      { name: "Natural Seaweed Extract", benefit: "Deep nourishment and hair strengthening" },
      { name: "Botanical Oils",          benefit: "Enhances shine and improves hair texture" },
    ],
    concerns: ["frizz", "dryness", "hairfall", "dullness"],
    ritualSteps: [
      { step: 1, label: "Shampoo",    description: "Start with Nezal herbal shampoo",              linkedCollectionSlug: "shampoo"     },
      { step: 2, label: "Condition",  description: "Apply conditioner mid-length to ends, wait 2 mins", linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",      description: "Finish with hair serum on damp hair",           linkedCollectionSlug: "hair-serum"  },
    ],
    relatedCollections: ["shampoo", "hair-serum"],
    faq: [
      { question: "Should I apply conditioner to the roots?",     answer: "Apply mid-length to ends only — avoid the scalp to prevent buildup and greasiness." },
      { question: "How long should I leave the conditioner in?",  answer: "2–3 minutes is sufficient. For a deeper treatment, leave for up to 5 minutes." },
      { question: "Can I use conditioner without shampoo?",       answer: "Yes — conditioner-only washing (co-washing) works well for very dry or curly hair types." },
    ],
    seoTitle: "Herbal Conditioner | Deep Nourishment & Shine by Nezal",
    seoDescription: "Shop Nezal's herbal conditioner — enriched with natural seaweed extract for deep nourishment, frizz control, enhanced shine and manageable hair.",
    metaKeywords: ["herbal conditioner india", "natural hair conditioner", "seaweed conditioner", "frizz control conditioner", "nourishing conditioner india"],
    navCategory: "hair-care",
    subCategory: "hair-care",
    sortOrder: 2,
  },

  {
    name: "Hair Serum",
    slug: "hair-serum",
    tagline: "From root to tip — strength and growth",
    heroImage: "/collections/hair-serum-hero.jpg",
    heroHeadline: "Strength, Care & Hair Vitality",
    heroSubheadline: "Advanced actives — Redensyl and Anagain — designed to support stronger, healthier-looking hair from root to tip.",
    storyText: "Hair serum is where modern hair science meets botanical tradition. Nezal's Hair Serum is enriched with Redensyl and Anagain — two advanced actives that support hair density, reduce the appearance of hair fall and strengthen hair from within the follicle.",
    keyIngredients: [
      { name: "Redensyl",  benefit: "Supports hair density and reduces hair fall"    },
      { name: "Anagain",   benefit: "Promotes the natural hair growth cycle"         },
      { name: "Biotin",    benefit: "Strengthens hair from inside each follicle"     },
    ],
    concerns: ["hairfall", "thinning-hair", "dryness", "frizz"],
    ritualSteps: [
      { step: 1, label: "Shampoo",    description: "Cleanse with Nezal herbal shampoo",             linkedCollectionSlug: "shampoo"     },
      { step: 2, label: "Condition",  description: "Condition for softness and frizz control",       linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",      description: "Apply serum on damp hair, do not rinse",         linkedCollectionSlug: "hair-serum"  },
    ],
    relatedCollections: ["shampoo", "conditioner"],
    faq: [
      { question: "Do I rinse the hair serum out?",              answer: "No — apply to damp hair and leave in. Do not rinse." },
      { question: "How long before I see results?",              answer: "Most users notice reduced hair fall in 4–6 weeks. Fuller-looking hair typically takes 8–12 weeks." },
      { question: "Can I use it daily?",                        answer: "Yes — apply daily on damp or dry hair for best results." },
      { question: "What are Redensyl and Anagain?",             answer: "These are advanced hair care actives that work at the follicle level to support the natural hair growth cycle and improve density." },
    ],
    seoTitle: "Herbal Hair Serum | Redensyl & Anagain Hair Growth Serum by Nezal",
    seoDescription: "Shop Nezal's hair serum — enriched with Redensyl and Anagain for stronger, fuller-looking hair. Reduces hair fall and supports natural hair growth.",
    metaKeywords: ["hair serum india", "redensyl hair serum", "hair growth serum", "anti hair fall serum", "natural hair serum india"],
    navCategory: "hair-care",
    subCategory: "hair-care",
    sortOrder: 3,
  },

]

// ══════════════════════════════════════════════════════════
//  PRODUCTS DATA — one document per variant
// ══════════════════════════════════════════════════════════

const productsData = [

  // ── Foaming Face Wash ──────────────────────────────────
  {
    name: "Vitamin C Foaming Face Wash",
    slug: "vitamin-c-foaming-face-wash",
    price: 299, discountPrice: 249,
    collectionSlug: "foaming-face-wash",
    variantLabel: "Vitamin C",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [
      { name: "Vitamin C",  benefit: "Brightens and evens skin tone"         },
      { name: "Aloe Vera",  benefit: "Soothes and hydrates post-cleanse"     },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Apple Cider Vinegar Foaming Face Wash",
    slug: "apple-cider-vinegar-foaming-face-wash",
    price: 299, discountPrice: 249,
    collectionSlug: "foaming-face-wash",
    variantLabel: "Apple Cider Vinegar",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin", "open-pores"],
    keyIngredients: [
      { name: "Apple Cider Vinegar", benefit: "Balances pH and keeps pores clear"  },
      { name: "Aloe Vera",           benefit: "Soothes and hydrates post-cleanse"  },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },

  // ── Face Serum ─────────────────────────────────────────
  {
    name: "Tea Tree & Salicylic Acid Face Serum",
    slug: "tea-tree-salicylic-acid-face-serum",
    price: 499, discountPrice: 399,
    collectionSlug: "face-serum",
    variantLabel: "Tea Tree + Salicylic Acid",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin", "open-pores"],
    keyIngredients: [
      { name: "Tea Tree Oil",   benefit: "Controls excess sebum naturally"    },
      { name: "Salicylic Acid", benefit: "Unclogs pores and clears breakouts" },
    ],
    ritualStep: "treat",
    stock: 100,
  },
  {
    name: "Vitamin C & Niacinamide Face Serum",
    slug: "vitamin-c-niacinamide-face-serum",
    price: 499, discountPrice: 399,
    collectionSlug: "face-serum",
    variantLabel: "Vitamin C + Niacinamide",
    skinTypes: ["dull", "normal", "combination"],
    concerns: ["pigmentation", "dullness", "open-pores"],
    keyIngredients: [
      { name: "Vitamin C",   benefit: "Brightens and evens skin tone"            },
      { name: "Niacinamide", benefit: "Minimises pores and reduces pigmentation" },
    ],
    ritualStep: "treat",
    stock: 100,
  },
  {
    name: "Hyaluronic Acid & Niacinamide Face Serum",
    slug: "hyaluronic-acid-niacinamide-face-serum",
    price: 499, discountPrice: 399,
    collectionSlug: "face-serum",
    variantLabel: "Hyaluronic Acid + Niacinamide",
    skinTypes: ["dry", "dehydrated", "normal"],
    concerns: ["dehydration", "dullness", "open-pores"],
    keyIngredients: [
      { name: "Hyaluronic Acid", benefit: "Locks in deep, long-lasting hydration"   },
      { name: "Niacinamide",     benefit: "Smooths skin texture and minimises pores" },
    ],
    ritualStep: "treat",
    stock: 100,
  },

  // ── Rock Soap ─────────────────────────────────────────
  {
    name: "Peppermint & Cucumber Rock Soap",
    slug: "peppermint-cucumber-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Peppermint & Cucumber",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin"],
    keyIngredients: [
      { name: "Peppermint", benefit: "Cooling and oil control"      },
      { name: "Cucumber",   benefit: "Soothes irritated skin"       },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Jasmine Rock Soap",
    slug: "jasmine-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Jasmine",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness"],
    keyIngredients: [
      { name: "Jasmine Extract", benefit: "Hydrates, softens and refreshes skin" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Strawberry Rock Soap",
    slug: "strawberry-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Strawberry",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness", "pigmentation"],
    keyIngredients: [
      { name: "Strawberry Extract", benefit: "Antioxidant-rich, improves skin texture and glow" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Rose Rock Soap",
    slug: "rose-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Rose",
    skinTypes: ["sensitive", "dry", "normal"],
    concerns: ["sensitive-skin", "dryness"],
    keyIngredients: [
      { name: "Rose Extract", benefit: "Gentle soothing care for sensitive skin" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Sandalwood Rock Soap",
    slug: "sandalwood-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Sandalwood",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [
      { name: "Sandalwood", benefit: "Rejuvenates skin and improves texture and radiance" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Lavender Rock Soap",
    slug: "lavender-rock-soap",
    price: 199, discountPrice: 169,
    collectionSlug: "rock-soap",
    variantLabel: "Lavender",
    skinTypes: ["all", "sensitive", "normal"],
    concerns: ["sensitive-skin", "stress-relief"],
    keyIngredients: [
      { name: "Lavender Oil", benefit: "Calming blend that relaxes senses and restores skin balance" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },

  // ── Designer Soap ─────────────────────────────────────
  {
    name: "Lemon Designer Soap",
    slug: "lemon-designer-soap",
    price: 179, discountPrice: 149,
    collectionSlug: "designer-soap",
    variantLabel: "Lemon",
    skinTypes: ["oily", "dull", "all"],
    concerns: ["pigmentation", "dullness", "oily-skin"],
    keyIngredients: [
      { name: "Lemon Extract", benefit: "Deep cleansing with refreshing brightening effect" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Orange Designer Soap",
    slug: "orange-designer-soap",
    price: 179, discountPrice: 149,
    collectionSlug: "designer-soap",
    variantLabel: "Orange",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [
      { name: "Orange Extract", benefit: "Energizes and tones skin" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },
  {
    name: "Watermelon Designer Soap",
    slug: "watermelon-designer-soap",
    price: 179, discountPrice: 149,
    collectionSlug: "designer-soap",
    variantLabel: "Watermelon",
    skinTypes: ["all", "dry", "sun-exposed"],
    concerns: ["dryness", "hydration"],
    keyIngredients: [
      { name: "Watermelon Extract", benefit: "Hydrates and cools sun-exposed skin" },
    ],
    ritualStep: "cleanse",
    stock: 100,
  },

  // ── Round Soap ────────────────────────────────────────
  {
    name: "Peach & Mix Fruit Round Soap",
    slug: "peach-mix-fruit-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Peach & Mix Fruit",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness"],
    keyIngredients: [{ name: "Peach & Fruit Extracts", benefit: "Nourishing and skin-softening" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Lavender & Geranium Round Soap",
    slug: "lavender-geranium-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Lavender & Geranium",
    skinTypes: ["all", "sensitive", "normal"],
    concerns: ["stress-relief", "sensitive-skin"],
    keyIngredients: [{ name: "Lavender & Geranium", benefit: "Stress-relieving and calming aromatherapy" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Multani Mitti Round Soap",
    slug: "multani-mitti-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Multani Mitti",
    skinTypes: ["oily", "combination", "acne-prone"],
    concerns: ["oily-skin", "open-pores", "acne"],
    keyIngredients: [{ name: "Multani Mitti", benefit: "Oil control and deep pore cleansing" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Honey & Oatmeal Round Soap",
    slug: "honey-oatmeal-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Honey & Oatmeal",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "sensitive-skin"],
    keyIngredients: [
      { name: "Honey",   benefit: "Natural humectant for deep hydration" },
      { name: "Oatmeal", benefit: "Gentle exfoliation and soothing"      },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Tea Tree & Peppermint Round Soap",
    slug: "tea-tree-peppermint-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Tea Tree & Peppermint",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin"],
    keyIngredients: [
      { name: "Tea Tree Oil", benefit: "Acne control and antibacterial care" },
      { name: "Peppermint",   benefit: "Cooling freshness and oil balance"   },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Orange & Bergamot Round Soap",
    slug: "orange-bergamot-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Orange & Bergamot",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Orange & Bergamot", benefit: "Revitalizing glow and citrus freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Milk & Rose Round Soap",
    slug: "milk-rose-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Milk & Rose",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "sensitive-skin"],
    keyIngredients: [
      { name: "Milk Protein", benefit: "Softness and gentle nourishment" },
      { name: "Rose Extract", benefit: "Gentle hydration"               },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Apple Blossoms Round Soap",
    slug: "apple-blossoms-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Apple Blossoms",
    skinTypes: ["all", "normal"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Apple Blossom Extract", benefit: "Skin freshness and toning properties" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Tropical Island Round Soap",
    slug: "tropical-island-round-soap",
    price: 149, discountPrice: 129,
    collectionSlug: "round-soap",
    variantLabel: "Tropical Island",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [{ name: "Essential Oil Blend", benefit: "Long-lasting refreshing fragrance" }],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Aissis Soap ───────────────────────────────────────
  {
    name: "Rose Aissis Soap",
    slug: "rose-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Rose",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "sensitive-skin"],
    keyIngredients: [{ name: "Rose Extract", benefit: "Gentle hydration and soothing care" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Green Apple Aissis Soap",
    slug: "green-apple-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Green Apple",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Green Apple Extract", benefit: "Skin revitalization and freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Sandalwood & Almond Aissis Soap",
    slug: "sandalwood-almond-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Sandalwood & Almond",
    skinTypes: ["dry", "normal", "all"],
    concerns: ["dryness"],
    keyIngredients: [
      { name: "Sandalwood", benefit: "Deep nourishment and radiance" },
      { name: "Almond Oil", benefit: "Rich moisture and skin softening" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Green Tea Scrub Aissis Soap",
    slug: "green-tea-scrub-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Green Tea Scrub",
    skinTypes: ["all", "oily", "combination"],
    concerns: ["dullness", "oily-skin"],
    keyIngredients: [{ name: "Green Tea Extract", benefit: "Antioxidant protection and exfoliation" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Orange Peel Scrub Aissis Soap",
    slug: "orange-peel-scrub-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Orange Peel Scrub",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [{ name: "Orange Peel", benefit: "Natural exfoliation and brightening glow" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Seafresh Aissis Soap",
    slug: "seafresh-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Seafresh",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [{ name: "Sea Extracts", benefit: "Refreshing cleanse and long-lasting freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Tropical Aissis Soap",
    slug: "tropical-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Tropical",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness"],
    keyIngredients: [{ name: "Tropical Extracts", benefit: "Exotic nourishment and skin revitalization" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Jasmine Aissis Soap",
    slug: "jasmine-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Jasmine",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness"],
    keyIngredients: [{ name: "Jasmine Extract", benefit: "Soft hydration and floral freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Peppermint & Cucumber Aissis Soap",
    slug: "peppermint-cucumber-aissis-soap",
    price: 189, discountPrice: 159,
    collectionSlug: "aissis-soap",
    variantLabel: "Peppermint & Cucumber",
    skinTypes: ["oily", "combination", "acne-prone"],
    concerns: ["oily-skin", "acne"],
    keyIngredients: [
      { name: "Peppermint", benefit: "Cooling freshness and oil balance" },
      { name: "Cucumber",   benefit: "Soothes and calms skin"            },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Premium Soap ──────────────────────────────────────
  {
    name: "Papaya Whitening Premium Soap",
    slug: "papaya-whitening-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Papaya Whitening",
    skinTypes: ["all", "dull", "pigmented"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [{ name: "Papaya Extract", benefit: "Skin renewal and natural brightening" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Black Grapes Premium Soap",
    slug: "black-grapes-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Black Grapes",
    skinTypes: ["all", "mature", "dull"],
    concerns: ["dullness", "pigmentation"],
    keyIngredients: [{ name: "Black Grape Extract", benefit: "Anti-aging and skin repair" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Pineapple Aqua Premium Soap",
    slug: "pineapple-aqua-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Pineapple Aqua",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["hydration", "dullness"],
    keyIngredients: [
      { name: "Pineapple Extract", benefit: "Vitamin C boost and skin brightening" },
      { name: "Aqua Base",         benefit: "Deep hydration and freshness"          },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Lemon Grass Peppermint Premium Soap",
    slug: "lemon-grass-peppermint-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Lemon Grass, Lemon & Peppermint",
    skinTypes: ["oily", "combination", "all"],
    concerns: ["oily-skin", "acne"],
    keyIngredients: [
      { name: "Lemon Grass", benefit: "Deep cleansing and skin purifying" },
      { name: "Peppermint",  benefit: "Cooling freshness and oil control" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Strawberry & Mulberry Premium Soap",
    slug: "strawberry-mulberry-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Strawberry & Mulberry",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [
      { name: "Strawberry Extract", benefit: "Antioxidant brightening"       },
      { name: "Mulberry Extract",   benefit: "Natural skin tone improvement" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Chocolate Vanilla Premium Soap",
    slug: "chocolate-vanilla-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Chocolate Vanilla",
    skinTypes: ["dry", "normal", "all"],
    concerns: ["dryness"],
    keyIngredients: [{ name: "Cocoa & Vanilla", benefit: "Deep nourishment and skin softness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Rose Aqua Moisturising Premium Soap",
    slug: "rose-aqua-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Rose Aqua Moisturising",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "hydration"],
    keyIngredients: [{ name: "Rose Aqua", benefit: "Intense hydration and skin freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Saffron Sandalwood & Turmeric Premium Soap",
    slug: "saffron-sandalwood-turmeric-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Saffron Sandalwood with Turmeric",
    skinTypes: ["all", "dull", "pigmented"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [
      { name: "Saffron",   benefit: "Radiance and skin rejuvenation"   },
      { name: "Turmeric",  benefit: "Brightening and even skin tone"    },
      { name: "Sandalwood",benefit: "Deep nourishment and skin texture" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Charcoal Lemon Premium Soap",
    slug: "charcoal-lemon-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Charcoal Lemon",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin", "open-pores"],
    keyIngredients: [
      { name: "Activated Charcoal", benefit: "Detox cleansing and oil control"    },
      { name: "Lemon Extract",      benefit: "Anti-acne and skin brightening"     },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Coconut Milk Honey Premium Soap",
    slug: "coconut-milk-honey-premium-soap",
    price: 249, discountPrice: 199,
    collectionSlug: "premium-soap",
    variantLabel: "Coconut Milk Honey",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "sensitive-skin"],
    keyIngredients: [
      { name: "Coconut Milk", benefit: "Moisture nourishment and smooth skin" },
      { name: "Honey",        benefit: "Natural humectant for lasting softness" },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Doobie Soap ───────────────────────────────────────
  {
    name: "Cincinnati White Doobie Soap",
    slug: "cincinnati-white-doobie-soap",
    price: 129, discountPrice: 109,
    collectionSlug: "doobie-soap",
    variantLabel: "Cincinnati White",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [{ name: "Fragrance Blend", benefit: "Refreshing mood-enhancing freshness all day" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "French Rose Doobie Soap",
    slug: "french-rose-doobie-soap",
    price: 129, discountPrice: 109,
    collectionSlug: "doobie-soap",
    variantLabel: "French Rose",
    skinTypes: ["sensitive", "dry", "normal"],
    concerns: ["sensitive-skin", "dryness"],
    keyIngredients: [{ name: "Rose Blend", benefit: "Gently soothes senses and leaves skin soft" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Rustic Sandal Doobie Soap",
    slug: "rustic-sandal-doobie-soap",
    price: 129, discountPrice: 109,
    collectionSlug: "doobie-soap",
    variantLabel: "Rustic Sandal",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Sandalwood", benefit: "Improves skin texture with long-lasting freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Neem & Tulsi Doobie Soap",
    slug: "neem-tulsi-doobie-soap",
    price: 129, discountPrice: 109,
    collectionSlug: "doobie-soap",
    variantLabel: "Neem & Tulsi",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin"],
    keyIngredients: [
      { name: "Neem Extract", benefit: "Purifying and antibacterial cleansing"  },
      { name: "Tulsi",        benefit: "Maintains clean and balanced skin"       },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Body Lotion ───────────────────────────────────────
  {
    name: "Honey Cream Body Lotion",
    slug: "honey-cream-body-lotion",
    price: 349, discountPrice: 299,
    collectionSlug: "body-lotion",
    variantLabel: "Honey Cream",
    skinTypes: ["dry", "normal", "all"],
    concerns: ["dryness", "hydration"],
    keyIngredients: [
      { name: "Honey",       benefit: "Rich moisturization and lasting skin softness" },
      { name: "Shea Butter", benefit: "Deep nourishment and conditioning"             },
    ],
    ritualStep: "moisturize", stock: 100,
  },
  {
    name: "Caramel Body Lotion",
    slug: "caramel-body-lotion",
    price: 349, discountPrice: 299,
    collectionSlug: "body-lotion",
    variantLabel: "Caramel",
    skinTypes: ["dry", "normal", "all"],
    concerns: ["dryness", "hydration"],
    keyIngredients: [
      { name: "Caramel Extract", benefit: "Deep nourishment and silky smooth hydration" },
      { name: "Aloe Vera",       benefit: "Soothing moisture balance"                   },
    ],
    ritualStep: "moisturize", stock: 100,
  },
  {
    name: "Frangipani Body Lotion",
    slug: "frangipani-body-lotion",
    price: 349, discountPrice: 299,
    collectionSlug: "body-lotion",
    variantLabel: "Frangipani",
    skinTypes: ["all", "normal", "dull"],
    concerns: ["dullness", "hydration"],
    keyIngredients: [
      { name: "Frangipani Extract", benefit: "Exotic floral hydration and radiant skin glow" },
      { name: "Kojic Acid",         benefit: "Natural brightening and even skin tone"         },
    ],
    ritualStep: "moisturize", stock: 100,
  },

  // ── Aloe Vera Gel ─────────────────────────────────────
  {
    name: "Pure Aloe Vera Gel",
    slug: "pure-aloe-vera-gel",
    price: 249, discountPrice: 199,
    collectionSlug: "aloe-vera-gel",
    variantLabel: "Pure Aloe Vera",
    skinTypes: ["all", "oily", "sensitive", "dry"],
    concerns: ["hydration", "sensitive-skin", "dryness"],
    keyIngredients: [
      { name: "Pure Aloe Vera", benefit: "Cools, soothes and deeply hydrates skin and hair" },
    ],
    ritualStep: "treat", stock: 100,
  },

  // ── Body Massage Oil ──────────────────────────────────
  {
    name: "Cedarwood Body Massage Oil",
    slug: "cedarwood-body-massage-oil",
    price: 399, discountPrice: 349,
    collectionSlug: "body-massage-oil",
    variantLabel: "Cedarwood",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness", "stress-relief"],
    keyIngredients: [
      { name: "Cedarwood Essential Oil", benefit: "Deep relaxation and calming of stressed muscles" },
    ],
    ritualStep: "treat", stock: 100,
  },

  // ── Shower Gel ────────────────────────────────────────
  {
    name: "Coffee Beans Shower Gel",
    slug: "coffee-beans-shower-gel",
    price: 299, discountPrice: 249,
    collectionSlug: "shower-gel",
    variantLabel: "Coffee Beans",
    skinTypes: ["all", "normal", "dull"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Coffee Extract", benefit: "Energizing cleanse and skin revitalization" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Seafresh Shower Gel",
    slug: "seafresh-shower-gel",
    price: 299, discountPrice: 249,
    collectionSlug: "shower-gel",
    variantLabel: "Seafresh",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [{ name: "Sea Extracts", benefit: "Refreshing hydration and long-lasting freshness" }],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Orange Fresh Shower Gel",
    slug: "orange-fresh-shower-gel",
    price: 299, discountPrice: 249,
    collectionSlug: "shower-gel",
    variantLabel: "Orange Fresh",
    skinTypes: ["all", "dull", "normal"],
    concerns: ["dullness"],
    keyIngredients: [{ name: "Orange Extract", benefit: "Citrus freshness and skin conditioning" }],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Bath Salt ─────────────────────────────────────────
  {
    name: "Lavender Bath Salt",
    slug: "lavender-bath-salt",
    price: 349, discountPrice: 299,
    collectionSlug: "bath-salt",
    variantLabel: "Lavender",
    skinTypes: ["all", "sensitive", "normal"],
    concerns: ["stress-relief", "sensitive-skin"],
    keyIngredients: [
      { name: "Himalayan Salt", benefit: "Detoxifies and draws out skin impurities" },
      { name: "Lavender Oil",   benefit: "Calming relaxation and soothing aromatherapy" },
    ],
    ritualStep: "treat", stock: 100,
  },
  {
    name: "Rose Bath Salt",
    slug: "rose-bath-salt",
    price: 349, discountPrice: 299,
    collectionSlug: "bath-salt",
    variantLabel: "Rose",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness", "stress-relief"],
    keyIngredients: [
      { name: "Himalayan Salt", benefit: "Detoxifies skin"                       },
      { name: "Rose Extract",   benefit: "Floral freshness and skin rejuvenation" },
    ],
    ritualStep: "treat", stock: 100,
  },
  {
    name: "Seafresh Bath Salt",
    slug: "seafresh-bath-salt",
    price: 349, discountPrice: 299,
    collectionSlug: "bath-salt",
    variantLabel: "Seafresh",
    skinTypes: ["all", "normal"],
    concerns: ["body-care", "stress-relief"],
    keyIngredients: [
      { name: "Himalayan Salt", benefit: "Detoxifies and refreshes skin"          },
      { name: "Sea Minerals",   benefit: "Revitalizing freshness and relaxation"  },
    ],
    ritualStep: "treat", stock: 100,
  },

  // ── Hand Wash ─────────────────────────────────────────
  {
    name: "Orange Hand Wash",
    slug: "orange-hand-wash",
    price: 199, discountPrice: 169,
    collectionSlug: "hand-wash",
    variantLabel: "Orange",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [
      { name: "Tulsi Extract",  benefit: "Natural disinfection and antibacterial care" },
      { name: "Orange Extract", benefit: "Refreshing citrus cleanse and freshness"     },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Lime Hand Wash",
    slug: "lime-hand-wash",
    price: 199, discountPrice: 169,
    collectionSlug: "hand-wash",
    variantLabel: "Lime",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [
      { name: "Tulsi Extract", benefit: "Natural antibacterial care"              },
      { name: "Lime Extract",  benefit: "Energizing cleansing and long freshness" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Peach Hand Wash",
    slug: "peach-hand-wash",
    price: 199, discountPrice: 169,
    collectionSlug: "hand-wash",
    variantLabel: "Peach",
    skinTypes: ["sensitive", "dry", "normal"],
    concerns: ["sensitive-skin", "dryness"],
    keyIngredients: [
      { name: "Tulsi Extract", benefit: "Natural antibacterial care"          },
      { name: "Peach Extract", benefit: "Gentle cleansing and skin softness"  },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Green Apple Hand Wash",
    slug: "green-apple-hand-wash",
    price: 199, discountPrice: 169,
    collectionSlug: "hand-wash",
    variantLabel: "Green Apple",
    skinTypes: ["all", "normal"],
    concerns: ["body-care"],
    keyIngredients: [
      { name: "Tulsi Extract",      benefit: "Natural antibacterial care"              },
      { name: "Green Apple Extract",benefit: "Crisp freshness and revitalizing care"   },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Intimate Wash ─────────────────────────────────────
  {
    name: "Intimate Hygiene Foam Wash",
    slug: "intimate-hygiene-foam-wash",
    price: 299, discountPrice: 249,
    collectionSlug: "intimate-wash",
    variantLabel: "Unisex",
    skinTypes: ["all", "sensitive"],
    concerns: ["sensitive-skin"],
    keyIngredients: [
      { name: "Tea Tree Extract", benefit: "Natural antiseptic and antibacterial care" },
      { name: "Aloe Vera",        benefit: "Soothing and gentle hydration"             },
      { name: "Lactic Acid",      benefit: "Maintains natural pH balance"              },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Shampoo ───────────────────────────────────────────
  {
    name: "Neem & Tulsi Shampoo",
    slug: "neem-tulsi-shampoo",
    price: 299, discountPrice: 249,
    collectionSlug: "shampoo",
    variantLabel: "Neem & Tulsi",
    skinTypes: ["all", "oily-scalp", "dandruff-prone"],
    concerns: ["dandruff", "hairfall", "oily-skin"],
    keyIngredients: [
      { name: "Neem Extract", benefit: "Antibacterial scalp cleansing"   },
      { name: "Tulsi",        benefit: "Dandruff control and purification" },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Amla & Shikakai Shampoo",
    slug: "amla-shikakai-shampoo",
    price: 299, discountPrice: 249,
    collectionSlug: "shampoo",
    variantLabel: "Amla & Shikakai",
    skinTypes: ["all", "dry-hair", "normal"],
    concerns: ["hairfall", "dryness", "frizz"],
    keyIngredients: [
      { name: "Amla",     benefit: "Hair strengthening and nourishment"      },
      { name: "Shikakai", benefit: "Natural cleansing and hair conditioning"  },
    ],
    ritualStep: "cleanse", stock: 100,
  },
  {
    name: "Black Pepper & Cucumber Shampoo",
    slug: "black-pepper-cucumber-shampoo",
    price: 299, discountPrice: 249,
    collectionSlug: "shampoo",
    variantLabel: "Black Pepper & Cucumber",
    skinTypes: ["all", "normal"],
    concerns: ["hairfall", "dullness"],
    keyIngredients: [
      { name: "Black Pepper", benefit: "Scalp stimulation and revitalization" },
      { name: "Cucumber",     benefit: "Refreshing scalp care"                },
    ],
    ritualStep: "cleanse", stock: 100,
  },

  // ── Conditioner ───────────────────────────────────────
  {
    name: "Nourish & Shine Conditioner",
    slug: "nourish-shine-conditioner",
    price: 299, discountPrice: 249,
    collectionSlug: "conditioner",
    variantLabel: "Nourish & Shine",
    skinTypes: ["all", "dry-hair", "frizzy"],
    concerns: ["frizz", "dryness", "hairfall"],
    keyIngredients: [
      { name: "Natural Seaweed Extract", benefit: "Deep nourishment and hair strengthening" },
      { name: "Botanical Oils",          benefit: "Enhances shine and improves hair texture" },
    ],
    ritualStep: "treat", stock: 100,
  },

  // ── Hair Serum ────────────────────────────────────────
  {
    name: "Redensyl & Anagain Hair Serum",
    slug: "redensyl-anagain-hair-serum",
    price: 499, discountPrice: 399,
    collectionSlug: "hair-serum",
    variantLabel: "Redensyl & Anagain",
    skinTypes: ["all", "thinning-hair", "hair-fall"],
    concerns: ["hairfall", "thinning-hair"],
    keyIngredients: [
      { name: "Redensyl", benefit: "Supports hair density and reduces hair fall"  },
      { name: "Anagain",  benefit: "Promotes the natural hair growth cycle"        },
      { name: "Biotin",   benefit: "Strengthens hair from inside each follicle"    },
    ],
    ritualStep: "treat", stock: 100,
  },
]

// ══════════════════════════════════════════════════════════
//  SEED FUNCTION
// ══════════════════════════════════════════════════════════

async function seed() {
  console.log("\n🌱  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected to nezal-db\n")

  // ── 1. WIPE ──────────────────────────────────────────────
  console.log("🗑️   Wiping existing data...")
  await Collection.deleteMany({})
  await Product.deleteMany({})
  console.log("✅  Collections and Products wiped\n")

  // ── 2. INSERT COLLECTIONS ────────────────────────────────
  console.log("📚  Seeding collections...")
  const insertedCollections = await Collection.insertMany(collectionsData)
  console.log(`   ✓ ${insertedCollections.length} collections created`)
  insertedCollections.forEach((c) =>
    console.log(`     • [${c.navCategory}/${c.subCategory}] ${c.name} → /collections/${c.slug}`)
  )

  // ── 3. INSERT PRODUCTS ───────────────────────────────────
  console.log("\n📦  Seeding products...")
 
  const companyDoc = await mongoose.connection.db.collection("companies").findOne({ slug: "nezal-herbocare" })
if (!companyDoc) throw new Error("Company not found. Run seed.js first.")
  
const insertedProducts = await Product.insertMany(
  productsData.map((p) => ({ ...p, company: companyDoc._id }))
)

  // ── SUMMARY ──────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════")
  console.log("✅  FULL SEED COMPLETE — Summary:")
  console.log(`   📚 Collections : ${insertedCollections.length}`)
  console.log(`   📦 Products    : ${insertedProducts.length}`)
  console.log("\n🔗  Collection routes:")
  insertedCollections.forEach((c) => console.log(`   /collections/${c.slug}`))
  console.log("══════════════════════════════════════════════\n")

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message)
  console.error(err)
  process.exit(1)
})