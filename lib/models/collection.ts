// lib/models/collection.ts
import mongoose from "mongoose"

const collectionSchema = new mongoose.Schema(
  {
    // ─── Identity ────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    tagline: {
      type: String,
      trim: true,
    },

    // ─── Hero section ────────────────────────────────────────────────────────
    heroImage: String,
    heroHeadline: String,
    heroSubheadline: String,

    // ─── Story section ───────────────────────────────────────────────────────
    storyText: String,

    // ─── Key ingredients ─────────────────────────────────────────────────────
    keyIngredients: [
      {
        name: { type: String, required: true },
        benefit: { type: String, required: true },
        icon: String,
      },
    ],

    // ─── Concerns ────────────────────────────────────────────────────────────
    concerns: {
      type: [String],
      default: [],
    },

    // ─── Ritual strip ────────────────────────────────────────────────────────
    ritualSteps: [
      {
        step: { type: Number, required: true },
        label: { type: String, required: true },
        description: String,
        linkedCollectionSlug: String,
      },
    ],

    // ─── Cross-sell ──────────────────────────────────────────────────────────
    relatedCollections: {
      type: [String],
      default: [],
    },

    // ─── FAQ ─────────────────────────────────────────────────────────────────
    faq: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],

    // ─── SEO ─────────────────────────────────────────────────────────────────
    seoTitle: String,
    seoDescription: String,
    metaKeywords: [String],

    // ─── Categorisation ──────────────────────────────────────────────────────
    navCategory: {
      type: String,
      enum: ["face-care", "body-care", "hair-care", "gift-kits"],
      required: true,
    },

    // ─── Sub-category ─────────────────────────────────────────────────────────
    // Used for grouping within a navCategory on the collections index page
    // e.g. body-care collections split into "soaps" and "body-care" subsections
    subCategory: {
  type: String,
  enum: ["face-care", "soaps", "body-care", "hair-care", "gift-kits", "bath-shower", "massage-oil"],
  required: true,
},

    // Display order within its navCategory (for mega menu ordering)
    sortOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { slug: 1 },
      { navCategory: 1 },
      { subCategory: 1 },
      { isActive: 1, navCategory: 1 },
      { isActive: 1, subCategory: 1 },
      { isActive: 1, sortOrder: 1 },
      { concerns: 1 },
    ],
  },
)

export const Collection =
  mongoose.models.Collection || mongoose.model("Collection", collectionSchema)