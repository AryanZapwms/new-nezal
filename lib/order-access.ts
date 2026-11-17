// lib/order-access.ts
//
// Single definition of "which orders does this signed-in customer own",
// shared by the customer-facing order routes (GET /api/orders,
// GET /api/orders/[id], POST /api/orders/[id]/cancel).
//
// An order belongs to a user when either:
//   1. order.user is that user's _id (orders placed on our own checkout
//      while logged in), or
//   2. order.user is unset AND order.guestEmail matches the user's email.
//      Shiprocket Custom Checkout orders are created server-to-server by
//      app/api/shiprocket/order-webhook/[secret]/route.ts with no session
//      attached, so they only carry the email the customer typed into the
//      Shiprocket widget. Login requires a verified email (see the
//      isVerified check in app/api/auth/[...nextauth]/route.ts), so a
//      matching session email is proof of ownership — the same inbox
//      already received that order's confirmation email.
//
// Those routes also hide CUSTOMER_HIDDEN_ORDER_FIELDS from the customer.
import mongoose from "mongoose"

type OrderOwner = { _id: mongoose.Types.ObjectId | string; email: string }

// Internal order fields a customer must never receive: admin review notes
// (they can hold addresses and the editing admin's email), the review flag,
// and raw Shiprocket error responses. Admin routes still return them.
export const CUSTOMER_HIDDEN_ORDER_FIELDS = ["reviewNotes", "needsReview", "shiprocketError"] as const

type CustomerHiddenOrderField = (typeof CUSTOMER_HIDDEN_ORDER_FIELDS)[number]

/** Mongoose select() that leaves them out, for queries returned as-is. */
export const CUSTOMER_ORDER_PROJECTION = CUSTOMER_HIDDEN_ORDER_FIELDS.map((field) => `-${field}`).join(" ")

/** A copy of an already-loaded order without them, for a response that can't use the projection. */
export function withoutInternalOrderFields<T extends object>(order: T): Omit<T, CustomerHiddenOrderField> {
  const copy = { ...(order as Record<string, unknown>) }
  for (const field of CUSTOMER_HIDDEN_ORDER_FIELDS) delete copy[field]
  return copy as Omit<T, CustomerHiddenOrderField>
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

/** Mongo filter matching every order `user` owns. */
export function ownedOrdersFilter(user: OrderOwner) {
  return {
    $or: [
      { user: user._id },
      {
        user: null,
        guestEmail: { $regex: `^\\s*${escapeRegex(normalizeEmail(user.email))}\\s*$`, $options: "i" },
      },
    ],
  }
}

/** In-memory equivalent of ownedOrdersFilter for an already-loaded order. */
export function isOrderOwnedBy(
  order: { user?: unknown; guestEmail?: string | null },
  user: OrderOwner
): boolean {
  if (order.user) {
    const orderUserId = (order.user as any)?._id ?? order.user
    return String(orderUserId) === String(user._id)
  }
  const guestEmail = normalizeEmail(order.guestEmail)
  return guestEmail !== "" && guestEmail === normalizeEmail(user.email)
}
