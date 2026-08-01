// lib/models/homeBanner.ts
import mongoose from "mongoose"

const homeBannerSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },

    // "product" | "collection" | "custom" | "none"
    linkType: {
      type: String,
      enum: ["product", "collection", "custom", "none"],
      default: "none",
    },
    // Final resolved href the banner should navigate to, e.g.
    // "/shop/nezal/product/64f...", "/collections/hair-serum", "/shop"
    link: { type: String, default: "" },
    // Human-readable label shown only in the admin list (e.g. product name)
    linkLabel: { type: String, default: "" },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    indexes: [{ isActive: 1, order: 1 }],
  }
)

export const HomeBanner =
  mongoose.models.HomeBanner || mongoose.model("HomeBanner", homeBannerSchema)