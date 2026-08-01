import mongoose from "mongoose"

const heroProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // Shown as a "Best Seller" badge on the homepage card
    isBestSeller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

heroProductSchema.index({ isActive: 1, sortOrder: 1 });

export const HeroProduct =
  mongoose.models.HeroProduct || mongoose.model("HeroProduct", heroProductSchema);