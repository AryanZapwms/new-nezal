import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { finalizeOrderCancellation } from "@/lib/orderCancellation";

/**
 * Shiprocket sends webhook POST requests whenever a shipment status changes.
 * Docs: https://apidocs.shiprocket.in/#webhooks
 *
 * Setup (do this in Shiprocket dashboard):
 *   Settings → API → Configure → Webhooks
 *   URL: https://yourdomain.com/api/webhooks/shipment-updates   ← must match this route's actual path
 *   Add a custom header matching SHIPROCKET_WEBHOOK_SECRET below.
 *   IMPORTANT: verify the exact header name Shiprocket sends on your account's
 *   webhook config screen — log req.headers once in test mode to confirm
 *   before relying on this in production.
 */

const STATUS_MAP: Record<string, string> = {
  "NEW": "processing",
  "PICKUP SCHEDULED": "processing",
  "PICKED UP": "shipped",
  "IN TRANSIT": "shipped",
  "OUT FOR DELIVERY": "out_for_delivery",
  "DELIVERED": "delivered",
  "RTO INITIATED": "rto_initiated",
  "RTO DELIVERED": "rto_delivered",
  "CANCELLED": "cancelled",
  "CANCELED": "cancelled",
};

const ORDER_STATUS_SYNC: Record<string, string> = {
  shipped: "shipped",
  out_for_delivery: "shipped",
  delivered: "delivered",
};

export async function POST(req: NextRequest) {
  const incomingSecret =
    req.headers.get("x-api-key") ?? req.headers.get("x-webhook-secret");

  if (incomingSecret !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
    console.warn("Shiprocket webhook: invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("Shiprocket webhook received:", JSON.stringify(body));

  await connectDB();

  const orderId = body.order_id;
  const awb = body.awb;
  const rawStatus =
    (body.current_status || body.shipment_status || "").toString().toUpperCase();

  if (!orderId && !awb) {
    return NextResponse.json({ error: "Missing order_id and awb in payload" }, { status: 400 });
  }

  const resolvedOrder = orderId
    ? await Order.findById(orderId).catch(() => null) ?? await Order.findOne({ awbCode: awb })
    : await Order.findOne({ awbCode: awb });

  if (!resolvedOrder) {
    console.warn(`Shiprocket webhook: order not found (order_id=${orderId}, awb=${awb})`);
    return NextResponse.json({ received: true, matched: false });
  }

  const mappedShippingStatus = STATUS_MAP[rawStatus] ?? null;

  // ── Cancellation: route through the shared cancel/refund/email flow ──
  if (mappedShippingStatus === "cancelled" && resolvedOrder.orderStatus !== "cancelled") {
    const alreadyHandledByUs =
      resolvedOrder.cancellation &&
      ["approved", "completed"].includes(resolvedOrder.cancellation.status)

    if (!alreadyHandledByUs) {
      resolvedOrder.cancellation = {
        status: "requested",
        type: "cancel",
        reason: resolvedOrder.cancellation?.reason || null,
        note: resolvedOrder.cancellation?.note || null,
        requestedAt: resolvedOrder.cancellation?.requestedAt || new Date(),
        processedAt: null,
        adminNote: resolvedOrder.cancellation?.adminNote || null,
      }
      await finalizeOrderCancellation(resolvedOrder, {
        reason: "cancelled directly in Shiprocket",
        skipShiprocketCancel: true, // already cancelled there — don't call the cancel API again
      })
      console.log(`Order ${resolvedOrder._id} cancellation synced from Shiprocket webhook`)
    }
    return NextResponse.json({ received: true, matched: true, synced: "cancellation" })
  }

  // ── Everything else: simple field sync, as before ──
  const update: Record<string, any> = {};

  if (mappedShippingStatus) {
    update.shippingStatus = mappedShippingStatus;
    const syncedOrderStatus = ORDER_STATUS_SYNC[mappedShippingStatus];
    if (syncedOrderStatus) update.orderStatus = syncedOrderStatus;
  }

  if (awb && !resolvedOrder.awbCode) {
    update.awbCode = awb;
    update.trackingUrl = `https://shiprocket.co/tracking/${awb}`;
  }

  if (body.courier_name && !resolvedOrder.courierName) {
    update.courierName = body.courier_name;
  }

  if (Object.keys(update).length > 0) {
    await Order.findByIdAndUpdate(resolvedOrder._id, update);
    console.log(`Order ${resolvedOrder._id} updated:`, JSON.stringify(update));
  }

  return NextResponse.json({ received: true, matched: true });
}