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
// Until SHIPROCKET_WEBHOOK_API_KEY / SHIPROCKET_WEBHOOK_SECRET are set (real
// credentials aren't issued yet), every call skips silently with a
// console.warn — this is expected and not an error.

import { mapProductToShiprocket, mapCollectionToShiprocket } from "@/lib/shiprocket-mapper";
import { computeHmac } from "@/lib/shiprocket-hmac";

// Defaults to Shiprocket production; override with a staging URL via env.
const SHIPROCKET_WEBHOOK_BASE_URL =
  process.env.SHIPROCKET_WEBHOOK_BASE_URL || "https://checkout-api.shiprocket.com";

const PRODUCT_WEBHOOK_PATH = "/wh/v1/custom/product";
const COLLECTION_WEBHOOK_PATH = "/wh/v1/custom/collection";

async function postWebhook(url: string, payload: unknown, label: string): Promise<void> {
  const apiKey = process.env.SHIPROCKET_WEBHOOK_API_KEY;
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!apiKey || !secret) {
    console.warn(
      `[shiprocket-webhooks] Skipping ${label} — SHIPROCKET_WEBHOOK_API_KEY / SHIPROCKET_WEBHOOK_SECRET not set`
    );
    return;
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
      return;
    }

    console.log(`[shiprocket-webhooks] ${label} succeeded — status ${res.status}`);
  } catch (error) {
    // Network errors, JSON.stringify failures, etc. — never let this reach the caller.
    console.error(
      `[shiprocket-webhooks] ${label} threw:`,
      error instanceof Error ? error.message : error
    );
  }
}

export async function notifyProductWebhook(product: any): Promise<void> {
  const payload = mapProductToShiprocket(product);
  await postWebhook(
    `${SHIPROCKET_WEBHOOK_BASE_URL}${PRODUCT_WEBHOOK_PATH}`,
    payload,
    `product webhook (numericId=${product?.numericId})`
  );
}

export async function notifyCollectionWebhook(collection: any): Promise<void> {
  const payload = mapCollectionToShiprocket(collection);
  await postWebhook(
    `${SHIPROCKET_WEBHOOK_BASE_URL}${COLLECTION_WEBHOOK_PATH}`,
    payload,
    `collection webhook (slug=${collection?.slug})`
  );
}
