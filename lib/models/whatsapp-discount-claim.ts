// lib/models/whatsapp-discount-claim.ts
//
// Tracks which phone numbers have already been issued a one-time WhatsApp
// discount via the cart-page popup (components/whatsapp-discount-popup.tsx),
// so the same phone can't claim a second one. Deliberately separate from
// Cart.whatsappConsent (lib/models/cart.ts): consent can be given without
// ever claiming a discount (e.g. via the checkout-form.tsx consent
// checkbox, which issues nothing), so consent alone isn't the right signal
// for "already got a coupon." Phone-keyed for the same reason
// lib/models/whatsapp-opt-out.ts is: survives across carts/sessions, not
// tied to any one cart's lifecycle.
import mongoose from "mongoose"

const whatsappDiscountClaimSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  couponCode: { type: String, required: true },
  claimedAt: { type: Date, default: Date.now },
})

export const WhatsAppDiscountClaim =
  mongoose.models.WhatsAppDiscountClaim ||
  mongoose.model("WhatsAppDiscountClaim", whatsappDiscountClaimSchema)
