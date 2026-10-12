// app/api/cart/recover/route.ts
//
// The link sent when a customer taps "Complete order" on the WhatsApp cart
// reminder (app/api/webhooks/whatsapp). A guest cart is tied to one browser
// by its cart-token cookie, and WhatsApp often opens links in a different
// browser from the one the cart was built in (an in-app browser, say). This
// hands that cookie to whichever browser opens the link, then lands on
// /cart — where components/cart-hydrator.tsx adopts the server cart under
// its existing rule: only when the local cart is empty. Nothing is written
// to the database.
//
// The token is the cart's own guestToken — an unguessable UUID, and already
// the credential for that cart.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { CART_TOKEN_COOKIE, findActiveCart, setCartTokenCookie } from "@/lib/cart-server"

const TOKEN_PATTERN = /^[0-9a-f-]{36}$/i

export async function GET(request: NextRequest) {
  // Same NEXT_PUBLIC_SITE_URL-with-localhost-fallback pattern as the other
  // redirecting routes (app/api/ccavenue/response/route.ts) — request.url
  // can't be trusted for the host behind the proxy.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const res = NextResponse.redirect(`${siteUrl}/cart`)

  const token = request.nextUrl.searchParams.get("token") ?? ""
  if (!TOKEN_PATTERN.test(token)) return res

  try {
    await connectDB()

    // Already ordered, merged into an account, or never existed: just the
    // cart page.
    if (!(await Cart.exists({ guestToken: token, status: "active" }))) return res

    // A browser that already holds a cart of its own keeps it. Swapping its
    // cookie would make the next sync overwrite the reminded cart with this
    // browser's items.
    const currentToken = request.cookies.get(CART_TOKEN_COOKIE)?.value
    if (currentToken && currentToken !== token) {
      const currentCart: any = await findActiveCart({ kind: "guest", guestToken: currentToken })
      if (currentCart?.items?.length) return res
    }

    setCartTokenCookie(res, token)
  } catch (error) {
    // Still land on the cart page — a broken link is worse than an empty cart.
    console.error("Error recovering cart:", error)
  }

  return res
}
