// components/shiprocket-checkout-assets.tsx
//
// Shiprocket Custom Checkout widget script + stylesheet (window.HeadlessCheckout,
// used by hooks/use-shiprocket-checkout.ts). Only the cart page and the product
// page use the widget, so this is rendered from those routes' layouts rather
// than app/layout.tsx — every other page no longer loads a render-blocking
// third-party stylesheet (plus the Google Font it @imports) and the script.
//
// Server component on purpose: SHIPROCKET_CHECKOUT_ENV is a server-only env var.

import Script from "next/script"
import { DeferredStylesheet } from "@/components/deferred-stylesheet"

// Shiprocket Custom Checkout widget script/CSS — staging vs prod.
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

const SHIPROCKET_CHECKOUT_SCRIPT_URL =
  SHIPROCKET_CHECKOUT_ENV === "staging"
    ? "https://customcheckoutfastrr.netlify.app/assets/js/channels/shopify.js"
    : "https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js";

const SHIPROCKET_CHECKOUT_CSS_URL =
  SHIPROCKET_CHECKOUT_ENV === "staging"
    ? "https://customcheckoutfastrr.netlify.app/assets/styles/shopify.css"
    : "https://checkout-ui.shiprocket.com/assets/styles/shopify.css";

export function ShiprocketCheckoutAssets() {
  return (
    <>
      {/* afterInteractive so it never blocks initial page load/hydration */}
      <Script src={SHIPROCKET_CHECKOUT_SCRIPT_URL} strategy="afterInteractive" />
      {/* The widget only opens on click, so its styles can load after first paint */}
      <DeferredStylesheet href={SHIPROCKET_CHECKOUT_CSS_URL} />
    </>
  );
}
