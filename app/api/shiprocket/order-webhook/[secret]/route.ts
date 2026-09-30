// app/api/shiprocket/order-webhook/[secret]/route.ts
//
// Shiprocket calls this when a customer completes checkout on their Custom
// Checkout widget. All create/update logic lives in
// lib/shiprocket-checkout-order.ts, shared with the /checkout/success
// fallback that pulls the order when this webhook never arrives — so a late
// or repeated delivery here can't create a duplicate order.
//
// Auth: Shiprocket's Order Webhook docs only show Content-Type: application/
// json — no custom header or HMAC field for this particular webhook. The
// secret lives in the URL path instead, checked against
// SHIPROCKET_ORDER_WEBHOOK_SECRET (env only — never hardcode it here).
//
// Register this URL with Shiprocket as:
//   https://nezalherbocare.com/api/shiprocket/order-webhook/<value of SHIPROCKET_ORDER_WEBHOOK_SECRET>

import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  upsertShiprocketCheckoutOrder,
  classifyCheckoutPayment,
  ShiprocketCheckoutPayloadError,
} from "@/lib/shiprocket-checkout-order";

// Constant-time compare so the secret can't be probed byte by byte.
function secretMatches(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  if (!secretMatches(secret, process.env.SHIPROCKET_ORDER_WEBHOOK_SECRET)) {
    console.warn(
      `[shiprocket-order-webhook] Rejected hit — invalid or missing secret (envSecretSet=${Boolean(process.env.SHIPROCKET_ORDER_WEBHOOK_SECRET)}) ip=${request.headers.get("x-forwarded-for") ?? "?"}`
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    console.warn("[shiprocket-order-webhook] Body was not valid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Every authenticated hit: identifiers, payload keys and payment fields
  // only — no customer PII — so a delivery can be matched to a ?oid= from
  // /checkout/success.
  const payment = classifyCheckoutPayment(payload);
  console.log(
    `[shiprocket-order-webhook] HIT order_id=${payload?.order_id} platform_order_id=${payload?.platform_order_id} fastrr_order_id=${payload?.fastrr_order_id} payment_status=${payload?.payment_status} payment_type=${payload?.payment_type} classified=${payment.state} keys=${Object.keys(payload ?? {}).join(",")}`
  );

  try {
    const { order, created, state } = await upsertShiprocketCheckoutOrder(payload, "webhook");
    return NextResponse.json({
      ok: true,
      duplicate: !created,
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentState: state,
      needsReview: order.needsReview,
    });
  } catch (error) {
    if (error instanceof ShiprocketCheckoutPayloadError) {
      console.error("[shiprocket-order-webhook] Payload missing both order_id and fastrr_order_id — cannot process");
      return NextResponse.json({ error: "Missing order identifier" }, { status: 400 });
    }
    // Never make Shiprocket retry-storm on our internal bugs — still 200, but
    // the full payload is logged so a paid order is recoverable by hand.
    console.error(
      "[shiprocket-order-webhook] Unhandled error processing webhook — payload:",
      JSON.stringify(payload),
      error
    );
    return NextResponse.json({ ok: true, error: "internal_error_logged" });
  }
}
