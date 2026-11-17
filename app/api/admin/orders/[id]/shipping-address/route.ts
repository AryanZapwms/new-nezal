// app/api/admin/orders/[id]/shipping-address/route.ts
//
// Lets an admin correct an order's shipping address before (re)creating its
// Shiprocket shipment — e.g. after "Shipment failed" in /admin/orders — instead
// of creating the shipment by hand in Shiprocket. Only while the order has no
// shipment: after that, Shiprocket's copy is the one the courier uses. The
// previous address is kept in the order's review notes.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { formatShippingAddress, parseShippingAddressEdit } from "@/lib/shiprocket-address";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin only
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseShippingAddressEdit(await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  await connectDB();

  const order: any = await Order.findById(id)
    .select("paymentMethod shiprocketOrderId shiprocketLogisticsOrderId orderStatus shippingAddress")
    .lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.orderStatus === "cancelled") {
    return NextResponse.json({ error: "This order is cancelled." }, { status: 409 });
  }

  // Same "has a shipment" rule as app/api/admin/orders/[id]/ship:
  // shiprocket_checkout orders keep Shiprocket's checkout id in
  // shiprocketOrderId, so only shiprocketLogisticsOrderId counts for them.
  const shipmentField =
    order.paymentMethod === "shiprocket_checkout" ? "shiprocketLogisticsOrderId" : "shiprocketOrderId";
  if (order[shipmentField]) {
    return NextResponse.json(
      { error: "This order already has a Shiprocket shipment. Change the address in Shiprocket instead." },
      { status: 409 }
    );
  }

  const a = parsed.value;
  const note = `Shipping address edited in admin by ${session.user.email ?? "an admin"} on ${new Date().toISOString()}. Previous: ${formatShippingAddress(order.shippingAddress)}`;

  // The filter re-checks "no shipment yet", in case one was created meanwhile
  const updated: any = await Order.findOneAndUpdate(
    { _id: id, [shipmentField]: null },
    {
      $set: {
        "shippingAddress.name": a.name,
        "shippingAddress.phone": a.phone,
        // Stored under both names, like every order (app/api/orders/route.ts)
        "shippingAddress.address": a.address,
        "shippingAddress.street": a.address,
        "shippingAddress.city": a.city,
        "shippingAddress.state": a.state,
        "shippingAddress.pincode": a.pincode,
        "shippingAddress.zipCode": a.pincode,
        "shippingAddress.country": a.country,
      },
      $push: { reviewNotes: note },
    },
    { returnDocument: "after", projection: { shippingAddress: 1, reviewNotes: 1, needsReview: 1 } }
  ).lean();

  if (!updated) {
    return NextResponse.json(
      { error: "This order got a Shiprocket shipment meanwhile. Change the address in Shiprocket instead." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    shippingAddress: updated.shippingAddress,
    reviewNotes: updated.reviewNotes ?? [],
    needsReview: !!updated.needsReview,
  });
}
