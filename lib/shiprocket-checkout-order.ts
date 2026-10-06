// lib/shiprocket-checkout-order.ts
//
// The ONE place a Shiprocket Custom Checkout (Fastrr) order is created or
// updated in our DB. Two callers feed it the same payload shape:
//   - app/api/shiprocket/order-webhook/[secret]/route.ts — Shiprocket pushes
//     the order to us.
//   - app/checkout/success/page.tsx — the customer landed on the success
//     redirect but no webhook has arrived; we pull the order from
//     Shiprocket's Checkout API (fetchShiprocketCheckoutOrder below).
// Whichever arrives first creates the order; the other finds it. Creation is
// an atomic upsert keyed on the Shiprocket order id (backed by the partial
// unique indexes in lib/models/order.ts), and post-order side effects (stock,
// logistics shipment, emails) run behind a one-time atomic claim
// (checkoutFinalizedAt), so a late or repeated webhook can't duplicate the
// order or double-decrement stock.

import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { User } from "@/lib/models/user";
import { getActiveFlashSaleMap } from "@/lib/flashSale";
import { resolveCurrentPrice } from "@/lib/pricing";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import { orderSummaryFields } from "@/lib/email-templates";
import { notifyProductWebhook } from "@/lib/shiprocket-webhooks";
import { createShiprocketOrderForOrder } from "@/lib/shiprocket";
import { SHIPROCKET_VARIANT_ID_MULTIPLIER } from "@/lib/shiprocket-mapper";
import { computeHmac } from "@/lib/shiprocket-hmac";

// Duplicated in app/api/orders/route.ts and lib/shiprocket.ts too — kept as
// a local copy rather than a shared import since each of those call sites
// already does the same (see the comment on the lib/shiprocket.ts copy).
function sanitizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

// ── Reverse of lib/shiprocket-mapper.ts's buildVariants() ──────────────────
// For a product WITH sizes, variant id = numericId * MULTIPLIER + index (the
// 0-based position in sizes[]). For a product with NO sizes, the one
// fallback variant's id = numericId * MULTIPLIER (remainder 0). Remainder 0
// is therefore ambiguous on its own — "sizes[0]" or "the no-size default" —
// and is only resolved by looking the product up and checking sizes[].
function extractNumericId(variantId: string | number): number | null {
  const n = Number(variantId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n / SHIPROCKET_VARIANT_ID_MULTIPLIER);
}

function resolveSizeForVariant(
  variantId: string | number,
  product: any
): { size: any | null; sizeIndex: number | null } | null {
  const n = Number(variantId);
  if (!Number.isFinite(n) || n <= 0) return null;
  const remainder = n % SHIPROCKET_VARIANT_ID_MULTIPLIER;

  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const size = product.sizes[remainder];
    if (!size) return null; // remainder out of range — stale/unknown variant
    return { size, sizeIndex: remainder };
  }

  // No sizes on this product — must be its single default variant.
  return { size: null, sizeIndex: null };
}

// ── Payment classification ─────────────────────────────────────────────────
// Shiprocket's exact casing/values for payment_status and payment_type
// aren't pinned down in their docs (the old handler only accepted the exact
// string "Success", which silently treated every other spelling — and every
// COD order — as unpaid). Compared case-insensitively against known sets.
const PAID_STATUSES = new Set(["SUCCESS", "PAID", "COMPLETED", "CAPTURED", "CHARGED"]);
const FAILED_STATUSES = new Set(["FAILED", "FAILURE", "CANCELLED", "CANCELED", "DECLINED", "ABORTED", "EXPIRED"]);

//   paid    — prepaid and payment confirmed
//   cod     — cash on delivery; nothing to collect now, order is confirmed
//   failed  — payment failed/cancelled
//   pending — prepaid, not confirmed yet (keep waiting)
export type CheckoutPaymentState = "paid" | "cod" | "failed" | "pending";

export function classifyCheckoutPayment(payload: any): {
  state: CheckoutPaymentState;
  isCod: boolean;
  status: string;
  type: string;
} {
  const status = String(payload?.payment_status ?? "").trim().toUpperCase();
  const type = String(payload?.payment_type ?? "").trim().toUpperCase();
  const isCod = /(^|[^A-Z])COD([^A-Z]|$)|CASH/.test(type);

  let state: CheckoutPaymentState;
  if (FAILED_STATUSES.has(status)) state = "failed";
  else if (isCod) state = "cod";
  else if (PAID_STATUSES.has(status)) state = "paid";
  else state = "pending";

  return { state, isCod, status, type };
}

// Order-level status fields for each payment state. "failed" deliberately
// doesn't touch orderStatus ("cancelled" feeds the cancellation/refund flows).
function statusFieldsFor(state: CheckoutPaymentState) {
  switch (state) {
    case "paid":
      return { paymentStatus: "completed", orderStatus: "processing" };
    case "cod":
      return { paymentStatus: "pending", orderStatus: "processing" };
    case "failed":
      return { paymentStatus: "failed", orderStatus: "pending" };
    default:
      return { paymentStatus: "pending", orderStatus: "pending" };
  }
}

/** True once an order from this flow is a real, confirmed purchase. */
export function isCheckoutOrderConfirmed(order: any): boolean {
  if (!order) return false;
  if (order.paymentStatus === "completed") return true;
  return order.shiprocketPaymentType === "cod" && order.orderStatus !== "pending" && order.orderStatus !== "cancelled";
}

function orderIdentifiers(payload: any) {
  const platformOrderId: string | null =
    (typeof payload?.order_id === "string" && payload.order_id) ||
    (typeof payload?.platform_order_id === "string" && payload.platform_order_id) ||
    null;
  const fastrrOrderIdNum = Number(payload?.fastrr_order_id);
  const fastrrOrderId = Number.isFinite(fastrrOrderIdNum) && fastrrOrderIdNum > 0 ? fastrrOrderIdNum : null;
  return { platformOrderId, fastrrOrderId };
}

function lookupFilter(platformOrderId: string | null, fastrrOrderId: number | null) {
  return {
    $or: [
      ...(platformOrderId ? [{ shiprocketPlatformOrderId: platformOrderId }] : []),
      ...(fastrrOrderId !== null ? [{ paymentMethod: "shiprocket_checkout", shiprocketOrderId: fastrrOrderId }] : []),
    ],
  };
}

export class ShiprocketCheckoutPayloadError extends Error {}

export interface UpsertCheckoutOrderResult {
  order: any;
  created: boolean;
  state: CheckoutPaymentState;
}

/**
 * Create-or-update for a Shiprocket Custom Checkout order. Safe to call any
 * number of times, concurrently, from either caller, with the same or a newer
 * payload for the same order. Throws ShiprocketCheckoutPayloadError only when
 * the payload carries no usable order id at all.
 */
export async function upsertShiprocketCheckoutOrder(
  payload: any,
  source: "webhook" | "success_page"
): Promise<UpsertCheckoutOrderResult> {
  const { platformOrderId, fastrrOrderId } = orderIdentifiers(payload);
  if (!platformOrderId && fastrrOrderId === null) {
    throw new ShiprocketCheckoutPayloadError("Payload has neither order_id/platform_order_id nor fastrr_order_id");
  }

  await connectDB();

  const payment = classifyCheckoutPayment(payload);
  const filter = lookupFilter(platformOrderId, fastrrOrderId);

  let order: any = await Order.findOne(filter);
  let created = false;

  if (!order) {
    const doc = await buildOrderDocument(payload, payment);
    // Upsert key: the string checkout id when present (that's what the
    // success redirect's ?oid= carries), else the numeric fastrr id.
    const key: Record<string, unknown> = platformOrderId
      ? { shiprocketPlatformOrderId: platformOrderId }
      : { paymentMethod: "shiprocket_checkout", shiprocketOrderId: fastrrOrderId };
    // Key fields come from the filter on insert; keep them out of
    // $setOnInsert so the two never conflict.
    for (const k of Object.keys(key)) delete (doc as any)[k];

    try {
      const res: any = await Order.findOneAndUpdate(
        key,
        { $setOnInsert: doc },
        { upsert: true, returnDocument: "after", includeResultMetadata: true }
      );
      order = res.value;
      created = !res.lastErrorObject?.updatedExisting;
    } catch (err: any) {
      // Two concurrent upserts for the same key: the unique index lets
      // exactly one insert win; the loser just reads the winner's order.
      if (err?.code !== 11000) throw err;
      order = await Order.findOne(filter);
      if (!order) throw err;
    }
  }

  if (!created) {
    await applyPaymentTransition(order, payment);
    order = await Order.findById(order._id);
  }

  console.log(
    `[shiprocket-checkout-order] ${created ? "Created" : "Found"} ${order.orderNumber} via ${source} — platform_order_id=${platformOrderId} fastrr_order_id=${fastrrOrderId} payment_status=${payment.status || "?"} payment_type=${payment.type || "?"} state=${payment.state}`
  );

  if (payment.state === "paid" || payment.state === "cod") {
    await finalizeConfirmedOrder(order._id);
    order = await Order.findById(order._id);
  } else {
    // TEMP DEBUG [SR-ADHOC-DEBUG]
    console.log(
      `[SR-ADHOC-DEBUG] shipping order NOT created for ${order.orderNumber} — payment state "${payment.state}" (payment_status=${payment.status || "?"} payment_type=${payment.type || "?"}) is not confirmed yet`
    );
  }

  return { order, created, state: payment.state };
}

// Only ever moves an existing order forward — a stale/duplicate delivery
// can't downgrade a confirmed order. Each update is conditional on the
// current state, so concurrent callers can't race each other either.
async function applyPaymentTransition(order: any, payment: ReturnType<typeof classifyCheckoutPayment>) {
  const paymentType = payment.isCod ? "cod" : payment.type ? "prepaid" : order.shiprocketPaymentType ?? null;

  if (payment.state === "paid") {
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $in: ["pending", "failed"] } },
      { $set: { paymentStatus: "completed", shiprocketPaymentType: paymentType } }
    );
    await Order.updateOne({ _id: order._id, orderStatus: "pending" }, { $set: { orderStatus: "processing" } });
  } else if (payment.state === "cod") {
    await Order.updateOne(
      { _id: order._id, orderStatus: "pending", paymentStatus: "pending" },
      { $set: { orderStatus: "processing", shiprocketPaymentType: "cod" } }
    );
  } else if (payment.state === "failed") {
    await Order.updateOne(
      { _id: order._id, paymentStatus: "pending", checkoutFinalizedAt: null },
      { $set: { paymentStatus: "failed" } }
    );
  }
}

async function buildOrderDocument(payload: any, payment: ReturnType<typeof classifyCheckoutPayment>) {
  const { platformOrderId, fastrrOrderId } = orderIdentifiers(payload);
  const cartItems: any[] = Array.isArray(payload.cart_data?.items) ? payload.cart_data.items : [];

  let needsReview = false;
  const reviewNotes: string[] = [];
  const verifiedItems: any[] = [];

  if (cartItems.length === 0) {
    needsReview = true;
    reviewNotes.push("cart_data.items was missing or empty — order created with no line items.");
  }

  const flashSaleMap = await getActiveFlashSaleMap();

  for (const cartItem of cartItems) {
    const variantId = cartItem?.variant_id;
    const quantity = Number(cartItem?.quantity) || 0;

    if (variantId === undefined || variantId === null || quantity <= 0) {
      needsReview = true;
      reviewNotes.push(`Skipped cart item with invalid variant_id/quantity: ${JSON.stringify(cartItem)}`);
      continue;
    }

    const numericId = extractNumericId(variantId);
    const product = numericId !== null ? await Product.findOne({ numericId }) : null;

    if (!product) {
      needsReview = true;
      reviewNotes.push(`No product found for variant_id "${variantId}" (numericId ${numericId})`);
      console.error(`[shiprocket-checkout-order] Unresolvable variant_id "${variantId}" — skipping line item`);
      continue;
    }

    const resolved = resolveSizeForVariant(variantId, product);
    if (!resolved) {
      needsReview = true;
      reviewNotes.push(
        `variant_id "${variantId}" resolved to product ${product.name} (${product._id}) but no matching size at that index`
      );
      console.error(
        `[shiprocket-checkout-order] variant_id "${variantId}" — product ${product._id} has no size at the resolved index, skipping line item`
      );
      continue;
    }

    const { size } = resolved;

    // Never trust any price implied by the payload — resolve the real,
    // current selling price server-side exactly like every other order
    // path does (app/api/orders/route.ts, razorpay/verify-payment).
    const resolvedPrice = resolveCurrentPrice(product, flashSaleMap, size);
    const realPrice = resolvedPrice.discountPrice ?? resolvedPrice.price;

    const gstPercent = product.gstPercent ?? 0;
    const lineTotal = realPrice * quantity;
    const lineTaxableValue = gstPercent > 0 ? lineTotal / (1 + gstPercent / 100) : lineTotal;
    const lineGstAmount = lineTotal - lineTaxableValue;

    verifiedItems.push({
      product: product._id,
      quantity,
      price: realPrice,
      gstPercent,
      taxableValue: Math.round(lineTaxableValue * 100) / 100,
      gstAmount: Math.round(lineGstAmount * 100) / 100,
      selectedSize: size
        ? {
            size: size.size,
            unit: size.unit,
            quantity: size.quantity,
            price: size.price,
            discountPrice: size.discountPrice,
          }
        : undefined,
    });
  }

  const totalTaxableValue = verifiedItems.reduce((sum, i) => sum + i.taxableValue, 0);
  const totalGstAmount = verifiedItems.reduce((sum, i) => sum + i.gstAmount, 0);

  const addr = payload.shipping_address ?? {};
  const guestName = `${addr.first_name ?? ""} ${addr.last_name ?? ""}`.trim() || undefined;
  const cleanPhone = sanitizePhone(addr.phone) || sanitizePhone(payload.phone);

  // Link to the customer's account when the checkout email belongs to a
  // verified user, so the order shows up in /profile/orders like any order
  // placed on our own checkout. Orders left unlinked are still visible to
  // the owner through the guestEmail match in lib/order-access.ts.
  const checkoutEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const linkedUser = checkoutEmail
    ? await User.findOne({ email: checkoutEmail, isVerified: true }).select("_id")
    : null;

  return {
    orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user: linkedUser?._id,
    guestEmail: payload.email,
    guestName,
    guestPhone: cleanPhone,
    items: verifiedItems,
    totalAmount: Number(payload.total_amount_payable) || 0,
    shippingAmount: payload.shipping_charges ?? 0,
    codCharge: payload.cod_charges ?? 0,
    discountAmount: payload.total_discount ?? 0,
    // A record of what Shiprocket says was applied — NOT redeemed against
    // our own Coupon collection.
    couponCode: payload.coupon_codes?.[0] ?? null,
    shippingAddress: {
      name: guestName || "Customer",
      phone: cleanPhone,
      address: [addr.line1, addr.line2].filter(Boolean).join(", "),
      street: [addr.line1, addr.line2].filter(Boolean).join(", "),
      city: addr.city,
      state: addr.state,
      zipCode: addr.pincode,
      pincode: addr.pincode,
      country: addr.country,
    },
    paymentMethod: "shiprocket_checkout",
    shiprocketPaymentType: payment.isCod ? "cod" : payment.type ? "prepaid" : null,
    ...statusFieldsFor(payment.state),
    shiprocketOrderId: fastrrOrderId,
    shiprocketPlatformOrderId: platformOrderId,
    totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
    totalGstAmount: Math.round(totalGstAmount * 100) / 100,
    checkoutFinalizedAt: null,
    needsReview,
    reviewNotes,
  };
}

async function flagForReview(orderId: any, note: string) {
  await Order.findByIdAndUpdate(orderId, { $set: { needsReview: true }, $push: { reviewNotes: note } }).catch(() => {});
}

/**
 * Stock decrement, logistics shipment and emails — exactly once per order.
 * The claim filter requires checkoutFinalizedAt to EXIST and be null: orders
 * created by the pre-refactor webhook don't have the field at all, and any
 * of those that were paid already had these side effects run, so they must
 * never be claimed again.
 */
async function finalizeConfirmedOrder(orderId: any) {
  const order: any = await Order.findOneAndUpdate(
    { _id: orderId, checkoutFinalizedAt: { $exists: true, $eq: null } },
    { $set: { checkoutFinalizedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!order) {
    // TEMP DEBUG [SR-ADHOC-DEBUG]
    console.log(`[SR-ADHOC-DEBUG] finalize SKIP order=${orderId} — already finalized or legacy order; shipping API not called again`);
    return;
  }
  console.log(`[SR-ADHOC-DEBUG] finalize CLAIMED order=${order._id} — calling createShiprocketOrderForOrder next`);

  // ── Stock ──────────────────────────────────────────────────────────────
  for (const item of order.items as any[]) {
    try {
      const product: any = await Product.findById(item.product).select("name stock sizes");
      if (!product) continue;

      const sizeIndex =
        item.selectedSize?.size && Array.isArray(product.sizes)
          ? product.sizes.findIndex((s: any) => s.size === item.selectedSize.size)
          : -1;
      const available = sizeIndex >= 0 ? product.sizes[sizeIndex].stock : product.stock;

      if ((available ?? 0) < item.quantity) {
        // The sale already happened and was paid for on Shiprocket's side —
        // flag for review instead of blocking.
        await flagForReview(
          order._id,
          `Insufficient recorded stock for ${product.name}${sizeIndex >= 0 ? ` (${item.selectedSize.size})` : ""}: had ${available ?? 0}, ordered ${item.quantity}`
        );
      }

      const update =
        sizeIndex >= 0
          ? { $inc: { [`sizes.${sizeIndex}.stock`]: -item.quantity } }
          : { $inc: { stock: -item.quantity } };

      const updatedProduct = await Product.findByIdAndUpdate(product._id, update, { returnDocument: "after" })
        .populate("company", "name")
        .populate("category", "name");

      if (updatedProduct) void notifyProductWebhook(updatedProduct.toObject());
    } catch (err) {
      console.error(`[shiprocket-checkout-order] Stock update failed for order ${order._id}:`, err);
      await flagForReview(order._id, "Stock update failed during finalization — see server logs.");
    }
  }

  // ── Logistics shipment ─────────────────────────────────────────────────
  // shiprocketOrderId on these orders holds Shiprocket's fastrr_order_id
  // (their CHECKOUT order id), so the logistics order id goes into
  // shiprocketLogisticsOrderId instead.
  try {
    const shipmentResult = await createShiprocketOrderForOrder(order._id.toString());
    if (shipmentResult) {
      await Order.findByIdAndUpdate(order._id, {
        shiprocketLogisticsOrderId: shipmentResult.shiprocketOrderId,
        shiprocketShipmentId: shipmentResult.shiprocketShipmentId,
        awbCode: shipmentResult.awbCode ?? null,
        courierName: shipmentResult.courierName ?? null,
        shippingStatus: "processing",
        shiprocketError: null,
        ...(shipmentResult.awbCode && {
          trackingUrl: `https://shiprocket.co/tracking/${shipmentResult.awbCode}`,
        }),
      });
    } else {
      // createShiprocketOrderForOrder already recorded shippingStatus/
      // shiprocketError on the order itself.
      await flagForReview(order._id, "Shiprocket logistics shipment creation failed — see shiprocketError for details.");
    }
  } catch (shipmentError) {
    console.error(`[shiprocket-checkout-order] Unexpected error creating logistics shipment for order ${order._id}:`, shipmentError);
    await flagForReview(order._id, "Shiprocket logistics shipment creation threw an unexpected error — see server logs.");
  }

  // ── Emails ─────────────────────────────────────────────────────────────
  try {
    const populatedOrder: any = await Order.findById(order._id).populate("items.product").lean();
    if (!populatedOrder) return;

    const itemsData = populatedOrder.items.map((item: any) => ({
      name: item.product?.name || "Product",
      quantity: item.quantity,
      price: item.price,
      selectedSize: item.selectedSize,
    }));

    const orderDate = new Date(populatedOrder.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const customerName = populatedOrder.guestName || "Customer";

    // Skipped if literally nothing resolved — "your order is confirmed" with
    // zero items would be confusing; the admin email below always fires.
    if (itemsData.length > 0 && populatedOrder.guestEmail) {
      await sendEmail({
        to: populatedOrder.guestEmail,
        ...getOrderConfirmationEmail({
          orderId: populatedOrder.orderNumber,
          customerName,
          items: itemsData,
          total: populatedOrder.totalAmount,
          orderDate,
          paymentStatus: populatedOrder.paymentStatus,
          ...orderSummaryFields(populatedOrder),
        }),
      });
    }

    await sendEmail({
      to: process.env.GMAIL_EMAIL || "nezal@gmail.com",
      subject: populatedOrder.needsReview
        ? `⚠️ NEEDS REVIEW - Shiprocket Order - ${populatedOrder.orderNumber}`
        : `🚨 NEW ORDER (Shiprocket) - ${populatedOrder.orderNumber}`,
      html: getAdminOrderNotificationEmail({
        // Shipping, COD charge and discount; the explicit fields below take precedence.
        ...orderSummaryFields(populatedOrder),
        customerName,
        customerEmail: populatedOrder.guestEmail || "N/A",
        customerPhone: populatedOrder.guestPhone || "N/A",
        orderId: populatedOrder.orderNumber,
        items: itemsData,
        totalAmount: populatedOrder.totalAmount,
        paymentStatus: populatedOrder.paymentStatus,
        paymentMethod:
          populatedOrder.shiprocketPaymentType === "cod" ? "shiprocket_checkout (COD)" : populatedOrder.paymentMethod,
        shippingAddress: populatedOrder.shippingAddress,
        orderDate,
      }),
    });
  } catch (emailError) {
    console.error("[shiprocket-checkout-order] Failed to send order emails:", emailError);
  }

  // NOT calling sendCapiPurchaseEvent() — there's no customer request
  // context (IP/user-agent) on this path to attribute it to.
}

// ── Pull an order from Shiprocket's Checkout API ───────────────────────────
// Used when the success redirect arrives but no webhook ever did.
//
// UNVERIFIED ENDPOINT: the path below could not be confirmed against
// Shiprocket's public docs. It's overridable via
// SHIPROCKET_CHECKOUT_ORDER_DETAILS_URL — confirm the exact URL and response
// shape with Shiprocket and set it there. Signed the same way as the
// checkout-initiation call (lib/shiprocket-checkout.ts). Any failure returns
// null; the success page then falls back to "we'll email you".
const DEFAULT_ORDER_DETAILS_URL = "https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details";

function formatShiprocketTimestamp(date: Date): string {
  return date.toISOString().replace(/\.(\d{3})Z$/, ".$1000Z");
}

export async function fetchShiprocketCheckoutOrder(oid: string): Promise<any | null> {
  const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
  const apiSecret = process.env.SHIPROCKET_CHECKOUT_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("[shiprocket-checkout-order] SHIPROCKET_CHECKOUT_API_KEY / _SECRET not set — cannot fetch order");
    return null;
  }

  const url = process.env.SHIPROCKET_CHECKOUT_ORDER_DETAILS_URL || DEFAULT_ORDER_DETAILS_URL;
  const rawBody = JSON.stringify({ order_id: oid, timestamp: formatShiprocketTimestamp(new Date()) });

  let res: Response;
  let data: any;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-HMAC-SHA256": computeHmac(rawBody, apiSecret),
      },
      body: rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    data = await res.json().catch(() => null);
  } catch (err) {
    console.error(`[shiprocket-checkout-order] Order details fetch failed for oid=${oid}:`, err);
    return null;
  }

  if (!res.ok || !data) {
    console.error(
      `[shiprocket-checkout-order] Order details fetch for oid=${oid} returned status ${res.status}; top-level keys=${Object.keys(data ?? {}).join(",")}`
    );
    return null;
  }

  // Unwrap the {"ok":true,"result":{...}} envelope the checkout API uses
  // elsewhere, tolerating a bare payload too.
  const candidates = [data?.result?.data, data?.result, data?.data, data];
  const payload = candidates.find((c) => c && typeof c === "object" && Array.isArray(c.cart_data?.items));

  if (!payload) {
    console.error(
      `[shiprocket-checkout-order] Order details for oid=${oid} had no cart_data.items; top-level keys=${Object.keys(data).join(",")} result keys=${Object.keys(data?.result ?? {}).join(",")}`
    );
    return null;
  }

  const returnedIds = [payload.order_id, payload.platform_order_id].filter(Boolean).map(String);
  if (returnedIds.length > 0 && !returnedIds.includes(oid)) {
    console.error(
      `[shiprocket-checkout-order] Order details for oid=${oid} came back for a different order (${returnedIds.join(",")}) — ignoring`
    );
    return null;
  }

  console.log(
    `[shiprocket-checkout-order] Fetched order details for oid=${oid} — keys=${Object.keys(payload).join(",")} payment_status=${payload.payment_status} payment_type=${payload.payment_type}`
  );

  // Shiprocket answered for exactly this oid, so it's safe to key the
  // order on it even if the details response omits order_id.
  return { ...payload, order_id: payload.order_id ?? oid };
}

// Per-oid throttle on the pull path: the success page is public and polls,
// so repeated renders must not turn into a Shiprocket request each time.
// Per-process (PM2 cluster workers each keep their own), which is fine for
// a throttle.
const lastPullAt = new Map<string, number>();
const PULL_MIN_INTERVAL_MS = 4000;

/**
 * Success-page fallback: fetch the order from Shiprocket and upsert it
 * through the same path the webhook uses. Returns null when throttled or
 * when Shiprocket had nothing usable.
 */
export async function syncShiprocketCheckoutOrderFromApi(oid: string): Promise<any | null> {
  const now = Date.now();
  const last = lastPullAt.get(oid) ?? 0;
  if (now - last < PULL_MIN_INTERVAL_MS) return null;
  lastPullAt.set(oid, now);
  if (lastPullAt.size > 5000) {
    for (const [key, at] of lastPullAt) if (now - at > 10 * 60 * 1000) lastPullAt.delete(key);
  }

  const payload = await fetchShiprocketCheckoutOrder(oid);
  if (!payload) return null;

  try {
    const { order } = await upsertShiprocketCheckoutOrder(payload, "success_page");
    return order;
  } catch (err) {
    console.error(`[shiprocket-checkout-order] Upsert from API payload failed for oid=${oid}:`, err);
    return null;
  }
}
