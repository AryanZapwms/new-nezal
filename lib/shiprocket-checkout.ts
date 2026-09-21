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
    cart_data: { items },
    redirectUrl,
    // Shiprocket's 422 flagged "timestamp" as required but we have no
    // documented format for THIS endpoint specifically — their order
    // webhook's own example payload used ISO 8601 ("2025-06-30T06:59:32Z"),
    // but that's a different endpoint/direction (inbound, not this outbound
    // call). ISO 8601 is the most standard default absent more specific
    // confirmation — ASSUMPTION, verify against a real non-422 response
    // once live credentials are in and adjust if Shiprocket actually wants
    // something else (e.g. unix epoch millis).
    timestamp: new Date().toISOString(),
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

  if (!res.ok || !data?.ok || !data?.token) {
    throw new Error(
      `Shiprocket checkout initiation failed (status ${res.status}): ${JSON.stringify(data)}`
    );
  }

  return {
    token: data.token,
    expiresAt: data.expires_at ?? null,
    orderId: data.data?.order_id ?? null,
  };
}
