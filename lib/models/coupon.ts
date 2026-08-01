// lib/models/coupon.ts
import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ["percentage", "flat"], required: true },
    discountValue: { type: Number, required: true, min: 0 },   // 20 (%) or 100 (₹)

    maxUses: { type: Number, required: true, min: 1 },          // total uses allowed across ALL customers
    usedCount: { type: Number, default: 0 },                    // incremented each time it's successfully applied at checkout

    // Optional date window — leave both null for "always valid until maxUses runs out"
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    minOrderValue: { type: Number, default: 0 },                // optional minimum cart total to use this code

    isActive: { type: Boolean, default: true },                 // admin kill-switch
  },
  { timestamps: true }
)

couponSchema.index({ code: 1, isActive: 1 })

// Helper used both at validation-time and redemption-time
couponSchema.methods.isExhausted = function (this: any) {
  return this.usedCount >= this.maxUses
}

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema)