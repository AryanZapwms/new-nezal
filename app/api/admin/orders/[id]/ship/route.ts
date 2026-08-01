// app/api/admin/orders/[id]/ship/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { createShiprocketOrder } from "@/lib/shiprocket";

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

  const order = await Order.findById(id).populate("items.product");

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.shiprocketOrderId) {
    return NextResponse.json(
      { error: "Shipment already created for this order" },
      { status: 400 }
    );
  }

  const addr = order.shippingAddress;

  // Build items array from order
 const items = order.items.map((item: any) => ({
  name: item.product?.name ?? "Product",
  sku: item.product?.sku ?? "SKU",
  units: item.quantity,
  selling_price: item.price,
  weight: item.product?.weight ?? 0.3,
  gstPercent: item.product?.gstPercent ?? 0,
  hsn: item.product?.hsn ?? "",
}));

const goodsTotal = order.items.reduce(
  (sum: number, item: any) => sum + item.price * item.quantity,
  0
);

  const shippingAddress = {
    name: addr?.name ?? order.guestName ?? "Customer",
    phone: addr?.phone ?? order.guestPhone ?? "",
    email: order.guestEmail ?? (session.user as any).email ?? "",
    address: addr?.address ?? addr?.street ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    pincode: String(addr?.pincode ?? addr?.zipCode ?? ""),
    country: addr?.country ?? "India",
  };

  try {
    const result = await createShiprocketOrder({
  orderId: order._id.toString(),
  orderDate: new Date(order.createdAt).toISOString().split("T")[0],
  items,
  shipping: shippingAddress,
  billing: shippingAddress,
  paymentMethod: order.paymentMethod === "cod" ? "COD" : "Prepaid",
  subTotal: goodsTotal,
  shippingCharges: order.shippingAmount ?? 0,   // ← was hardcoded 0
  totalDiscount: order.discountAmount ?? 0,
});

    // Save Shiprocket IDs back to order
    await Order.findByIdAndUpdate(id, {
      shiprocketOrderId: result.shiprocketOrderId,
      shiprocketShipmentId: result.shiprocketShipmentId,
      awbCode: result.awbCode ?? null,
      courierName: result.courierName ?? null,
      shippingStatus: "processing",
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