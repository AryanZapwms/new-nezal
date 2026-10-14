// app/shop/[company]/product/[id]/layout.tsx
//
// The product page's Shop Now / Buy Now buttons open the Shiprocket checkout
// widget (hooks/use-shiprocket-checkout.ts), so its assets load on this route.
import type React from "react"
import { ShiprocketCheckoutAssets } from "@/components/shiprocket-checkout-assets"

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShiprocketCheckoutAssets />
      {children}
    </>
  )
}
