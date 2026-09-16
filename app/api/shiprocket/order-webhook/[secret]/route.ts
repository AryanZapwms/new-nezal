// app/api/shiprocket/order-webhook/[secret]/route.ts
//
// Shiprocket calls this when a customer completes checkout on their Custom
// Checkout widget. It needs to create a real Order in our DB the same way
// app/api/orders/route.ts and app/api/razorpay/verify-payment/route.ts do,
// but the "cart" here was never ours — the customer shopped entirely inside
// Shiprocket's widget, so there's no local Cart/session to reconcile against.
//
// Auth: Shiprocket's Order Webhook docs only show Content-Type: application/
// json — no custom header or HMAC field for this particular webhook (unlike
// the outbound calls we make TO them in lib/shiprocket-webhooks.ts). Same
// situation as ScaleChat's WhatsApp webhook (see
// app/api/webhooks/whatsapp/[secret]/route.ts) — secret lives in the URL
// path instead, checked against SHIPROCKET_ORDER_WEBHOOK_SECRET below.
//
// Register this URL with Shiprocket as:
//   https://nezalherbocare.com/api/shiprocket/order-webhook/SHIPROCKET_ORDER_WEBHOOK_SECRET_VALUE

import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { getActiveFlashSaleMap } from "@/lib/flashSale";
import { resolveCurrentPrice } from "@/lib/pricing";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import { notifyProductWebhook } from "@/lib/shiprocket-webhooks";
import { createShiprocketOrderForOrder } from "@/lib/shiprocket";
import { SHIPROCKET_VARIANT_ID_MULTIPLIER } from "@/lib/shiprocket-mapper";

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
// Forward formula (confirmed against the ACTUAL current code, not just this
// task's description — see the flagged discrepancy in the summary): for a
// product WITH sizes, variant id = numericId * SHIPROCKET_VARIANT_ID_MULTIPLIER
// + index, where `index` is the 0-based position in sizes[]. For a product
// with NO sizes, the one fallback variant's id = numericId *
// SHIPROCKET_VARIANT_ID_MULTIPLIER (i.e. remainder 0). Shares that constant
// with lib/shiprocket-mapper.ts (which builds ids forward) so the two can
// never drift apart — the actual /  and % math still lives here since
// there's no single function both directions could call.
//
// That means remainder 0 is genuinely ambiguous on its own — it means
// "sizes[0]" for a product that has sizes, or "the no-size default variant"
// for a product that doesn't. It can only be resolved by looking the
// product up first and checking whether sizes[] is actually populated.
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (secret !== process.env.SHIPROCKET_ORDER_WEBHOOK_SECRET) {
    console.warn("Shiprocket order webhook: invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platformOrderId: string | null = payload.order_id || payload.platform_order_id || null;
  const fastrrOrderIdNum = Number(payload.fastrr_order_id);
  const hasFastrrId = Number.isFinite(fastrrOrderIdNum) && fastrrOrderIdNum > 0;

  // Without at least one of these we can't dedupe against a retry/redelivery
  // at all — that's a fundamentally unusable payload, not just a partial
  // failure, so this is the one non-auth case that gets a non-200.
  if (!platformOrderId && !hasFastrrId) {
    console.error(
      "[shiprocket-order-webhook] Payload missing both order_id and fastrr_order_id — cannot process:",
      JSON.stringify(payload)
    );
    return NextResponse.json({ error: "Missing order identifier" }, { status: 400 });
  }

  try {
    await connectDB();

    // ── Idempotency ──────────────────────────────────────────────────────
    const existing = await Order.findOne({
      $or: [
        ...(platformOrderId ? [{ shiprocketPlatformOrderId: platformOrderId }] : []),
        ...(hasFastrrId ? [{ shiprocketOrderId: fastrrOrderIdNum }] : []),
      ],
    });
    if (existing) {
      console.log(
        `[shiprocket-order-webhook] Repeat delivery for order_id=${platformOrderId} — already recorded as ${existing.orderNumber}, skipping`
      );
      return NextResponse.json({ ok: true, duplicate: true, orderNumber: existing.orderNumber });
    }

    // ── Resolve cart line items ──────────────────────────────────────────
    const cartItems: any[] = Array.isArray(payload.cart_data?.items) ? payload.cart_data.items : [];

    let needsReview = false;
    const reviewNotes: string[] = [];
    const verifiedItems: any[] = [];
    // Tracks what to $inc on Product/sizes[index] once the order is saved.
    const stockUpdates: { productId: any; sizeIndex: number | null; quantity: number }[] = [];

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
        console.error(`[shiprocket-order-webhook] Unresolvable variant_id "${variantId}" — skipping line item`);
        continue;
      }

      const resolved = resolveSizeForVariant(variantId, product);
      if (!resolved) {
        needsReview = true;
        reviewNotes.push(
          `variant_id "${variantId}" resolved to product ${product.name} (${product._id}) but no matching size at that index`
        );
        console.error(
          `[shiprocket-order-webhook] variant_id "${variantId}" — product ${product._id} has no size at the resolved index, skipping line item`
        );
        continue;
      }

      const { size, sizeIndex } = resolved;

      // Never trust any price implied by the webhook — resolve the real,
      // current selling price server-side exactly like every other order
      // path does (app/api/orders/route.ts, razorpay/verify-payment).
      const resolvedPrice = resolveCurrentPrice(product, flashSaleMap, size);
      const realPrice = resolvedPrice.discountPrice ?? resolvedPrice.price;
      const availableStock = size ? size.stock : product.stock;

      if (availableStock < quantity) {
        // Unlike a checkout on OUR site, the sale already happened and was
        // already paid for on Shiprocket's side by the time we hear about
        // it — there's no "reject and let the customer fix their cart"
        // option here. Flag for manual review instead of blocking.
        needsReview = true;
        reviewNotes.push(
          `Insufficient recorded stock for ${product.name}${size ? ` (${size.size})` : ""}: had ${availableStock}, ordered ${quantity}`
        );
        console.warn(
          `[shiprocket-order-webhook] Stock went negative for product ${product._id}${size ? ` size ${size.size}` : ""}: ${availableStock} available, ${quantity} ordered`
        );
      }

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

      stockUpdates.push({ productId: product._id, sizeIndex, quantity });
    }

    const totalTaxableValue = verifiedItems.reduce((sum, i) => sum + i.taxableValue, 0);
    const totalGstAmount = verifiedItems.reduce((sum, i) => sum + i.gstAmount, 0);

    // ── Build the order ──────────────────────────────────────────────────
    const addr = payload.shipping_address ?? {};
    const guestName = `${addr.first_name ?? ""} ${addr.last_name ?? ""}`.trim() || undefined;
    const cleanPhone = sanitizePhone(addr.phone) || sanitizePhone(payload.phone);

    const mappedAddress = {
      name: guestName || "Customer",
      phone: cleanPhone,
      address: [addr.line1, addr.line2].filter(Boolean).join(", "),
      street: [addr.line1, addr.line2].filter(Boolean).join(", "),
      city: addr.city,
      state: addr.state,
      zipCode: addr.pincode,
      pincode: addr.pincode,
      country: addr.country,
    };

    const paymentSucceeded = payload.payment_status === "Success";
    const orderNumber = `ORD-${Date.now()}`;

    const order = await Order.create({
      orderNumber,
      guestEmail: payload.email,
      guestName,
      guestPhone: cleanPhone,
      items: verifiedItems,
      totalAmount: payload.total_amount_payable,
      shippingAmount: payload.shipping_charges ?? 0,
      codCharge: payload.cod_charges ?? 0,
      discountAmount: payload.total_discount ?? 0,
      // NOT redeemed against our own Coupon collection here — see the
      // flagged item in the summary. This is a record of what Shiprocket
      // says was applied, not a validated redemption on our side.
      couponCode: payload.coupon_codes?.[0] ?? null,
      shippingAddress: mappedAddress,
      paymentMethod: "shiprocket_checkout",
      paymentStatus: paymentSucceeded ? "completed" : "pending",
      orderStatus: paymentSucceeded ? "processing" : "pending",
      shiprocketOrderId: hasFastrrId ? fastrrOrderIdNum : null,
      shiprocketPlatformOrderId: platformOrderId,
      totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
      totalGstAmount: Math.round(totalGstAmount * 100) / 100,
      needsReview,
      reviewNotes,
    });

    console.log(
      `[shiprocket-order-webhook] Created order ${order.orderNumber} (platform order ${platformOrderId})${needsReview ? " — FLAGGED FOR REVIEW" : ""}`
    );

    // ── Post-order side effects — only once payment is actually confirmed,
    //    mirroring how razorpay/verify-payment gates these on a confirmed
    //    payment rather than firing them unconditionally. ─────────────────
    if (paymentSucceeded) {
      // Stock decrement, same treatment as razorpay/verify-payment's
      // Product.findByIdAndUpdate($inc stock) — plus notifyProductWebhook
      // since that's now the standing pattern for every stock-changing
      // write (see lib/sale.ts, razorpay/verify-payment).
      await Promise.all(
        stockUpdates.map(async ({ productId, sizeIndex, quantity }) => {
          const update =
            sizeIndex !== null
              ? { $inc: { [`sizes.${sizeIndex}.stock`]: -quantity } }
              : { $inc: { stock: -quantity } };

          const updatedProduct = await Product.findByIdAndUpdate(productId, update, { new: true })
            .populate("company", "name")
            .populate("category", "name");

          if (updatedProduct) void notifyProductWebhook(updatedProduct.toObject());
        })
      );

      // ── Logistics shipment creation ─────────────────────────────────────
      // This order's shiprocketOrderId is already occupied by Shiprocket's
      // own fastrr_order_id (their CHECKOUT order id, a different concept
      // from a LOGISTICS/shipment order) — so autoCreateShiprocketOrder()'s
      // `if (order.shiprocketOrderId) return` guard would silently no-op if
      // called as-is. Call the shared helper it's built on directly instead,
      // and persist the result into shiprocketLogisticsOrderId.
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
          // shiprocketError on the order itself (same as it does for every
          // other order type) — additionally flag it through this order's
          // own review system so it surfaces alongside any line-item issues.
          needsReview = true;
          reviewNotes.push("Shiprocket logistics shipment creation failed — see shiprocketError for details.");
          await Order.findByIdAndUpdate(order._id, {
            $set: { needsReview: true },
            $push: { reviewNotes: "Shiprocket logistics shipment creation failed — see shiprocketError for details." },
          });
        }
      } catch (shipmentError) {
        // Defensive: createShiprocketOrderForOrder shouldn't throw (it
        // catches its own API-call errors), but a paid order must never be
        // lost over a shipment-creation bug either way.
        console.error(
          `[shiprocket-order-webhook] Unexpected error creating logistics shipment for order ${order._id}:`,
          shipmentError
        );
        needsReview = true;
        reviewNotes.push("Shiprocket logistics shipment creation threw an unexpected error — see server logs.");
        await Order.findByIdAndUpdate(order._id, {
          $set: { needsReview: true },
          $push: { reviewNotes: "Shiprocket logistics shipment creation threw an unexpected error — see server logs." },
        }).catch(() => {});
      }

      try {
        const populatedOrder = await Order.findById(order._id).populate("items.product").lean();

        if (populatedOrder) {
          const itemsData = (populatedOrder as any).items.map((item: any) => ({
            name: item.product?.name || "Product",
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize,
          }));

          const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          // Customer confirmation — skipped if literally nothing resolved,
          // since "your order is confirmed" with zero items would be
          // confusing; the admin email below still always fires.
          if (itemsData.length > 0) {
            const confirmationEmailHtml = getOrderConfirmationEmail({
              orderId: order.orderNumber,
              customerName: guestName || "Customer",
              items: itemsData,
              total: order.totalAmount,
              orderDate,
              paymentStatus: "completed",
            });

            await sendEmail({
              to: payload.email,
              subject: `Order Confirmation - ${order.orderNumber}`,
              html: confirmationEmailHtml,
            });
          }

          const adminEmailHtml = getAdminOrderNotificationEmail({
            customerName: guestName || "Customer",
            customerEmail: payload.email || "N/A",
            customerPhone: cleanPhone || payload.phone || "N/A",
            orderId: order.orderNumber,
            items: itemsData,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            shippingAddress: mappedAddress,
            orderDate,
          });

          await sendEmail({
            to: process.env.GMAIL_EMAIL || "nezal@gmail.com",
            subject: needsReview
              ? `⚠️ NEEDS REVIEW - Shiprocket Order - ${order.orderNumber}`
              : `🚨 NEW ORDER (Shiprocket) - ${order.orderNumber}`,
            html: adminEmailHtml,
          });
        }
      } catch (emailError) {
        console.error("[shiprocket-order-webhook] Failed to send order emails:", emailError);
      }

      // NOT calling sendCapiPurchaseEvent() here — flagged in the summary.
      // getRequestMeta(request) would capture SHIPROCKET'S server IP/
      // user-agent, not the customer's, and there was never a client-side
      // fbq('track','Purchase', {eventID}) fire to dedupe against since the
      // customer never loaded our site for this checkout.
    }

    return NextResponse.json({
      ok: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      needsReview,
    });
  } catch (error) {
    // Per spec: never make Shiprocket retry-storm on our internal bugs —
    // still 200, but the full payload is logged here so a paid order is
    // recoverable by hand instead of silently lost.
    console.error(
      "[shiprocket-order-webhook] Unhandled error processing webhook — payload:",
      JSON.stringify(payload),
      error
    );
    return NextResponse.json({ ok: true, error: "internal_error_logged" });
  }
}
