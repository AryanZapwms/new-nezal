// lib/models/payment-settings.ts
import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    enableCOD: { 
      type: Boolean,
      default: true,
    },
    enableRazorpay: {
      type: Boolean,
      default: false, // disabled by default — kept available to re-enable later
    },
    enableCCAvenue: {
      type: Boolean,
      default: true,
    },
    minCODAmount: {
      type: Number,
      default: 0, // Minimum order amount for COD
    },
    maxCODAmount: {
      type: Number,
      default: 100000, // Maximum order amount for COD
    },
     // ── Free shipping ──────────────────────────────
    freeShippingEnabled: {
      type: Boolean,
      default: false,
    },
    freeShippingThreshold: {
      type: Number,
      default: 0, // order subtotal (after discount, before shipping) must be >= this
    },
    codFeeEnabled: {
  type: Boolean,
  default: false,
},
codFeeType: {
  type: String,
  enum: ["flat", "percentage"],
  default: "flat",
},
codFeeValue: {
  type: Number,
  default: 0, // flat: ₹ amount. percentage: % of order subtotal.
},
codFeeMin: {
  type: Number,
  default: 0, // floor for percentage-based fee, e.g. "2%, min ₹40"
},
useRealTimeCodCharge: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PaymentSettings =
  mongoose.models.PaymentSettings ||
  mongoose.model("PaymentSettings", paymentSettingsSchema);