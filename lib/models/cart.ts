// lib/models/cart.ts
//
// Server-side mirror of the client Zustand cart (lib/store/cart-store.ts).
// One "active" cart per identity (logged-in user OR guest cart token).
// This is a persistence/analytics mirror, not the source of truth for the
// shopping UI — see lib/store/cart-sync.ts for how it's kept up to date.
import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },

  // Size/variant the customer selected — cart-specific, so it's embedded
  // rather than referenced (mirrors the `Size` shape in cart-store.ts).
  selectedSize: {
    size: String,
    unit: { type: String, enum: ["ml", "l", "g", "kg"] },
    quantity: Number,
    price: Number,
    discountPrice: Number,
    stock: Number,
    sku: String,
  },

  // Point-in-time flash sale snapshot, same shape as CartItem.flashSale.
  flashSale: {
    saleId: String,
    saleName: String,
    discountPercent: Number,
    endsAt: Date,
  },

  ritual: {
    slug: String,
    name: String,
  },

  addedAt: { type: Date, default: Date.now },
})

const cartSchema = new mongoose.Schema(
  {
    // Exactly one of user / guestToken is set.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guestToken: { type: String, default: null },

    // "abandoned" is not set by any code path yet — the admin view derives
    // abandonment from lastActivityAt (see lib/cart-server.ts). The value
    // exists so a future cron can physically flip carts to it. "merged" is
    // the guest cart's terminal state after app/api/cart/merge/route.ts.
    status: {
      type: String,
      enum: ["active", "abandoned", "converted", "merged"],
      default: "active",
    },

    items: [cartItemSchema],

    lastActivityAt: { type: Date, default: Date.now },

    convertedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    convertedAt: { type: Date, default: null },

    // ── WhatsApp abandoned-cart reminders (app/api/cron/abandoned-cart-whatsapp) ──
    // Per-cart: fine here, since a reminder is tied to one specific
    // abandonment instance, not the phone number in general.
    whatsappReminderSentAt: { type: Date, default: null },

    // Phone confirmed (and consent given) at checkout, before an order
    // exists — separate from any phone on the User record, and from the
    // eventual Order's shipping phone. See components/checkout-form.tsx and
    // app/api/cart/route.ts for how this gets set. Opt-out is deliberately
    // NOT here — see lib/models/whatsapp-opt-out.ts for why.
    guestPhone: { type: String, default: null },

    // Explicit opt-in captured at checkout — defaults false and is never
    // backfilled for carts/users that existed before this checkbox did.
    // Required by app/api/cron/abandoned-cart-whatsapp before it will
    // message anyone; a phone number alone is not consent.
    whatsappConsent: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// At most one ACTIVE cart per user / per guest token. Carts that have
// converted/merged/abandoned are left alone as history, so this only
// constrains the "active" set — that's what getOrCreateActiveCart in
// lib/cart-server.ts relies on to avoid creating duplicates.
cartSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "active", user: { $type: "objectId" } } },
)
cartSchema.index(
  { guestToken: 1 },
  { unique: true, partialFilterExpression: { status: "active", guestToken: { $type: "string" } } },
)

// Backs both the admin abandoned-cart list (status + recency sort) and any
// future cleanup/cron job.
cartSchema.index({ status: 1, lastActivityAt: -1 })

// Backs the WhatsApp reminder cron's query (active, consented, not yet
// reminded, ordered by staleness). Opt-out is checked separately against
// lib/models/whatsapp-opt-out.ts, not against this collection, so it's not
// part of this index.
cartSchema.index(
  { status: 1, whatsappConsent: 1, whatsappReminderSentAt: 1, lastActivityAt: 1 },
  { partialFilterExpression: { status: "active" } },
)

export const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema)
