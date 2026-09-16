// app/api/admin/orders/[id]/ship/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { createShiprocketOrderForOrder } from "@/lib/shiprocket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin only
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();

  const order = await Order.findById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // shiprocketOrderId holds a DIFFERENT Shiprocket product's id (the
  // checkout/fastrr order id) for shiprocket_checkout orders, so it's
  // always set for them regardless of whether a real logistics shipment
  // exists yet — only shiprocketLogisticsOrderId means one actually does.
  // Other payment methods still use shiprocketOrderId as before. See
  // lib/models/order.ts for the full explanation.
  const hasShipment =
    order.paymentMethod === "shiprocket_checkout"
      ? !!order.shiprocketLogisticsOrderId
      : !!order.shiprocketOrderId;

  if (hasShipment) {
    return NextResponse.json(
      { error: "Shipment already created for this order" },
      { status: 400 }
    );
  }

  try {
    // Shared with autoCreateShiprocketOrder() and the Shiprocket Custom
    // Checkout order webhook — one implementation of the item/address
    // building + createShiprocketOrder() call instead of three, so this
    // manual-retry path gets the same phone sanitization and
    // shippingStatus/shiprocketError bookkeeping as the automatic paths.
    const result = await createShiprocketOrderForOrder(id);

    if (!result) {
      // Failure is already logged and recorded on the order itself
      // (shippingStatus/shiprocketError) by createShiprocketOrderForOrder.
      return NextResponse.json(
        { error: "Shiprocket order creation failed — see the order's shiprocketError for details." },
        { status: 500 }
      );
    }

    // shiprocket_checkout orders keep their fastrr id in shiprocketOrderId,
    // so the newly-created logistics order id goes into the separate field
    // instead — same split the order webhook uses.
    const logisticsIdField =
      order.paymentMethod === "shiprocket_checkout" ? "shiprocketLogisticsOrderId" : "shiprocketOrderId";

    await Order.findByIdAndUpdate(id, {
      [logisticsIdField]: result.shiprocketOrderId,
      shiprocketShipmentId: result.shiprocketShipmentId,
      awbCode: result.awbCode ?? null,
      courierName: result.courierName ?? null,
      shippingStatus: "processing",
      shiprocketError: null,
      ...(result.awbCode && {
        trackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`,
      }),
    });

    return NextResponse.json({
      success: true,
      shiprocketOrderId: result.shiprocketOrderId,
      shiprocketShipmentId: result.shiprocketShipmentId,
      awbCode: result.awbCode,
      courierName: result.courierName,
    });
  } catch (err: any) {
    console.error("Shiprocket error:", err.message);
    return NextResponse.json(
      { error: err.message ?? "Shiprocket order creation failed" },
      { status: 500 }
    );
  }
}