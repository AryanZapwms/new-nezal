// lib/models/whatsapp-message-log.ts
//
// One row per WhatsApp send attempt made by
// app/api/cron/abandoned-cart-whatsapp — what was sent, to whom, and what
// ScaleChat said back. This is the place to look when a customer says they
// did (or didn't) get a reminder. Skipped carts are not logged here: a cart
// skipped for an opt-out would be skipped again on every run.
import mongoose from "mongoose"

const whatsappMessageLogSchema = new mongoose.Schema(
  {
    cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", default: null },
    // As sent to ScaleChat: country code + number, digits only.
    phone: { type: String, required: true },
    templateName: String,
    variables: [String],
    mode: { type: String, enum: ["test", "live"] },
    status: { type: String, enum: ["sent", "failed"], required: true },
    // Which try this was for the cart (1-based) — see
    // Cart.whatsappReminderAttempts.
    attempt: Number,
    error: { type: String, default: null },
    // ScaleChat's response body on success, kept whole for debugging.
    response: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

whatsappMessageLogSchema.index({ createdAt: -1 })
whatsappMessageLogSchema.index({ phone: 1, createdAt: -1 })

export const WhatsAppMessageLog =
  mongoose.models.WhatsAppMessageLog || mongoose.model("WhatsAppMessageLog", whatsappMessageLogSchema)
