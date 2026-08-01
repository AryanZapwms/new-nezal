// lib/models/concern.ts
import mongoose from "mongoose"

const concernSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },             // "Acne & Oil Control"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    headline: { type: String, default: "" },              // hero H1 on /concerns/[slug]
    subheadline: { type: String, default: "" },           // hero subtext
    description: { type: String, default: "" },           // longer paragraph
    heroImage: { type: String, default: "" },              // card image + page hero
    color: { type: String, default: "#F3F5EF" },            // background tint

    // Admin-curated product list for this concern (explicit, ordered)
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    sortOrder: { type: Number, default: 0 },               // controls homepage card order
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

concernSchema.index({ isActive: 1, sortOrder: 1 })

export const Concern = mongoose.models.Concern || mongoose.model("Concern", concernSchema)