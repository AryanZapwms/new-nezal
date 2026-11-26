// lib/shiprocket-webhooks.ts
//
// Outbound webhook notifications to Shiprocket's Custom Checkout, fired
// whenever a product or collection is created/updated on our side so their
// catalog stays in sync between GET /api/shiprocket/products polls.
//
// Call sites MUST fire these fire-and-forget (`void notifyProductWebhook(...)`,
// never `await`) — a slow or failing Shiprocket endpoint must never block or
// break an admin save, a checkout, or any other request. Both notify
// functions below never throw for this exact reason.
//
// Until SHIPROCKET_CATALOG_WEBHOOK_API_KEY / SHIPROCKET_CATALOG_WEBHOOK_SECRET
// are set (real credentials aren't issued yet), every call skips silently
// with a console.warn — this is expected and not an error.
//
// Named distinctly from SHIPROCKET_WEBHOOK_SECRET (see
// app/api/webhooks/shipment-updates/route.ts) — that's a PRE-EXISTING,
// already-in-production env var for a completely different feature
// (inbound shipment-status webhook auth). This file originally reused that
// same name by mistake; renamed to avoid the two features silently sharing
// (and conflicting over) one secret.

import { mapProductToShiprocket, mapCollectionToShiprocket } from "@/lib/shiprocket-mapper";
import { computeHmac } from "@/lib/shiprocket-hmac";
import { getActiveFlashSaleMap, type FlashSaleInfo } from "@/lib/flashSale";

// Defaults to Shiprocket production; override with a staging URL via env.
const SHIPROCKET_WEBHOOK_BASE_URL =
  process.env.SHIPROCKET_WEBHOOK_BASE_URL || "https://checkout-api.shiprocket.com";

const PRODUCT_WEBHOOK_PATH = "/wh/v1/custom/product";
const COLLECTION_WEBHOOK_PATH = "/wh/v1/custom/collection";

/** True when both catalog webhook credentials are set, so notifications can actually be sent. */
export function hasCatalogWebhookCredentials(): boolean {
  return !!process.env.SHIPROCKET_CATALOG_WEBHOOK_API_KEY && !!process.env.SHIPROCKET_CATALOG_WEBHOOK_SECRET;
}

function warnSkipped(label: string) {
  console.warn(
    `[shiprocket-webhooks] Skipping ${label} — SHIPROCKET_CATALOG_WEBHOOK_API_KEY / SHIPROCKET_CATALOG_WEBHOOK_SECRET not set`
  );
}

// Resolves true once Shiprocket accepted the notification, false when it was
// skipped, rejected or failed. Never throws.
async function postWebhook(url: string, payload: unknown, label: string): Promise<boolean> {
  const apiKey = process.env.SHIPROCKET_CATALOG_WEBHOOK_API_KEY;
  const secret = process.env.SHIPROCKET_CATALOG_WEBHOOK_SECRET;

  if (!apiKey || !secret) {
    warnSkipped(label);
    return false;
  }

  try {
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, secret);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-HMAC-SHA256": signature,
      },
      body: rawBody,
    });

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "<unreadable body>");
      console.error(
        `[shiprocket-webhooks] ${label} failed — status ${res.status} ${res.statusText}: ${responseBody}`
      );
      return false;
    }

    console.log(`[shiprocket-webhooks] ${label} succeeded — status ${res.status}`);
    return true;
  } catch (error) {
    // Network errors, JSON.stringify failures, etc. — never let this reach the caller.
    console.error(
      `[shiprocket-webhooks] ${label} threw:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

// Priced like the catalog feed, active flash sales included. Pass
// flashSaleMap when notifying many products at once (one lookup for all);
// otherwise it's looked up here. Resolves true once Shiprocket accepted it.
export async function notifyProductWebhook(
  product: any,
  flashSaleMap?: Map<string, FlashSaleInfo>
): Promise<boolean> {
  const label = `product webhook (numericId=${product?.numericId})`;
  // Checked before the flash-sale lookup: without credentials there's nothing to send
  if (!hasCatalogWebhookCredentials()) {
    warnSkipped(label);
    return false;
  }

  let payload: unknown;
  try {
    payload = mapProductToShiprocket(product, flashSaleMap ?? (await getActiveFlashSaleMap()));
  } catch (error) {
    // Sent without the flash sale, a running sale would be missing from
    // Shiprocket's price; skip instead — the next catalog poll or
    // notification catches up.
    console.error(
      `[shiprocket-webhooks] Skipping ${label} — couldn't build the payload:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }

  return postWebhook(`${SHIPROCKET_WEBHOOK_BASE_URL}${PRODUCT_WEBHOOK_PATH}`, payload, label);
}

export async function notifyCollectionWebhook(collection: any): Promise<boolean> {
  const payload = mapCollectionToShiprocket(collection);
  return postWebhook(
    `${SHIPROCKET_WEBHOOK_BASE_URL}${COLLECTION_WEBHOOK_PATH}`,
    payload,
    `collection webhook (slug=${collection?.slug})`
  );
}
