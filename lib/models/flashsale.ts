// lib/models/flashsale.ts
import mongoose from "mongoose"

const flashSaleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },              // "Diwali Flash Sale"
    discountPercent: { type: Number, required: true, min: 1, max: 90 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    // Products included in this sale (their displayed price gets the
    // discountPercent applied while the sale is active)
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    isActive: { type: Boolean, default: true },           // admin kill-switch, independent of dates
  },
  { timestamps: true }
)

flashSaleSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 })

export const FlashSale = mongoose.models.FlashSale || mongoose.model("FlashSale", flashSaleSchema)