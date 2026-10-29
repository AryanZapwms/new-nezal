// /lib/models/user.ts
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    // Placeholder account created by a review import (see lib/imported-users.ts).
    isImported: { type: Boolean, default: false, index: true },
    // Where the account came from: our own sign-up (email or Google), or a
    // Shiprocket Fastrr checkout (lib/fastrr-customers.ts). It never changes —
    // a Fastrr customer who later signs up stays "fastrr", and isVerified says
    // whether they've claimed the account. Users created before this field
    // don't have it, so filter with { source: { $ne: "fastrr" } }.
    source: { type: String, enum: ["signup", "fastrr"], default: "signup" },
    // No sign-up or checkout flow asks for marketing consent yet.
    marketingConsent: { type: Boolean, default: false },
    resetOtpHash: { type: String },
    resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);