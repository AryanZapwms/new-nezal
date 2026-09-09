// lib/models/whatsapp-opt-out.ts
//
// Phone-keyed WhatsApp marketing opt-outs. Deliberately NOT stored on Cart
// or User: opt-out lived on Cart.whatsappOptOut originally, but that broke
// the moment a cart converted and a fresh one started (a new Cart begins
// with whatsappOptOut: false again, since opt-out is really a property of
// the phone number, not of any one cart). Checked by
// app/api/cron/abandoned-cart-whatsapp before sending; written by
// app/api/webhooks/whatsapp on a STOP/unsubscribe reply.
import mongoose from "mongoose"

const whatsappOptOutSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  optedOutAt: { type: Date, default: Date.now },
})

export const WhatsAppOptOut =
  mongoose.models.WhatsAppOptOut || mongoose.model("WhatsAppOptOut", whatsappOptOutSchema)
