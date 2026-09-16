// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  await connectDB()
  const order = await Order.findById(id)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  // Orders with a live Shiprocket shipment must be cancelled (via the
  // existing Cancel action, which also cancels the Shiprocket shipment)
  // before they can be deleted — deleting never touches Shiprocket itself.
  //
  // shiprocketOrderId holds a DIFFERENT Shiprocket product's id (the
  // checkout/fastrr order id) for shiprocket_checkout orders, so it's
  // always set for them regardless of whether a real logistics shipment
  // exists — only shiprocketLogisticsOrderId means one actually does. Other
  // payment methods still use shiprocketOrderId as before. See
  // lib/models/order.ts for the full explanation.
  const hasShipment =
    order.paymentMethod === "shiprocket_checkout"
      ? !!order.shiprocketLogisticsOrderId
      : !!order.shiprocketOrderId
  if (hasShipment) {
    return NextResponse.json(
      { error: "This order has a Shiprocket shipment. Cancel it first, then delete." },
      { status: 400 }
    )
  }

  await Order.deleteOne({ _id: id })
  return NextResponse.json({ success: true })
}
