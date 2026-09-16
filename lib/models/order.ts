// lib/models/order.ts
import mongoose from "mongoose"

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    guestEmail: String,
    guestName:  String,
    guestPhone: String,

    items: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price:    Number,
        gstPercent:   { type: Number, default: 0 },  
        taxableValue: { type: Number, default: 0 },  
        gstAmount:    { type: Number, default: 0 },  
        selectedSize: {
          size:         String,
          unit:         { type: String, enum: ["ml", "l", "g", "kg"] },
          quantity:     Number,
          price:        Number,
          discountPrice: Number,
        },
      },
    ],

    totalAmount: { type: Number, required: true },
    shippingAmount: { type: Number, default: 0 }, 
     shippingBreakdown: {
      baseCourierRate:  { type: Number, default: 0 }, // Shiprocket's quoted cheapest-courier rate
      smartOrderFee:    { type: Number, default: 0 }, // ₹5 Notify/WhatsApp fee
      rateDriftBuffer:  { type: Number, default: 0 }, // buffer for courier-selection drift
      courierNameQuoted: { type: String, default: null }, // which courier the quote was based on
    },
    codCharge: { type: Number, default: 0 },
    totalTaxableValue: { type: Number, default: 0 },  // ← add
    totalGstAmount:    { type: Number, default: 0 },  // ← add

    abandonedEmailSentAt: { type: Date, default: null },

    // Snapshot of which server-side Cart (lib/models/cart.ts) this order came
    // from, captured at order-creation time. Read-only fetches would work for
    // COD/Razorpay (same-origin requests, session/guest cookies present) but
    // CCAvenue's success callback is a cross-site POST redirect where a
    // SameSite=Lax cookie may not travel — storing the id here lets the
    // conversion step (lib/cart-server.ts markCartConverted) skip re-resolving
    // identity entirely and just update this cart directly.
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", default: null },

    shippingAddress: {
      name:    String,
      phone:   String,
      address: String,
      street:  String,
      city:    String,
      state:   String,
      pincode: String,
      zipCode: String,
      country: String,
    },

    paymentStatus: {
      type:    String,
      enum:    ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type:    String,
      enum:    ["cod", "razorpay","ccavenue", "shiprocket_checkout"],
      default: "razorpay",
    },
    ccavenueTrackingId: { type: String, default: null },
ccavenueBankRefNo: { type: String, default: null },
    orderStatus: {
      type:    String,
      enum:    ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    razorpayOrderId:  String,
    razorpayPaymentId: String,

    // ── Shiprocket fields (all optional) ──────────────────
    // Numeric Shiprocket order id — for orders WE push to Shiprocket's
    // logistics/adhoc Order API (lib/shiprocket.ts createShiprocketOrder),
    // this is the id Shiprocket returns. For an order that originated FROM
    // Shiprocket's own Custom Checkout widget (see
    // app/api/shiprocket/order-webhook/[secret]/route.ts), this instead
    // stores their numeric fastrr_order_id (the CHECKOUT order id) — see
    // shiprocketLogisticsOrderId below for where THAT order type's actual
    // logistics/shipment order id goes instead, since the two ids can't
    // share this one field on the same order.
    shiprocketOrderId:   { type: Number, default: null },
    // Shiprocket Custom Checkout's own STRING order id (order_id /
    // platform_order_id in their webhook payload) — kept separate from the
    // numeric shiprocketOrderId above rather than coercing it into that
    // field, since it identifies a different Shiprocket concept (the
    // checkout/cart session, not a logistics order).
    shiprocketPlatformOrderId: { type: String, default: null },
    // The numeric LOGISTICS/shipment order id (lib/shiprocket.ts
    // createShiprocketOrder → data.order_id) for a shiprocket_checkout
    // order specifically — needed because shiprocketOrderId on these orders
    // already holds fastrr_order_id. COD/Razorpay/CCAvenue orders don't use
    // this field; they still get their one-and-only Shiprocket order id in
    // shiprocketOrderId as before.
    shiprocketLogisticsOrderId: { type: Number, default: null },
    shiprocketShipmentId: { type: Number, default: null },
    awbCode:             { type: String, default: null },
    courierName:         { type: String, default: null },
    trackingUrl:         { type: String, default: null },
    // Set when Shiprocket order creation fails outright (bad phone, API
    // error, etc.) so failures are visible/queryable in admin instead of
    // only living in server logs. Cleared back to null on a successful
    // (re)attempt.
    shiprocketError: { type: String, default: null },
    shippingStatus: {
      type: String,
      enum: [
        "not_shipped",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "rto_initiated",
        "rto_delivered",
        "cancelled",
        "needs_attention",
      ],
      default: "not_shipped",
    },

    // Set when an inbound order (currently: the Shiprocket Custom Checkout
    // webhook) couldn't be fully reconciled automatically — e.g. a cart
    // line item's variant_id didn't resolve to a real product/size, or
    // stock went negative because the sale already happened elsewhere
    // before we heard about it. The order is still created/charged as best
    // as it could be; reviewNotes explains exactly what needs a human.
    needsReview: { type: Boolean, default: false },
    reviewNotes: { type: [String], default: [] },

    // ── Coupon ────────────────────────────────────────────
    couponCode:     { type: String, default: null },
    discountAmount: { type: Number, default: 0    },
    // Set when a coupon was requested at checkout but couldn't be honored
    // (or couldn't be re-verified) after payment was already captured —
    // e.g. Razorpay's verify-payment route discovering the coupon went
    // stale between capture and verification. couponCode/discountAmount
    // stay null/0 in that case (the discount wasn't actually applied to
    // this order's bookkeeping), and this field holds a human-readable
    // explanation for admin review — see app/admin/orders/page.tsx.
    couponDiscrepancy: { type: String, default: null },
    cancellation: {
  status: {
    type: String,
    enum: ["none", "requested", "approved", "rejected", "completed"],
    default: "none",
  },
  type: { type: String, enum: ["cancel", "return", null], default: null },
  reason: { type: String, default: null },
  note: { type: String, default: null },
  requestedAt: { type: Date, default: null },
  processedAt: { type: Date, default: null },
  adminNote: { type: String, default: null },
  refund: {
    status: {
      type: String,
      enum: ["none", "not_applicable", "initiated", "success", "failed"],
      default: "none",
    },
    refundRefNo: { type: String, default: null },   // our own unique ref sent to CCAvenue
    amount: { type: Number, default: null },
    initiatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null }, // for debugging, remove once stable
  },
},
  },
  { timestamps: true }   // ← second argument to mongoose.Schema, not a field

)


const Order = mongoose.models.Order as mongoose.Model<typeof orderSchema> ||
  mongoose.model("Order", orderSchema);

export { Order };
