// app/api/cart/route.ts
//
// Server-side mirror of the Zustand cart. GET is read-only and never mints a
// guest cart token. PUT accepts a partial update: `items`, when present,
// replaces the server copy of the cart wholesale (lib/store/cart-sync.ts
// always sends this on every real cart mutation); `guestPhone` and/or
// `whatsappConsent`, when present, are set independently
// (components/checkout-form.tsx sends these alone, without `items`, when
// the phone field is confirmed or the WhatsApp-consent checkbox changes —
// see lib/store/cart-sync.ts's syncCartContactInfo). `items` is genuinely
// optional here, not just "empty array means clear" — omitting it must
// leave the cart's items untouched, or every contact-info-only PUT would
// silently wipe the shopper's cart.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import {
  resolveCartIdentity,
  getOrCreateActiveCart,
  getSerializedCartForIdentity,
  sanitizeCartItems,
  sanitizeGuestPhone,
  setCartTokenCookie,
} from "@/lib/cart-server"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const identity = await resolveCartIdentity(request)
    const { items, guestPhone, whatsappConsent } = await getSerializedCartForIdentity(identity)
    return NextResponse.json({ items, guestPhone, whatsappConsent })
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    await connectDB()
    const identity = await resolveCartIdentity(request)
    const { cart, newGuestToken } = await getOrCreateActiveCart(identity)

    // One atomic $set rather than load → mutate → save(). The client fires
    // several PUTs for the same cart close together (debounced item sync,
    // pagehide/visibilitychange flushes, contact-info syncs); with save(),
    // replacing `items` bumps __v and every concurrent save but one failed
    // with a VersionError. Items were already replaced wholesale, so
    // last-write-wins is the same semantics without the conflict.
    const $set: Record<string, unknown> = { lastActivityAt: new Date() }
    let itemCount = cart.items.length

    if (Array.isArray(body?.items)) {
      const items = sanitizeCartItems(body.items)
      $set.items = items
      itemCount = items.length
    }

    if (body?.guestPhone !== undefined) {
      // Invalid input (fails sanitization) is dropped rather than clearing
      // an already-stored phone — same "lightweight validation, ignore
      // garbage" posture as sanitizeCartItems.
      const cleanPhone = sanitizeGuestPhone(body.guestPhone)
      if (cleanPhone) $set.guestPhone = cleanPhone
    }

    if (typeof body?.whatsappConsent === "boolean") {
      $set.whatsappConsent = body.whatsappConsent
    }

    // status: "active" guard — if the cart converted/merged in the meantime,
    // leave that history alone rather than writing into it.
    await Cart.updateOne({ _id: cart._id, status: "active" }, { $set })

    const res = NextResponse.json({ success: true, itemCount })
    if (newGuestToken) setCartTokenCookie(res, newGuestToken)
    return res
  } catch (error) {
    console.error("Error syncing cart:", error)
    // Sync failures must never surface to the shopper — lib/store/cart-sync.ts
    // already treats this as fire-and-forget and just logs client-side.
    return NextResponse.json({ success: false, error: "Failed to sync cart" }, { status: 500 })
  }
}
