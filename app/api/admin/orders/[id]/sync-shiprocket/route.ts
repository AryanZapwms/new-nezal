import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { getShiprocketOrderStatus } from "@/lib/shiprocket"
import { finalizeOrderCancellation } from "@/lib/orderCancellation"

const CANCELLED_STATUSES = ["CANCELLED", "CANCELED"]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await connectDB()
  const order = await Order.findById(id)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (!order.shiprocketOrderId) {
    return NextResponse.json({ error: "No Shiprocket order linked yet" }, { status: 400 })
  }

  const remote = await getShiprocketOrderStatus(order.shiprocketOrderId)
  console.log(`Shiprocket status for order ${order._id}:`, JSON.stringify(remote.raw))

  if (CANCELLED_STATUSES.includes(remote.status) && order.cancellation?.status !== "completed") {
  order.cancellation = {
    status: "requested",
    type: "cancel",
    reason: order.cancellation?.reason || null,
    note: order.cancellation?.note || null,
    requestedAt: order.cancellation?.requestedAt || new Date(),
    processedAt: null,
    adminNote: order.cancellation?.adminNote || null,
  }
  await finalizeOrderCancellation(order, {
    reason: "cancelled directly in Shiprocket",
    skipShiprocketCancel: true,
  })
  return NextResponse.json({ success: true, synced: "cancellation", order })
}

  return NextResponse.json({ success: true, synced: "no_change", currentStatus: remote.status, order })
}