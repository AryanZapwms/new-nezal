// lib/models/ritual.ts
import mongoose from "mongoose"

const ritualStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },     // 1, 2, 3...
    title: { type: String, required: true },           // e.g. "Cleanse"
    description: { type: String, default: "" },        // e.g. "Start with a gentle cleanse to remove impurities"
    // Optional: link this step to a specific product within the ritual
    // (e.g. Step 1 "Cleanse" -> the specific face wash product)
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  },
  { _id: false }
)

const ritualSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },             // "Clear Skin Ritual"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    tagline: { type: String, default: "" },             // short hook line for cards
    description: { type: String, default: "" },         // longer intro paragraph on the ritual page
    heroImage: { type: String, default: "" },            // card image + page hero
    color: { type: String, default: "#F3F5EF" },          // background tint for hero section

    // Ordered routine steps (Cleanse -> Treat -> Moisturize -> Protect, etc.)
    // Optional — not every ritual needs a step-by-step routine.
    steps: { type: [ritualStepSchema], default: [] },

    // "Ideal For" bullet list — audience/skin-type/occasion targeting
    // e.g. ["Oily skin", "Acne-prone skin", "Teenagers & young professionals"]
    idealFor: { type: [String], default: [] },

    // Curated product list for this ritual (admin-selected, ordered)
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    sortOrder: { type: Number, default: 0 },             // controls homepage card order
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ritualSchema.index({ isActive: 1, sortOrder: 1 })

export const Ritual = mongoose.models.Ritual || mongoose.model("Ritual", ritualSchema)