// app/api/shiprocket/initiate-checkout/route.ts
//
// Called by OUR OWN frontend (logged-in or guest) to start a Shiprocket
// Custom Checkout session for the current cart — NOT called by Shiprocket,
// so no X-Api-Key auth on this route itself (that's for THEM calling US;
// this is the other direction). The actual Shiprocket call is signed with
// SHIPROCKET_CHECKOUT_API_KEY/SECRET inside lib/shiprocket-checkout.ts.
//
// Cart items are re-validated against the live Product/size documents
// inside initiateShiprocketCheckout() — never trust quantity/stock implied
// by the client, same principle as every other order/checkout route in
// this codebase.

import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  initiateShiprocketCheckout,
  ShiprocketCheckoutValidationError,
  type ShiprocketCheckoutCartItem,
} from "@/lib/shiprocket-checkout";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cartItems: ShiprocketCheckoutCartItem[] = body?.cartItems;
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ error: "cartItems must be a non-empty array" }, { status: 400 });
  }

  const redirectPath: string | undefined = typeof body?.redirectPath === "string" ? body.redirectPath : undefined;

  try {
    await connectDB();

    const result = await initiateShiprocketCheckout(cartItems, redirectPath);

    // Only what the frontend actually needs — not Shiprocket's raw response
    // shape, and definitely not the API secret used to sign the request.
    return NextResponse.json({ token: result.token, orderId: result.orderId });
  } catch (error) {
    if (error instanceof ShiprocketCheckoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[shiprocket-initiate-checkout] Failed to start checkout:", error);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 502 });
  }
}
