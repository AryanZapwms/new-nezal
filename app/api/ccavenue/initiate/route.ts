// app/api/ccavenue/initiate/route.ts
/**
 * Initiates a CCAvenue payment.
 * Returns the encrypted request + access code + transaction URL.
 * The client then auto-submits a hidden form POSTing to CCAvenue's URL,
 * which redirects the browser to the hosted payment page.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildCCAvenueRequest } from "@/lib/ccavenue";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";

// CCAvenue transaction URLs (use the test one only if you're explicitly in sandbox mode)
const CCAVENUE_LIVE_URL =
  "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction";
const CCAVENUE_TEST_URL =
  "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

export async function POST(req: NextRequest) {
  try {
     const body = await req.json();
    const { orderId, billingName, billingEmail, billingPhone, billingAddress, billingCity, billingState, billingZip, billingCountry } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const amount = order.totalAmount; 

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { encRequest, accessCode } = buildCCAvenueRequest({
      orderId,
      amount,
      redirectUrl: `${siteUrl}/api/ccavenue/response`,
      cancelUrl: `${siteUrl}/api/ccavenue/response`,
      billingName: billingName ?? "Customer",
      billingEmail: billingEmail ?? "",
      billingPhone: billingPhone ?? "",
      billingAddress: billingAddress ?? "",
      billingCity: billingCity ?? "",
      billingState: billingState ?? "",
      billingZip: billingZip ?? "",
      billingCountry: billingCountry ?? "India",
    });

    const isTestMode = process.env.CCAVENUE_MODE === "test";

    return NextResponse.json({
      encRequest,
      accessCode,
      actionUrl: isTestMode ? CCAVENUE_TEST_URL : CCAVENUE_LIVE_URL,
    });
  } catch (err: any) {
    console.error("CCAvenue initiate error:", err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to initiate CCAvenue payment" },
      { status: 500 }
    );
  }
}