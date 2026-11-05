// components/shiprocket-checkout-assets.tsx
//
// Shiprocket Custom Checkout widget script + stylesheet (window.HeadlessCheckout,
// used by hooks/use-shiprocket-checkout.ts). Only the cart page and the product
// page use the widget, so this is rendered from those routes' layouts rather
// than app/layout.tsx — every other page no longer loads a render-blocking
// third-party stylesheet (plus the Google Font it @imports) and the script.
// (Abandoned-cart recovery links load the script on any page instead — see
// components/shiprocket-cart-resume.tsx.)
//
// Server component on purpose: SHIPROCKET_CHECKOUT_ENV is a server-only env var.

import { DeferredStylesheet } from "@/components/deferred-stylesheet"
import { ShiprocketCheckoutScript } from "@/components/shiprocket-checkout-script"
import { SHIPROCKET_CHECKOUT_CSS_URL, SHIPROCKET_CHECKOUT_SCRIPT_URL } from "@/lib/shiprocket-checkout-urls"

export function ShiprocketCheckoutAssets() {
  return (
    <>
      <ShiprocketCheckoutScript src={SHIPROCKET_CHECKOUT_SCRIPT_URL} />
      {/* The widget only opens on click, so its styles can load after first paint */}
      <DeferredStylesheet href={SHIPROCKET_CHECKOUT_CSS_URL} />
    </>
  );
}
