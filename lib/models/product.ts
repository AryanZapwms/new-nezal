// lib/models/product.ts
import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },

    description: String,
    price: {
      type: Number,
      required: true,
    },
    discountPrice: Number,
    image: String,
    images: [String],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
    
   sku: {
  type: String,
  required: true,
  trim: true,
},
weight: {
  type: Number,
  default: 0.3, // kg — used for Shiprocket shipment weight calculation
},
length: {
  type: Number,
  default: 10, // cm
},
breadth: {
  type: Number,
  default: 10, // cm
},
height: {
  type: Number,
  default: 10, // cm
},
hsn: {
  type: String,
  default: "",
  trim: true,
},

// ─── Amazon marketplace link ───────────────────────────────────────────
// Raw Amazon product URL, entered in the admin panel. Optional — the
// "Buy on Amazon" button only renders on the product page when this is set.
amazonUrl: {
  type: String,
  default: "",
  trim: true,
},

// ─── GST ────────────────────────────────────────────────────────────────
// Percentage. Prices (`price`, `sizes[].price`) are GST-inclusive — this
// field is used only to compute the tax breakdown shown in cart/checkout.
gstPercent: {
  type: Number,
  default: null,
  min: 0,
  max: 28,
},

    // ─── Legacy fields (kept for backward compatibility) ───────────────────
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],

    // ─── Collection architecture fields ────────────────────────────────────

    // Slug of the parent collection — e.g. "face-serum", "rock-soap"
    collectionSlug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Specific variant name within the collection
    // e.g. "Tea Tree + Salicylic Acid", "Lavender", "Papaya Whitening"
    variantLabel: {
      type: String,
      trim: true,
    },

    // Skin types this product is suited for
    // Extends legacy suitableFor with a consistent slug-style array
    skinTypes: {
      type: [String], // e.g. ["oily", "acne-prone", "combination"]
      default: [],
    },

    // Concern slugs this product addresses
    // Used to power /concerns/[slug] pages
    concerns: {
      type: [String], // e.g. ["acne", "open-pores", "pigmentation"]
      default: [],
      index: true,
    },

      // ─── Structured product detail sections ────────────────────────────────
    whyYoullLoveIt: {
      type: [String],
      default: [],
    },
 
    fragranceExp: {
      type: [String], // e.g. ["Cool", "Fresh", "Revitalizing"]
      default: [],
    },
 
    whoIsItFor: {
      type: String,
      default: "",
    },
 
    skinHairConcern: {
      type: String,
      default: "",
    },
 
    expectedResults: {
      type: String,
      default: "",
    },


    // Structured ingredients with per-ingredient benefit copy
    // Richer than flat ingredients[] — used on collection pages
    keyIngredients: [
      {
        name: { type: String, required: true },   // e.g. "Tea Tree Oil"
        benefit: { type: String, required: true }, // e.g. "Controls excess sebum naturally"
        icon: String,                              // optional image/icon URL
      },
    ],

    // Where this product sits in a skincare/haircare routine
    ritualStep: {
      type: String,
      enum: ["cleanse", "exfoliate", "treat", "moisturize", "protect", "style", "other"],
      default: "other",
    },

    // ─── Results / before-after ─────────────────────────────────────────────
    results: [
      {
        image: String,
        title: String,
        text: String,
      },
    ],

    // ─── Size variants ──────────────────────────────────────────────────────
    sizes: [
  {
    size: String,
    unit: { type: String, enum: ["ml", "l", "g", "kg"], default: "ml" },
    quantity: Number,
    price: Number,
    discountPrice: Number,
    stock: { type: Number, default: 0 },
    sku: String,
    // ── new: this variant's actual packed shipping data ──
    weight: Number,    // kg, weight of the full pack as shipped
    length: Number,    // cm
    breadth: Number,   // cm
    height: Number,    // cm
  },
],

    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
  type: Number,
  default: 0,
  index: true,
},

    // ─── Ratings ─────────────────────────────────────────────────────────
    // Average star rating (0-5) and how many reviews it's based on. Shown
    // as a star row on product cards — see components/product-card.tsx.
    // Populated externally (e.g. synced from a reviews platform or
    // computed from a reviews collection); this schema just stores the
    // resulting snapshot so it survives normal .save() calls.
    rating: {
      type: Number,
      default: null,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin-set flag — shows a "Best Seller" ribbon on cards and the product
    // detail page. Independent of HeroProduct.isBestSeller (which only
    // controls the homepage Hero Products carousel badge).
    isBestSeller: {
      type: Boolean,
      default: false,
    },

    // ─── Sale mechanisms ─────────────────────────────────────────────────
    // Three sale sources exist: direct (this product), collection (parent
    // collection's sale), and flash (lib/models/flashsale.ts — time-boxed,
    // checked live and always wins while active; never persisted here).
    //
    // Direct and collection sale are each recorded independently below so
    // that clearing one can fall back to the other. `saleSource`/
    // `salePercentage`/`saleSourceId`/`saleAppliedAt` are the denormalized
    // "whichever of direct/collection is most recently set" snapshot used
    // for display and `discountPrice` — see lib/sale.ts, the single place
    // that writes these. Never set them by hand elsewhere.

    directSalePercentage: { type: Number, default: null, min: 0, max: 100 },
    directSaleAppliedAt: { type: Date, default: null },

    collectionSalePercentage: { type: Number, default: null, min: 0, max: 100 },
    collectionSaleAppliedAt: { type: Date, default: null },
    collectionSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", default: null },

    saleSource: {
      type: String,
      enum: ["none", "direct", "collection"],
      default: "none",
    },
    salePercentage: { type: Number, default: null, min: 0, max: 100 },
    saleSourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    saleAppliedAt: { type: Date, default: null },

  },
  {
    timestamps: true,
    indexes: [
      { isActive: 1, company: 1, category: 1 },
      { createdAt: -1 },
      { slug: 1 },
      { company: 1 },
      { category: 1 },
      { isActive: 1, createdAt: -1 },
      // New indexes for collection architecture
      { collectionSlug: 1 },
      { concerns: 1 },
      { isActive: 1, collectionSlug: 1 },
      { collectionSaleId: 1 },
    ],
  },

)

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema)