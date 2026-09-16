// lib/shiprocket-hmac.ts
//
// Shared HMAC-SHA256 signer for every outbound call that uses Shiprocket's
// X-Api-Key + X-Api-HMAC-SHA256 auth pattern:
//   - lib/shiprocket-webhooks.ts — product/collection change notifications
//   - lib/shiprocket-checkout.ts — starting a checkout session
// Each of those signs with a DIFFERENT secret (the webhook secret vs the
// checkout API secret), so the secret is always passed in here rather than
// read from an env var internally — that's what makes this reusable instead
// of being copy-pasted per call site with its own hardcoded env var.

import crypto from "crypto";

export function computeHmac(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
}
