// lib/shiprocket-checkout-urls.ts
//
// Shiprocket Custom Checkout widget script/CSS — staging vs prod. Shared by
// components/shiprocket-checkout-assets.tsx (cart and product pages) and
// app/layout.tsx (abandoned-cart recovery links, see
// components/shiprocket-cart-resume.tsx).
//
// Server-only: SHIPROCKET_CHECKOUT_ENV isn't a NEXT_PUBLIC_ variable, so only
// server components may import this; client components get the URL as a prop.
//
// No existing NODE_ENV-based switch for a Shiprocket asset pair was found
// anywhere in this codebase to follow: lib/shiprocket.ts's logistics API
// base URL (SHIPROCKET_API) is a single hardcoded production URL with no
// staging variant at all, and the closest actual precedent
// (SHIPROCKET_WEBHOOK_BASE_URL in lib/shiprocket-webhooks.ts) is a
// single-URL env-var-override-with-production-default, not a two-URL
// staging/production enum. This introduces that enum pattern fresh —
// SHIPROCKET_CHECKOUT_ENV=staging opts in, anything else (including unset)
// defaults to production, matching this repo's general "default to prod,
// opt into staging" convention.
const SHIPROCKET_CHECKOUT_ENV = process.env.SHIPROCKET_CHECKOUT_ENV === "staging" ? "staging" : "production";

export const SHIPROCKET_CHECKOUT_SCRIPT_URL =
  SHIPROCKET_CHECKOUT_ENV === "staging"
    ? "https://customcheckoutfastrr.netlify.app/assets/js/channels/shopify.js"
    : "https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js";

export const SHIPROCKET_CHECKOUT_CSS_URL =
  SHIPROCKET_CHECKOUT_ENV === "staging"
    ? "https://customcheckoutfastrr.netlify.app/assets/styles/shopify.css"
    : "https://checkout-ui.shiprocket.com/assets/styles/shopify.css";
