// lib/models/whatsapp-message-log.ts
//
// One row per WhatsApp template send attempt — the cart reminder
// (app/api/cron/abandoned-cart-whatsapp) and the order confirmation
// (lib/whatsapp-order.ts) — recording what was sent, to whom, and what
// ScaleChat said back. This is the place to look when a customer says they
// did (or didn't) get a message. Skips are not logged here: a cart skipped
// for an opt-out would be skipped again on every run.
import mongoose from "mongoose"

const whatsappMessageLogSchema = new mongoose.Schema(
  {
    // Whichever the message was about; the other stays null.
    cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    // As sent to ScaleChat: country code + number, digits only.
    phone: { type: String, required: true },
    templateName: String,
    variables: [String],
    mode: { type: String, enum: ["test", "live"] },
    status: { type: String, enum: ["sent", "failed"], required: true },
    // Which try this was (1-based). Only cart reminders are ever retried —
    // see Cart.whatsappReminderAttempts.
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
