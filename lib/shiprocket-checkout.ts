// lib/shiprocket-checkout.ts
//
// Starts a Shiprocket Custom Checkout session for a cart on OUR site — the
// "Access Token / Checkout" call, per Shiprocket's docs:
//   POST https://checkout-api.shiprocket.com/api/v1/access-token/checkout
//
// Builds cart_data using the SAME numericId-based variant_id scheme as the
// catalog feed (lib/shiprocket-mapper.ts's computeVariantId — the forward
// direction of what the order webhook decodes in reverse), and signs the
// request the same way outbound webhook calls are signed
// (lib/shiprocket-hmac.ts), just with a separate checkout-specific secret.
//
// Callers (app/api/shiprocket/initiate-checkout/route.ts) pass in
// productId/selectedSize/quantity from OUR system, never a raw variant_id
// from the client — every item is re-resolved against the live
// Product/size documents here, so a cart can't reference stale/manipulated
// ids.

import { Product } from "@/lib/models/product";
import { computeVariantId } from "@/lib/shiprocket-mapper";
import { computeHmac } from "@/lib/shiprocket-hmac";

const CHECKOUT_URL = "https://checkout-api.shiprocket.com/api/v1/access-token/checkout";

// Shiprocket's checkout-initiation API expects an ISO 8601 UTC timestamp
// with MICROSECOND precision, e.g. "2026-09-23T11:09:50.553530Z" — confirmed
// via a direct curl test. Date.toISOString() only gives milliseconds
// ("...50.553Z"), so the fractional part is padded from 3 to 6 digits
// ("...50.553000Z"). JS Dates have no sub-millisecond precision, so the
// last 3 digits are always 0 — that's fine: the timestamp is part of the
// signed body, so the HMAC covers exactly the string sent either way.
function formatShiprocketTimestamp(date: Date): string {
  return date.toISOString().replace(/\.(\d{3})Z$/, ".$1000Z");
}

export interface ShiprocketCheckoutCartItem {
  productId: string;
  quantity: number;
  // Matches a product's sizes[] entry by label (+ sku when given) — the
  // SAME convention app/api/orders/route.ts and razorpay/verify-payment.ts
  // use to resolve a cart's selectedSize, because that's all our Zustand
  // cart store (lib/store/cart-store.ts) actually carries. Product.sizes[]
  // entries get a Mongo _id each, but the cart never captured it — so
  // matching by _id can't work from the frontend at all. Omit for the
  // product's own no-size default variant.
  selectedSize?: { size: string; sku?: string };
}

export interface ShiprocketCheckoutResult {
  token: string;
  expiresAt: string | null;
  orderId: string | null;
}

// Thrown for problems with the CART ITSELF (bad product/size id, out of
// stock, empty cart) — callers should treat this as a 400-shaped client
// error. Anything else thrown (missing env vars, Shiprocket API/network
// failure, malformed response) is a plain Error — an upstream/config
// problem, not something the cart's contents can fix.
export class ShiprocketCheckoutValidationError extends Error {}

export async function initiateShiprocketCheckout(
  cartItems: ShiprocketCheckoutCartItem[],
  // Relative path (e.g. "/order-success/123") Shiprocket redirects the
  // customer to after successful payment, appending ?oid=...&ost=SUCCESS
  // per their Success Redirect docs — different call sites (product page
  // Buy Now vs. cart page checkout) may want different targets, so this is
  // a parameter rather than hardcoded. Resolved to an absolute URL below.
  redirectPath?: string
): Promise<ShiprocketCheckoutResult> {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ShiprocketCheckoutValidationError("Cart is empty");
  }

  const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
  const apiSecret = process.env.SHIPROCKET_CHECKOUT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "SHIPROCKET_CHECKOUT_API_KEY / SHIPROCKET_CHECKOUT_API_SECRET not set — cannot start a Shiprocket checkout session"
    );
  }

  const items: { variant_id: string; quantity: number }[] = [];

  for (const cartItem of cartItems) {
    const quantity = Number(cartItem.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ShiprocketCheckoutValidationError(`Invalid quantity for product ${cartItem.productId}`);
    }

    const product = await Product.findById(cartItem.productId).lean();
    if (!product) {
      throw new ShiprocketCheckoutValidationError(`Product not found: ${cartItem.productId}`);
    }
    if (typeof (product as any).numericId !== "number") {
      // Shouldn't happen for any product created after the numericId
      // backfill, but fail loudly rather than silently building a bad
      // variant_id if an old/unmigrated product ever slips through.
      throw new ShiprocketCheckoutValidationError(
        `Product ${cartItem.productId} has no numericId — cannot start Shiprocket checkout for it`
      );
    }

    let sizeIndex: number | null = null;
    let availableStock: number = (product as any).stock ?? 0;

    if (cartItem.selectedSize?.size) {
      const { size, sku } = cartItem.selectedSize;
      const sizes: any[] = (product as any).sizes || [];
      const idx = sizes.findIndex((s) => s.size === size && (sku ? s.sku === sku : true));
      if (idx === -1) {
        throw new ShiprocketCheckoutValidationError(
          `Size "${size}" not found on product ${cartItem.productId}`
        );
      }
      sizeIndex = idx;
      availableStock = sizes[idx].stock ?? 0;
    }

    if (availableStock < quantity) {
      throw new ShiprocketCheckoutValidationError(
        `Insufficient stock for ${(product as any).name}: had ${availableStock}, requested ${quantity}`
      );
    }

    items.push({
      variant_id: String(computeVariantId((product as any).numericId, sizeIndex)),
      quantity,
    });
  }

  // Same NEXT_PUBLIC_SITE_URL-with-localhost-fallback pattern already used
  // for building an absolute post-payment redirect URL for a third-party
  // checkout provider — see app/api/ccavenue/initiate/route.ts. Default
  // target is app/checkout/success/page.tsx.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectUrl = `${siteUrl}${redirectPath || "/checkout/success"}`;

  const rawBody = JSON.stringify({
    cart_data: { items, mobile_app: false },
    // Snake_case, matching cart_data/timestamp — Shiprocket rejected the
    // camelCase "redirectUrl" with "redirectUrl - must not be null" even
    // though a value was actually being sent, because it wasn't reading
    // the field under that name at all.
    redirect_url: redirectUrl,
    timestamp: formatShiprocketTimestamp(new Date()),
  });
  const signature = computeHmac(rawBody, apiSecret);

  console.log("Shiprocket payload:", rawBody);

  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-HMAC-SHA256": signature,
    },
    body: rawBody,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Shiprocket checkout initiation returned a non-JSON response (status ${res.status})`);
  }

  // Success responses wrap the payload in a "result" envelope:
  //   {"ok":true, "result":{"token":..., "expires_at":..., "data":{"order_id":...}}, "error":null}
  // so token/expires_at/order_id live under data.result, not at the top level.
  const result = data?.result;

  if (!res.ok || data?.ok !== true || !result?.token) {
    throw new Error(
      `Shiprocket checkout initiation failed (status ${res.status}): ${JSON.stringify(data)}`
    );
  }

  return {
    token: result.token,
    expiresAt: result.expires_at ?? null,
    orderId: result.data?.order_id ?? null,
  };
}
