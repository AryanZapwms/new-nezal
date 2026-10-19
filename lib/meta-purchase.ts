// lib/meta-purchase.ts
//
// What the two order confirmation pages give the browser's Meta Purchase
// event, and when they give it at all:
//   - /order-success/[id]: COD, Razorpay and CCAvenue orders from our own
//     checkout, through that route's layout, for guests and signed-in
//     customers alike (the order API it used before needs a session)
//   - /checkout/success: Shiprocket checkout orders
// Only { eventId, value, contents } reaches the browser, never customer
// details. eventId is the order's _id, the same event_id the server-side
// Purchase sends (lib/meta-capi.ts), so Meta keeps one of the two.

import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import type { PixelContent } from "@/lib/facebook-pixel"

// Revisiting an old confirmation page must not report the sale again, and
// Meta only deduplicates within 48 hours, so Purchase is only sent for orders
// placed in the last 24 hours.
export const PURCHASE_TRACKING_WINDOW_MS = 24 * 60 * 60 * 1000

export interface PurchaseTrackingData {
  eventId: string
  value: number
  contents: PixelContent[]
}

export function isWithinPurchaseTrackingWindow(order: { createdAt?: Date | string | null }, now = Date.now()): boolean {
  const placedAt = order.createdAt ? new Date(order.createdAt).getTime() : NaN
  return Number.isFinite(placedAt) && now - placedAt < PURCHASE_TRACKING_WINDOW_MS
}

/**
 * A completed purchase from our own checkout: COD, or paid, and not failed or
 * cancelled. Shiprocket checkout orders are confirmed by
 * isCheckoutOrderConfirmed (lib/shiprocket-checkout-order.ts) instead and
 * tracked on /checkout/success, so they never count here.
 */
export function isOwnCheckoutPurchase(order: any): boolean {
  if (order.paymentMethod === "shiprocket_checkout") return false
  if (order.orderStatus === "cancelled" || order.paymentStatus === "failed") return false
  return order.paymentMethod === "cod" || order.paymentStatus === "completed"
}

/** Event id, total and order lines; works with items.product populated or not. */
export function purchaseTrackingData(order: any): PurchaseTrackingData {
  return {
    eventId: order._id.toString(),
    value: order.totalAmount ?? 0,
    contents: (order.items ?? [])
      .filter((item: any) => item.product)
      .map((item: any) => ({
        id: (item.product._id ?? item.product).toString(),
        quantity: item.quantity ?? 1,
        item_price: item.price ?? 0,
      })),
  }
}

/** Tracking data for /order-success/[id], or null when that page must not send Purchase. */
export async function loadOrderSuccessTrackingData(
  orderId: string,
  now = Date.now()
): Promise<PurchaseTrackingData | null> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null

  await connectDB()
  const order = await Order.findById(orderId)
    .select("totalAmount items.product items.quantity items.price paymentMethod paymentStatus orderStatus createdAt")
    .lean()

  if (!order || !isOwnCheckoutPurchase(order) || !isWithinPurchaseTrackingWindow(order as any, now)) return null
  return purchaseTrackingData(order)
}
