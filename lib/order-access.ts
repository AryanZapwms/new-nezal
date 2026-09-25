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
import mongoose from "mongoose"

type OrderOwner = { _id: mongoose.Types.ObjectId | string; email: string }

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
