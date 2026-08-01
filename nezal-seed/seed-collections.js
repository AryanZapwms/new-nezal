/**
 * ============================================================
 *  NEZAL HERBOCARE — Collections Seed Script
 *  Run: node nezal-seed/seed-collections.js
 *
 *  Seeds: Collection documents + updates existing products
 *         with collectionSlug, variantLabel, skinTypes,
 *         concerns, keyIngredients, ritualStep fields
 *
 *  NOTE: Run AFTER seed.js (products must already exist)
 * ============================================================
 */

const mongoose = require("mongoose");

// ── CONNECTION ──────────────────────────────────────────────
const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

// ── SCHEMAS ─────────────────────────────────────────────────

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true },
    heroImage: String,
    heroHeadline: String,
    heroSubheadline: String,
    storyText: String,
    keyIngredients: [
      {
        name: { type: String, required: true },
        benefit: { type: String, required: true },
        icon: String,
      },
    ],
    concerns: { type: [String], default: [] },
    ritualSteps: [
      {
        step: { type: Number, required: true },
        label: { type: String, required: true },
        description: String,
        linkedCollectionSlug: String,
      },
    ],
    relatedCollections: { type: [String], default: [] },
    faq: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    seoTitle: String,
    seoDescription: String,
    metaKeywords: [String],
    navCategory: {
      type: String,
      enum: ["face-care", "body-care", "hair-care", "gift-kits"],
      required: true,
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
delete mongoose.models.Collection;
const Collection = mongoose.model("Collection", collectionSchema);

// Minimal product schema — only fields we need to update
const productSchema = new mongoose.Schema(
  {
    slug: String,
    collectionSlug: String,
    variantLabel: String,
    skinTypes: [String],
    concerns: [String],
    keyIngredients: [{ name: String, benefit: String, icon: String }],
    ritualStep: String,
  },
  { strict: false } // strict:false so we don't wipe existing fields on update
);
delete mongoose.models.Product;
const Product = mongoose.model("Product", productSchema);

// ══════════════════════════════════════════════════════════
//  COLLECTION DATA
// ══════════════════════════════════════════════════════════

const collectionsData = [

  // ── FACE CARE ─────────────────────────────────────────────

  {
    name: "Face Wash",
    slug: "face-wash",
    tagline: "Clean skin starts with the right ritual",
    heroImage: "/collections/face-wash-hero.jpg",
    heroHeadline: "Cleanse with Nature's Intelligence",
    heroSubheadline: "Herbal face washes that remove impurities without stripping your skin's natural balance.",
    storyText: "Every great skincare ritual begins with a clean canvas. Our face wash collection draws from Ayurvedic botanicals — neem, tulsi, turmeric and avocado — to gently but effectively cleanse your skin. No harsh sulfates, no artificial strippers. Just plants that understand your skin.",
    keyIngredients: [
      { name: "Neem Extract",     benefit: "Fights acne-causing bacteria naturally"   },
      { name: "Tulsi (Holy Basil)", benefit: "Purifies and balances oily skin"         },
      { name: "Turmeric",         benefit: "Brightens and evens out skin tone"         },
      { name: "Aloe Vera",        benefit: "Soothes and hydrates while cleansing"      },
    ],
    concerns: ["acne", "oily-skin", "pigmentation", "dullness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Use your face wash morning and night on wet skin", linkedCollectionSlug: "face-wash"         },
      { step: 2, label: "Treat",      description: "Follow with a targeted serum",                     linkedCollectionSlug: "face-serum"        },
      { step: 3, label: "Moisturize", description: "Lock in hydration with a nourishing cream",        linkedCollectionSlug: "face-moisturizer"  },
    ],
    relatedCollections: ["face-serum", "face-moisturizer", "face-scrub"],
    faq: [
      { question: "How often should I use a face wash?",          answer: "Twice daily — morning and night — is ideal for most skin types. If you have dry or sensitive skin, once at night is sufficient."                    },
      { question: "Is the Neem Tulsi face wash safe for daily use?", answer: "Yes, it is formulated for daily use. The neem and tulsi are balanced with aloe vera to prevent over-drying."                                  },
      { question: "Which face wash is best for acne-prone skin?", answer: "The Neem Tulsi Face Wash is specifically formulated for oily and acne-prone skin. Its antibacterial properties help reduce breakouts over time." },
      { question: "Can I use the Ubtan face wash for tan removal?", answer: "Yes. Ubtan with turmeric and sandalwood is particularly effective at reducing tan and brightening the complexion with regular use."            },
    ],
    seoTitle: "Herbal Face Wash Collection | Natural Cleansers by Nezal",
    seoDescription: "Discover Nezal's herbal face wash collection — neem tulsi, ubtan d-tan, avocado honey. Gentle, natural, effective cleansers for every skin type.",
    metaKeywords: ["herbal face wash", "neem face wash india", "natural face cleanser", "ubtan face wash", "sulphate free face wash"],
    navCategory: "face-care",
    sortOrder: 1,
  },

  {
    name: "Face Serum",
    slug: "face-serum",
    tagline: "Targeted actives for every skin story",
    heroImage: "/collections/face-serum-hero.jpg",
    heroHeadline: "Science Meets Botanical Wisdom",
    heroSubheadline: "Concentrated herbal serums that target your specific skin concerns — acne, dullness, or dehydration.",
    storyText: "A serum is where your skincare ritual gets serious. Nezal's face serum collection pairs Ayurvedic botanical extracts with modern active ingredients — salicylic acid, niacinamide, vitamin C and hyaluronic acid — to deliver targeted results without compromising on natural formulation. Each variant is designed for a specific skin story.",
    keyIngredients: [
      { name: "Tea Tree Oil",      benefit: "Controls excess sebum naturally"          },
      { name: "Salicylic Acid",    benefit: "Unclogs pores and clears breakouts"       },
      { name: "Vitamin C",         benefit: "Brightens and evens skin tone"            },
      { name: "Niacinamide",       benefit: "Minimises pores and reduces pigmentation" },
      { name: "Hyaluronic Acid",   benefit: "Locks in deep, long-lasting hydration"   },
    ],
    concerns: ["acne", "pigmentation", "open-pores", "dullness", "dehydration"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Start with a gentle face wash",              linkedCollectionSlug: "face-wash"        },
      { step: 2, label: "Serum",      description: "Apply 2–3 drops, press gently into skin",   linkedCollectionSlug: "face-serum"       },
      { step: 3, label: "Moisturize", description: "Seal with a nourishing moisturizer or cream", linkedCollectionSlug: "face-moisturizer" },
    ],
    relatedCollections: ["face-wash", "face-moisturizer"],
    faq: [
      { question: "Which serum is right for acne-prone skin?",       answer: "The Tea Tree + Salicylic Acid serum is designed specifically for oily, acne-prone skin. It controls sebum and clears pores without over-drying." },
      { question: "Can I use Vitamin C serum in the morning?",        answer: "Yes, Vitamin C is ideal for morning use as it also provides antioxidant protection against environmental damage throughout the day."              },
      { question: "Can I layer two serums?",                          answer: "We recommend one serum at a time for best results. If you want to target multiple concerns, alternate between serums morning and night."           },
      { question: "How long before I see results?",                   answer: "Most customers notice visible changes within 3–4 weeks of consistent daily use. For pigmentation, allow 6–8 weeks."                             },
    ],
    seoTitle: "Herbal Face Serum Collection | Vitamin C, Tea Tree, Hyaluronic Acid by Nezal",
    seoDescription: "Shop Nezal's face serum collection. Vitamin C + Niacinamide, Tea Tree + Salicylic Acid, Hyaluronic Acid serums for every skin concern.",
    metaKeywords: ["herbal face serum india", "vitamin c serum", "tea tree serum acne", "hyaluronic acid serum", "niacinamide serum"],
    navCategory: "face-care",
    sortOrder: 2,
  },

  {
    name: "Face Moisturizer",
    slug: "face-moisturizer",
    tagline: "Deep nourishment your skin deserves",
    heroImage: "/collections/face-moisturizer-hero.jpg",
    heroHeadline: "Nourish. Protect. Glow.",
    heroSubheadline: "Rich yet lightweight moisturizers with almond, shea and botanical actives for all-day hydration.",
    storyText: "Hydration is the foundation of healthy skin. Our face moisturizer collection uses the richness of sweet almond oil, shea butter and vitamin E to deliver deep nourishment without heaviness. Each formula is crafted to work with your skin's natural barrier, not against it.",
    keyIngredients: [
      { name: "Sweet Almond Oil", benefit: "Deeply nourishes and softens skin"         },
      { name: "Shea Butter",      benefit: "Locks in moisture and restores suppleness"  },
      { name: "Vitamin E",        benefit: "Antioxidant protection against skin aging"  },
      { name: "Rose Water",       benefit: "Tones and refreshes while soothing redness" },
    ],
    concerns: ["dryness", "dehydration", "anti-aging", "dullness"],
    ritualSteps: [
      { step: 1, label: "Cleanse",    description: "Wash with a gentle face wash",              linkedCollectionSlug: "face-wash"    },
      { step: 2, label: "Treat",      description: "Apply your targeted serum",                 linkedCollectionSlug: "face-serum"   },
      { step: 3, label: "Moisturize", description: "Finish with moisturizer, morning and night", linkedCollectionSlug: "face-moisturizer" },
    ],
    relatedCollections: ["face-wash", "face-serum"],
    faq: [
      { question: "Is the Almond Nourishing Cream suitable for oily skin?", answer: "It is formulated primarily for dry and normal skin. If you have oily skin, use a pea-sized amount only at night."                  },
      { question: "Can I use this as a night cream?",                        answer: "Yes, absolutely. The rich formula works especially well overnight when your skin's repair cycle is most active."                    },
      { question: "Is it safe for sensitive skin?",                          answer: "Yes. All ingredients are herbal and dermatologist tested. However, do a patch test before full application if you have reactive skin." },
    ],
    seoTitle: "Herbal Face Moisturizer Collection | Almond & Shea Cream by Nezal",
    seoDescription: "Deep hydration for every skin type. Nezal's herbal face moisturizers with almond oil, shea butter and vitamin E for lasting nourishment.",
    metaKeywords: ["herbal face moisturizer india", "almond face cream", "natural moisturizer dry skin", "shea butter cream face"],
    navCategory: "face-care",
    sortOrder: 3,
  },

  {
    name: "Face Scrub",
    slug: "face-scrub",
    tagline: "Reveal brighter skin beneath the surface",
    heroImage: "/collections/face-scrub-hero.jpg",
    heroHeadline: "Exfoliate. Brighten. Renew.",
    heroSubheadline: "Gentle herbal scrubs that buff away dead skin cells and reveal a naturally radiant complexion.",
    storyText: "Exfoliation is the secret step most skincare routines overlook. Nezal's face scrubs use natural exfoliants — walnut shell, turmeric and papaya — to gently slough away dead skin without microtears, leaving you with a smoother, brighter, more even complexion.",
    keyIngredients: [
      { name: "Walnut Shell Powder", benefit: "Gently exfoliates without microtears"      },
      { name: "Turmeric Powder",     benefit: "Brightens and reduces pigmentation"         },
      { name: "Papaya Extract",      benefit: "Enzymatic exfoliation for even skin tone"   },
      { name: "Coconut Oil",         benefit: "Nourishes while scrubbing"                  },
    ],
    concerns: ["pigmentation", "dullness", "uneven-skin-tone", "rough-texture"],
    ritualSteps: [
      { step: 1, label: "Exfoliate",  description: "Use scrub 2–3 times a week on damp skin", linkedCollectionSlug: "face-scrub"       },
      { step: 2, label: "Cleanse",    description: "Follow with a gentle face wash",           linkedCollectionSlug: "face-wash"        },
      { step: 3, label: "Moisturize", description: "Always moisturize after exfoliating",      linkedCollectionSlug: "face-moisturizer" },
    ],
    relatedCollections: ["face-wash", "face-moisturizer", "face-serum"],
    faq: [
      { question: "How often should I use a face scrub?",       answer: "2–3 times per week is ideal. Over-exfoliating can damage the skin barrier, so avoid daily use."                  },
      { question: "Can I use a scrub on sensitive skin?",       answer: "Use minimal pressure and rinse quickly. If you experience redness, reduce frequency to once a week."              },
      { question: "Should I scrub before or after cleansing?",  answer: "Scrub on damp skin before cleansing, then wash off residue with your face wash for best results."                },
    ],
    seoTitle: "Herbal Face Scrub Collection | Natural Exfoliants by Nezal",
    seoDescription: "Gentle herbal face scrubs with walnut, turmeric and papaya. Exfoliate dead skin and reveal a brighter complexion naturally.",
    metaKeywords: ["herbal face scrub india", "natural face exfoliator", "turmeric face scrub", "walnut scrub face"],
    navCategory: "face-care",
    sortOrder: 4,
  },

  // ── BODY CARE ─────────────────────────────────────────────

  {
    name: "Body Lotion",
    slug: "body-lotion",
    tagline: "All-day hydration, nature's way",
    heroImage: "/collections/body-lotion-hero.jpg",
    heroHeadline: "Skin That Feels as Good as It Looks",
    heroSubheadline: "Lightweight, fast-absorbing body lotions with aloe vera and botanicals for lasting moisture.",
    storyText: "Your skin covers your entire body — it deserves the same care as your face. Nezal's body lotions are formulated with pure aloe vera, cucumber and hyaluronic acid to deliver deep, non-greasy hydration that lasts all day. Light enough for daily use, rich enough to make a difference.",
    keyIngredients: [
      { name: "Aloe Vera Gel",     benefit: "Soothes and deeply hydrates parched skin"    },
      { name: "Cucumber Extract",  benefit: "Cools and refreshes sun-exposed skin"         },
      { name: "Hyaluronic Acid",   benefit: "Retains moisture for 24-hour hydration"       },
      { name: "Shea Butter",       benefit: "Nourishes and softens rough patches"          },
    ],
    concerns: ["dryness", "dehydration", "rough-skin", "sun-damage"],
    ritualSteps: [
      { step: 1, label: "Shower",   description: "Cleanse with a gentle body wash or soap", linkedCollectionSlug: "body-wash"  },
      { step: 2, label: "Moisturize", description: "Apply body lotion immediately after drying", linkedCollectionSlug: "body-lotion" },
      { step: 3, label: "Protect",  description: "Use body oil for extra nourishment on dry areas", linkedCollectionSlug: "body-oil" },
    ],
    relatedCollections: ["body-oil", "body-wash", "bath-salts"],
    faq: [
      { question: "When is the best time to apply body lotion?",  answer: "Right after a shower while skin is still slightly damp. This seals in moisture most effectively."       },
      { question: "Is the Aloe Vera Body Lotion greasy?",         answer: "No. It is specifically formulated to be lightweight and fast-absorbing — ideal for humid climates."   },
      { question: "Can I use body lotion on my face?",            answer: "We recommend using face-specific products on your face as body lotions are formulated for thicker body skin." },
    ],
    seoTitle: "Herbal Body Lotion Collection | Aloe Vera & Shea Butter by Nezal",
    seoDescription: "Nezal's herbal body lotions with aloe vera, hyaluronic acid and shea butter. Long-lasting moisture for soft, healthy skin.",
    metaKeywords: ["herbal body lotion india", "aloe vera body lotion", "natural moisturizer body", "shea butter lotion"],
    navCategory: "body-care",
    sortOrder: 1,
  },

  {
    name: "Body Oil",
    slug: "body-oil",
    tagline: "Luxurious nourishment from root to surface",
    heroImage: "/collections/body-oil-hero.jpg",
    heroHeadline: "Ancient Oils, Modern Ritual",
    heroSubheadline: "Pure botanical body oils that penetrate deep to nourish, relax and restore your skin.",
    storyText: "Oil-based body care has been central to Indian wellness traditions for centuries. Nezal's body oils blend cedarwood, jojoba and sweet almond oil to deliver deep cellular nourishment while promoting relaxation. Each oil is cold-pressed and blended with precision for maximum skin benefit.",
    keyIngredients: [
      { name: "Cedarwood Essential Oil", benefit: "Relaxes muscles and calms the mind"          },
      { name: "Jojoba Oil",              benefit: "Mimics skin's natural sebum for balance"      },
      { name: "Sweet Almond Oil",        benefit: "Softens and nourishes deeply"                 },
      { name: "Vitamin E",               benefit: "Antioxidant protection and skin repair"       },
    ],
    concerns: ["dryness", "muscle-tension", "stress", "rough-skin"],
    ritualSteps: [
      { step: 1, label: "Shower",  description: "Cleanse thoroughly before applying oil",        linkedCollectionSlug: "body-wash"  },
      { step: 2, label: "Apply",   description: "Warm oil in palms and massage into damp skin",  linkedCollectionSlug: "body-oil"   },
      { step: 3, label: "Absorb",  description: "Allow 5 minutes before dressing",               linkedCollectionSlug: null         },
    ],
    relatedCollections: ["body-lotion", "bath-salts", "body-wash"],
    faq: [
      { question: "Can I use body oil daily?",                   answer: "Yes, daily use is recommended for dry skin. For normal skin, 3–4 times a week is sufficient."    },
      { question: "Should I apply oil before or after lotion?",  answer: "Apply oil after lotion to seal in all moisture, or use oil alone on damp skin right after a shower." },
      { question: "Is cedarwood oil safe for all skin types?",   answer: "Yes. Our blend is diluted to a safe concentration for all skin types. Avoid contact with eyes."   },
    ],
    seoTitle: "Herbal Body Oil Collection | Cedarwood & Jojoba by Nezal",
    seoDescription: "Luxurious herbal body oils with cedarwood, jojoba and almond. Deep nourishment and relaxation for every skin type.",
    metaKeywords: ["herbal body oil india", "cedarwood body oil", "jojoba oil skin", "natural massage oil"],
    navCategory: "body-care",
    sortOrder: 2,
  },

  {
    name: "Body Wash",
    slug: "body-wash",
    tagline: "Your daily cleanse, elevated",
    heroImage: "/collections/body-wash-hero.jpg",
    heroHeadline: "Cleanse, Refresh, Glow",
    heroSubheadline: "Gentle herbal body washes that cleanse thoroughly while keeping your skin soft and moisturised.",
    storyText: "Your shower is a daily ritual — make it count. Nezal's body washes combine botanical cleansers with skin-conditioning ingredients so you emerge clean, soft and refreshed, not dry and stripped. Infused with natural fragrances that uplift your mood from the very first rinse.",
    keyIngredients: [
      { name: "Coconut-Derived Cleansers", benefit: "Gentle, effective cleansing without dryness" },
      { name: "Aloe Vera",                 benefit: "Soothes and conditions skin while cleansing"  },
      { name: "Vitamin E",                 benefit: "Moisturising protection during cleansing"     },
    ],
    concerns: ["dryness", "rough-skin", "body-odor"],
    ritualSteps: [
      { step: 1, label: "Lather",     description: "Apply body wash on wet skin, lather well",   linkedCollectionSlug: "body-wash"  },
      { step: 2, label: "Rinse",      description: "Rinse thoroughly with water",                 linkedCollectionSlug: null         },
      { step: 3, label: "Moisturize", description: "Follow with body lotion or oil",              linkedCollectionSlug: "body-lotion" },
    ],
    relatedCollections: ["body-lotion", "body-oil", "bath-salts"],
    faq: [
      { question: "Are the body washes sulphate-free?",          answer: "Yes, Nezal body washes use coconut-derived cleansers and are free from harsh sulphates."               },
      { question: "Can children use Nezal body washes?",         answer: "We recommend products specifically formulated for children. Our body washes are designed for adults."   },
    ],
    seoTitle: "Herbal Body Wash Collection | Natural Shower Gel by Nezal",
    seoDescription: "Gentle herbal body washes with aloe vera and natural botanicals. Cleanse and nourish your skin every day without harsh chemicals.",
    metaKeywords: ["herbal body wash india", "natural shower gel", "sulphate free body wash", "aloe vera body wash"],
    navCategory: "body-care",
    sortOrder: 3,
  },

  {
    name: "Bath Salts",
    slug: "bath-salts",
    tagline: "Turn your bath into a ritual",
    heroImage: "/collections/bath-salts-hero.jpg",
    heroHeadline: "Soak. Relax. Restore.",
    heroSubheadline: "Himalayan bath salts infused with botanicals and essential oils for a truly restorative bath experience.",
    storyText: "The ritual of a salt bath is one of the oldest forms of self-care. Nezal's bath salts combine Himalayan pink salt — rich in 84 trace minerals — with rose petals, lavender and essential oils to relax your muscles, soften your skin and restore your sense of calm.",
    keyIngredients: [
      { name: "Himalayan Pink Salt", benefit: "Rich in 84 minerals, draws out toxins"        },
      { name: "Rose Petals",         benefit: "Softens skin and soothes the senses"           },
      { name: "Lavender Oil",        benefit: "Calms the nervous system and aids sleep"       },
      { name: "Rose Essential Oil",  benefit: "Aromatherapy that lifts mood and reduces stress" },
    ],
    concerns: ["stress", "muscle-tension", "dryness", "after-workout"],
    ritualSteps: [
      { step: 1, label: "Dissolve", description: "Add 2–3 tbsp to warm bath water",            linkedCollectionSlug: "bath-salts"  },
      { step: 2, label: "Soak",     description: "Soak for 15–20 minutes",                     linkedCollectionSlug: null          },
      { step: 3, label: "Moisturize", description: "Apply body oil or lotion after your bath", linkedCollectionSlug: "body-lotion" },
    ],
    relatedCollections: ["body-lotion", "body-oil"],
    faq: [
      { question: "How often can I use bath salts?",            answer: "2–3 times a week is ideal. Daily use is fine for normal skin but may cause dryness for sensitive skin types." },
      { question: "Can I use bath salts if I have dry skin?",   answer: "Yes. Follow your salt bath with a rich body lotion or oil to lock in moisture."                            },
      { question: "Are Nezal bath salts suitable for children?", answer: "We recommend consulting a pediatrician before using bath salts on children under 12."                    },
    ],
    seoTitle: "Herbal Bath Salts Collection | Rose & Himalayan Salt by Nezal",
    seoDescription: "Luxury Himalayan bath salts with rose, lavender and essential oils. Relax muscles, soften skin and restore calm with every soak.",
    metaKeywords: ["himalayan bath salts india", "rose bath salt", "herbal bath soak", "lavender bath salt"],
    navCategory: "body-care",
    sortOrder: 4,
  },

  // ── HAIR CARE ─────────────────────────────────────────────

  {
    name: "Shampoo",
    slug: "shampoo",
    tagline: "Cleanse your scalp, nourish your roots",
    heroImage: "/collections/shampoo-hero.jpg",
    heroHeadline: "Root-to-Tip Ayurvedic Cleansing",
    heroSubheadline: "Sulphate-free herbal shampoos that cleanse your scalp gently while preserving your hair's natural oils.",
    storyText: "Healthy hair begins at the scalp. Nezal's shampoo collection uses sulphate-free, coconut-derived cleansers blended with aloe vera, green tea and Ayurvedic botanicals to cleanse effectively without stripping your scalp's natural moisture balance. Suitable for all hair types including colour-treated hair.",
    keyIngredients: [
      { name: "Aloe Vera",                  benefit: "Soothes scalp and promotes healthy hair growth" },
      { name: "Green Tea Extract",          benefit: "Antioxidant protection for hair follicles"       },
      { name: "Coconut-Derived Cleansers",  benefit: "Gentle cleansing without sulphate damage"       },
      { name: "Argan Oil",                  benefit: "Adds shine and tames frizz from the first wash"  },
    ],
    concerns: ["hairfall", "dandruff", "oily-scalp", "frizz"],
    ritualSteps: [
      { step: 1, label: "Shampoo",    description: "Lather on wet hair, massage scalp gently",      linkedCollectionSlug: "shampoo"     },
      { step: 2, label: "Condition",  description: "Apply conditioner on lengths, leave 2–3 mins",  linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",      description: "On dry hair, apply hair serum for shine and protection", linkedCollectionSlug: "hair-serum" },
    ],
    relatedCollections: ["conditioner", "hair-serum"],
    faq: [
      { question: "Is the shampoo sulphate-free?",           answer: "Yes. We use only coconut-derived cleansers. No SLS or SLES."                                                 },
      { question: "How often should I wash my hair?",        answer: "3–4 times a week is ideal. Over-washing strips natural oils; under-washing leads to scalp buildup."         },
      { question: "Is it safe for colour-treated hair?",     answer: "Yes. Our sulphate-free formula is safe for colour-treated and chemically processed hair."                   },
    ],
    seoTitle: "Herbal Shampoo Collection | Sulphate-Free by Nezal",
    seoDescription: "Sulphate-free herbal shampoos with aloe vera, green tea and argan oil. Gentle cleansing for all hair types including colour-treated hair.",
    metaKeywords: ["sulphate free shampoo india", "herbal shampoo", "aloe vera shampoo", "natural shampoo hairfall"],
    navCategory: "hair-care",
    sortOrder: 1,
  },

  {
    name: "Conditioner",
    slug: "conditioner",
    tagline: "Frizz-free, silky, nourished hair",
    heroImage: "/collections/conditioner-hero.jpg",
    heroHeadline: "Nourish Every Strand",
    heroSubheadline: "Rich herbal conditioners with argan oil and keratin protein that transform dry, frizzy hair into silk.",
    storyText: "Conditioning is not optional — it is essential. Nezal's conditioners go beyond surface softening, delivering argan oil, keratin protein and silk amino acids deep into the hair shaft to repair damage, control frizz and add long-lasting shine. Your hair will feel the difference from the very first use.",
    keyIngredients: [
      { name: "Argan Oil",          benefit: "Seals moisture and adds intense shine"              },
      { name: "Keratin Protein",    benefit: "Repairs damage and strengthens hair structure"      },
      { name: "Silk Amino Acids",   benefit: "Smooths the cuticle for frizz-free softness"       },
      { name: "Vitamin B5",         benefit: "Adds volume and elasticity to each strand"          },
    ],
    concerns: ["frizz", "dryness", "damaged-hair", "dullness"],
    ritualSteps: [
      { step: 1, label: "Shampoo",    description: "Cleanse scalp with herbal shampoo first",          linkedCollectionSlug: "shampoo"     },
      { step: 2, label: "Condition",  description: "Apply on lengths and ends, not scalp. Wait 2–3 mins", linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",      description: "Apply hair serum on damp hair before styling",      linkedCollectionSlug: "hair-serum"  },
    ],
    relatedCollections: ["shampoo", "hair-serum"],
    faq: [
      { question: "Should I apply conditioner on my scalp?",      answer: "No. Apply only on the lengths and ends of your hair, avoiding the scalp to prevent buildup and oiliness." },
      { question: "How long should I leave conditioner in?",       answer: "2–3 minutes is sufficient for regular conditioning. For a deep treatment, leave for 10–15 minutes."     },
      { question: "Can thin hair use a heavy conditioner?",        answer: "Use a small amount and focus on the ends. Avoid the scalp and roots to prevent weighing hair down."     },
    ],
    seoTitle: "Herbal Hair Conditioner Collection | Argan & Keratin by Nezal",
    seoDescription: "Nezal's herbal conditioners with argan oil, keratin protein and silk amino acids. Transform dry, frizzy hair into smooth, shiny locks.",
    metaKeywords: ["herbal hair conditioner india", "argan oil conditioner", "keratin conditioner", "natural conditioner frizzy hair"],
    navCategory: "hair-care",
    sortOrder: 2,
  },

  {
    name: "Hair Serum",
    slug: "hair-serum",
    tagline: "From root to tip — strength and growth",
    heroImage: "/collections/hair-serum-hero.jpg",
    heroHeadline: "Ancient Roots, Modern Results",
    heroSubheadline: "Bhringraj, onion and biotin-powered serums that reduce hair fall and promote visible growth.",
    storyText: "Bhringraj — the king of herbs for hair — has been used in Ayurvedic medicine for centuries to promote hair growth and scalp health. Nezal combines this ancient wisdom with modern actives like biotin, onion oil and vitamin E to create serums that genuinely work. Not just on the surface — at the root.",
    keyIngredients: [
      { name: "Bhringraj Extract", benefit: "Promotes hair growth and scalp circulation"      },
      { name: "Onion Oil",         benefit: "Reduces hair fall with rich sulphur content"     },
      { name: "Castor Oil",        benefit: "Thickens hair and nourishes dry scalp"           },
      { name: "Biotin",            benefit: "Strengthens hair from inside each follicle"      },
    ],
    concerns: ["hairfall", "thinning-hair", "slow-growth", "dry-scalp"],
    ritualSteps: [
      { step: 1, label: "Shampoo",   description: "Cleanse with sulphate-free shampoo",          linkedCollectionSlug: "shampoo"    },
      { step: 2, label: "Condition", description: "Use conditioner on lengths",                   linkedCollectionSlug: "conditioner" },
      { step: 3, label: "Serum",     description: "Apply serum on scalp, massage gently",        linkedCollectionSlug: "hair-serum" },
    ],
    relatedCollections: ["shampoo", "conditioner"],
    faq: [
      { question: "How do I use the hair serum?",                answer: "Apply a few drops directly on the scalp, massage in circular motions. Leave overnight or for at least 1 hour before washing." },
      { question: "How long before I see hair growth results?",  answer: "Most users notice reduced hair fall within 4 weeks. Visible new growth typically appears at 8–12 weeks of consistent use." },
      { question: "Does onion oil smell bad?",                   answer: "Our formulation uses processed onion extract that significantly reduces the odour while preserving all benefits."           },
    ],
    seoTitle: "Herbal Hair Serum Collection | Bhringraj & Onion Oil by Nezal",
    seoDescription: "Reduce hair fall and boost growth with Nezal's Bhringraj hair serum. Powered by onion oil, castor and biotin for strong, thick hair.",
    metaKeywords: ["bhringraj hair serum india", "onion oil hair serum", "hair fall serum", "natural hair growth serum india"],
    navCategory: "hair-care",
    sortOrder: 3,
  },

  // ── GIFT KITS ─────────────────────────────────────────────

  {
    name: "Gift Kits",
    slug: "gift-kits",
    tagline: "Curated care for the people you love",
    heroImage: "/collections/gift-kits-hero.jpg",
    heroHeadline: "Give the Gift of Herbal Luxury",
    heroSubheadline: "Beautifully presented Nezal gift sets — for birthdays, festivals and every occasion that deserves something special.",
    storyText: "A Nezal gift kit is not just a product bundle — it is a curated wellness experience. Each kit is handpicked to complement each other, beautifully packaged in eco-friendly materials and optionally personalised with a handwritten message. Give someone the ritual of herbal self-care.",
    keyIngredients: [
      { name: "Curated Bestsellers",     benefit: "Only our most loved products in each kit"   },
      { name: "Eco-Friendly Packaging",  benefit: "Sustainable, beautiful unboxing experience" },
      { name: "Personalised Message",    benefit: "Add a handwritten note at checkout"         },
    ],
    concerns: ["gifting", "self-care", "festivals", "birthdays"],
    ritualSteps: [],
    relatedCollections: ["face-wash", "body-lotion", "bath-salts"],
    faq: [
      { question: "Can I customise the gift kit?",           answer: "Yes. The Comfort Mono kit lets you choose your preferred product. Custom kits can be requested via our contact page." },
      { question: "Do you offer gift wrapping?",             answer: "All gift kits come in premium eco-friendly packaging. Free gift wrapping with a message card is included."           },
      { question: "What is the delivery time for gift kits?", answer: "Standard delivery is 4–7 business days. Express delivery is available at checkout for urgent orders."             },
    ],
    seoTitle: "Herbal Skincare Gift Kits | Birthday & Festival Gifts by Nezal",
    seoDescription: "Nezal's curated herbal skincare gift kits. Perfect for birthdays, weddings and festivals. Eco-friendly packaging with personalised message option.",
    metaKeywords: ["herbal skincare gift india", "natural beauty gift kit", "skincare gift set india", "birthday gift skincare"],
    navCategory: "gift-kits",
    sortOrder: 1,
  },
];

// ══════════════════════════════════════════════════════════
//  PRODUCT → COLLECTION MAPPING
//  Maps each product slug to its collection fields
// ══════════════════════════════════════════════════════════

const productUpdates = [
  // ── Face Wash ────────────────────────────────────────────
  {
    slug: "ubtan-d-tan-face-wash",
    collectionSlug: "face-wash",
    variantLabel: "Ubtan D-Tan",
    skinTypes: ["all", "tanned", "dull"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [
      { name: "Turmeric Extract",   benefit: "Brightens and evens out skin tone"   },
      { name: "Sandalwood Powder",  benefit: "Soothes and naturally lightens tan"  },
      { name: "Vitamin C",          benefit: "Antioxidant brightening"             },
    ],
    ritualStep: "cleanse",
  },
  {
    slug: "neem-tulsi-face-wash",
    collectionSlug: "face-wash",
    variantLabel: "Neem Tulsi",
    skinTypes: ["oily", "acne-prone", "combination"],
    concerns: ["acne", "oily-skin"],
    keyIngredients: [
      { name: "Neem Extract",   benefit: "Fights acne-causing bacteria naturally" },
      { name: "Tulsi",          benefit: "Purifies and balances oily skin"         },
      { name: "Tea Tree Oil",   benefit: "Antibacterial and anti-inflammatory"    },
    ],
    ritualStep: "cleanse",
  },
  {
    slug: "avocado-honey-face-wash",
    collectionSlug: "face-wash",
    variantLabel: "Avocado Honey",
    skinTypes: ["dry", "sensitive", "normal"],
    concerns: ["dryness", "dehydration"],
    keyIngredients: [
      { name: "Avocado Extract", benefit: "Rich fatty acids that nourish while cleansing" },
      { name: "Honey",           benefit: "Natural humectant that retains moisture"       },
      { name: "Chamomile",       benefit: "Soothes sensitive skin during cleansing"       },
    ],
    ritualStep: "cleanse",
  },

  // ── Face Moisturizer ────────────────────────────────────
  {
    slug: "almond-nourishing-cream",
    collectionSlug: "face-moisturizer",
    variantLabel: "Almond Nourishing Cream",
    skinTypes: ["dry", "normal", "mature"],
    concerns: ["dryness", "anti-aging", "dullness"],
    keyIngredients: [
      { name: "Sweet Almond Oil", benefit: "Deeply nourishes and softens skin"        },
      { name: "Shea Butter",      benefit: "Locks in moisture and restores suppleness" },
      { name: "Vitamin E",        benefit: "Antioxidant protection against skin aging" },
    ],
    ritualStep: "moisturize",
  },

  // ── Body Lotion ─────────────────────────────────────────
  {
    slug: "aloe-vera-body-lotion",
    collectionSlug: "body-lotion",
    variantLabel: "Aloe Vera & Cucumber",
    skinTypes: ["all", "sun-exposed", "dry"],
    concerns: ["dryness", "sun-damage", "dehydration"],
    keyIngredients: [
      { name: "Aloe Vera Gel",    benefit: "Soothes and deeply hydrates parched skin" },
      { name: "Cucumber Extract", benefit: "Cools and refreshes sun-exposed skin"     },
      { name: "Hyaluronic Acid",  benefit: "Retains moisture for 24-hour hydration"   },
    ],
    ritualStep: "moisturize",
  },

  // ── Body Oil ────────────────────────────────────────────
  {
    slug: "body-massage-oil-cedarwood",
    collectionSlug: "body-oil",
    variantLabel: "Cedarwood Relaxing Oil",
    skinTypes: ["all", "dry", "stressed"],
    concerns: ["dryness", "muscle-tension", "stress"],
    keyIngredients: [
      { name: "Cedarwood Essential Oil", benefit: "Relaxes muscles and calms the mind"   },
      { name: "Jojoba Oil",              benefit: "Mimics skin's natural sebum balance"  },
      { name: "Sweet Almond Oil",        benefit: "Softens and deeply nourishes skin"    },
    ],
    ritualStep: "moisturize",
  },

  // ── Body Scrub (maps to body-wash collection for now) ──
  {
    slug: "turmeric-body-scrub",
    collectionSlug: "body-wash",
    variantLabel: "Turmeric Brightening Scrub",
    skinTypes: ["all", "tanned", "rough"],
    concerns: ["pigmentation", "rough-skin", "dullness"],
    keyIngredients: [
      { name: "Turmeric Powder",     benefit: "Brightens and reduces pigmentation"     },
      { name: "Walnut Shell Powder", benefit: "Gently exfoliates without microtears"   },
      { name: "Papaya Extract",      benefit: "Enzymatic exfoliation for even tone"    },
    ],
    ritualStep: "exfoliate",
  },

  // ── Bath Salts ──────────────────────────────────────────
  {
    slug: "rose-bathing-salt",
    collectionSlug: "bath-salts",
    variantLabel: "Rose & Himalayan Salt",
    skinTypes: ["all"],
    concerns: ["stress", "muscle-tension", "dryness"],
    keyIngredients: [
      { name: "Himalayan Pink Salt", benefit: "Rich in 84 minerals, draws out toxins"     },
      { name: "Rose Essential Oil",  benefit: "Aromatherapy that lifts mood and reduces stress" },
      { name: "Lavender Oil",        benefit: "Calms the nervous system and aids sleep"   },
    ],
    ritualStep: "other",
  },

  // ── Hair Care ───────────────────────────────────────────
  {
    slug: "aloe-vera-shampoo-sulphate-free",
    collectionSlug: "shampoo",
    variantLabel: "Aloe Vera Sulphate-Free Shampoo",
    skinTypes: ["all", "sensitive-scalp", "colour-treated"],
    concerns: ["hairfall", "oily-scalp", "dandruff"],
    keyIngredients: [
      { name: "Aloe Vera",         benefit: "Soothes scalp and promotes healthy growth" },
      { name: "Green Tea Extract", benefit: "Antioxidant protection for follicles"      },
      { name: "Argan Oil",         benefit: "Adds shine and tames frizz"                },
    ],
    ritualStep: "cleanse",
  },
  {
    slug: "hair-conditioner-nourish-shine",
    collectionSlug: "conditioner",
    variantLabel: "Nourish & Shine Conditioner",
    skinTypes: ["all", "dry", "frizzy"],
    concerns: ["frizz", "dryness", "damaged-hair"],
    keyIngredients: [
      { name: "Argan Oil",        benefit: "Seals moisture and adds intense shine"     },
      { name: "Keratin Protein",  benefit: "Repairs damage and strengthens hair"       },
      { name: "Silk Amino Acids", benefit: "Smooths cuticle for frizz-free softness"  },
    ],
    ritualStep: "treat",
  },
  {
    slug: "bhringraj-hair-serum",
    collectionSlug: "hair-serum",
    variantLabel: "Bhringraj & Onion Growth Serum",
    skinTypes: ["all", "thinning", "hair-fall"],
    concerns: ["hairfall", "thinning-hair", "slow-growth"],
    keyIngredients: [
      { name: "Bhringraj Extract", benefit: "Promotes hair growth and scalp circulation" },
      { name: "Onion Oil",         benefit: "Reduces hair fall with rich sulphur content" },
      { name: "Biotin",            benefit: "Strengthens hair from inside each follicle"  },
    ],
    ritualStep: "treat",
  },

  // ── Soaps ───────────────────────────────────────────────
  {
    slug: "lemon-designer-soap",
    collectionSlug: "body-wash",
    variantLabel: "Lemon Brightening Soap",
    skinTypes: ["all", "oily", "dull"],
    concerns: ["pigmentation", "dullness"],
    keyIngredients: [
      { name: "Lemon Extract", benefit: "Natural brightening and blemish reduction" },
      { name: "Vitamin C",     benefit: "Antioxidant protection and glow"          },
    ],
    ritualStep: "cleanse",
  },
  {
    slug: "jasmine-aissis-soap",
    collectionSlug: "body-wash",
    variantLabel: "Jasmine Moisturising Soap",
    skinTypes: ["all", "dry", "normal"],
    concerns: ["dryness"],
    keyIngredients: [
      { name: "Jasmine Extract", benefit: "Floral fragrance and skin softening"   },
      { name: "Milk Protein",    benefit: "Nourishes and conditions while cleansing" },
    ],
    ritualStep: "cleanse",
  },
  {
    slug: "charcoal-detox-soap",
    collectionSlug: "body-wash",
    variantLabel: "Charcoal Detox Soap",
    skinTypes: ["oily", "acne-prone", "congested"],
    concerns: ["acne", "oily-skin", "open-pores"],
    keyIngredients: [
      { name: "Activated Charcoal", benefit: "Draws out toxins and unclogs pores" },
      { name: "Tea Tree Oil",       benefit: "Antibacterial deep pore cleansing"   },
    ],
    ritualStep: "cleanse",
  },

  // ── Gift Kits ───────────────────────────────────────────
  {
    slug: "comfort-mono-gift-kit",
    collectionSlug: "gift-kits",
    variantLabel: "Comfort Mono Kit",
    skinTypes: ["all"],
    concerns: ["gifting"],
    keyIngredients: [],
    ritualStep: "other",
  },
  {
    slug: "comfort-neo-gift-kit",
    collectionSlug: "gift-kits",
    variantLabel: "Comfort Neo Kit",
    skinTypes: ["all"],
    concerns: ["gifting"],
    keyIngredients: [],
    ritualStep: "other",
  },

  // ── Intimate Hygiene ────────────────────────────────────
  {
    slug: "intimate-hygiene-foam-wash-unisex",
    collectionSlug: "body-wash",
    variantLabel: "Intimate Hygiene Foam Wash",
    skinTypes: ["all", "sensitive"],
    concerns: ["sensitive-skin"],
    keyIngredients: [
      { name: "Lactic Acid",      benefit: "Maintains healthy pH balance"        },
      { name: "Tea Tree Oil",     benefit: "Antibacterial gentle protection"      },
      { name: "Chamomile Extract", benefit: "Soothes irritation and inflammation" },
    ],
    ritualStep: "cleanse",
  },
];

// ══════════════════════════════════════════════════════════
//  SEED FUNCTION
// ══════════════════════════════════════════════════════════

async function seed() {
  console.log("\n🌱  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to nezal-db\n");

  // ── 1. CLEAR EXISTING COLLECTIONS ───────────────────────
  console.log("🗑️   Clearing existing Collection documents...");
  await Collection.deleteMany({});
  console.log("✅  Cleared Collection collection\n");

  // ── 2. INSERT COLLECTIONS ────────────────────────────────
  console.log("📚  Seeding collections...");
  const inserted = await Collection.insertMany(collectionsData);
  console.log(`   ✓ ${inserted.length} collections created`);
  inserted.forEach((c) => console.log(`     • [${c.navCategory}] ${c.name} → /collections/${c.slug}`));

  // ── 3. UPDATE PRODUCTS ───────────────────────────────────
  console.log("\n📦  Updating products with collection fields...");

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const update of productUpdates) {
    const { slug, ...fields } = update;
    const result = await Product.updateOne(
      { slug },
      {
        $set: {
          collectionSlug:  fields.collectionSlug,
          variantLabel:    fields.variantLabel,
          skinTypes:       fields.skinTypes,
          concerns:        fields.concerns,
          keyIngredients:  fields.keyIngredients,
          ritualStep:      fields.ritualStep,
        },
      }
    );

    if (result.matchedCount === 0) {
      console.log(`   ⚠️  Product not found: ${slug}`);
      notFoundCount++;
    } else {
      console.log(`   ✓ Updated: ${slug} → collection: ${fields.collectionSlug}`);
      updatedCount++;
    }
  }

  // ── DONE ─────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("✅  COLLECTIONS SEED COMPLETE — Summary:");
  console.log(`   📚 Collections created : ${inserted.length}`);
  console.log(`   📦 Products updated    : ${updatedCount}`);
  if (notFoundCount > 0) {
    console.log(`   ⚠️  Products not found  : ${notFoundCount} (run seed.js first)`);
  }
  console.log("══════════════════════════════════════════");
  console.log("\n🔗  Collection routes available:");
  inserted.forEach((c) => console.log(`   /collections/${c.slug}`));
  console.log("══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Collections seed failed:", err.message);
  console.error(err);
  process.exit(1);
});