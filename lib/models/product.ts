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
    sku: String,

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
        unit: {
          type: String,
          enum: ["ml", "l", "g", "kg"],
          default: "ml",
        },
        quantity: Number,
        price: Number,
        discountPrice: Number,
        stock: {
          type: Number,
          default: 0,
        },
        sku: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
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
    ],
  },
)

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema)