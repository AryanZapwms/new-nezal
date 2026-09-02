// app/api/cart/route.ts
//
// Server-side mirror of the Zustand cart. GET is read-only and never mints a
// guest cart token. PUT accepts the client's complete current items array
// (lib/store/cart-sync.ts) and replaces the server copy wholesale — there
// are deliberately no separate add/remove/update-quantity endpoints, since
// the client already computes the resulting cart state.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import {
  resolveCartIdentity,
  getOrCreateActiveCart,
  getSerializedCartForIdentity,
  sanitizeCartItems,
  setCartTokenCookie,
} from "@/lib/cart-server"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const identity = await resolveCartIdentity(request)
    const items = await getSerializedCartForIdentity(identity)
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const items = sanitizeCartItems(body?.items)

    await connectDB()
    const identity = await resolveCartIdentity(request)
    const { cart, newGuestToken } = await getOrCreateActiveCart(identity)

    cart.items = items as any
    cart.lastActivityAt = new Date()
    await cart.save()

    const res = NextResponse.json({ success: true, itemCount: items.length })
    if (newGuestToken) setCartTokenCookie(res, newGuestToken)
    return res
  } catch (error) {
    console.error("Error syncing cart:", error)
    // Sync failures must never surface to the shopper — lib/store/cart-sync.ts
    // already treats this as fire-and-forget and just logs client-side.
    return NextResponse.json({ success: false, error: "Failed to sync cart" }, { status: 500 })
  }
}
