import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import { cancelShiprocketOrder } from "@/lib/shiprocket"

const VALID_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery taking too long",
  "Product is defective/damaged",
  "Other",
]

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { reason, note } = await request.json()
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Please select a valid reason" }, { status: 400 })
    }

    const order = await Order.findOne({ _id: id, user: user._id })
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    if (order.orderStatus === "cancelled") {
      return NextResponse.json({ error: "This order is already cancelled" }, { status: 400 })
    }
    if (["requested", "approved", "completed"].includes(order.cancellation?.status)) {
      return NextResponse.json({ error: "A request is already in progress for this order" }, { status: 400 })
    }

    const isShipped =
      Boolean(order.awbCode) ||
      ["shipped", "out_for_delivery", "delivered", "rto_initiated", "rto_delivered"].includes(order.shippingStatus)

    if (!isShipped) {
      if (order.shiprocketOrderId) {
        try {
          await cancelShiprocketOrder(order.shiprocketOrderId)
        } catch (err) {
          console.error(`Shiprocket cancel failed for order ${order._id}:`, err)
        }
      }
      order.orderStatus = "cancelled"
      order.shippingStatus = "cancelled"
      order.cancellation = {
        status: "completed",
        type: "cancel",
        reason,
        note: note || null,
        requestedAt: new Date(),
        processedAt: new Date(),
        adminNote: null,
      }
      await order.save()
      return NextResponse.json({ success: true, type: "cancel", order })
    }

    order.cancellation = {
      status: "requested",
      type: "return",
      reason,
      note: note || null,
      requestedAt: new Date(),
      processedAt: null,
      adminNote: null,
    }
    await order.save()
    return NextResponse.json({ success: true, type: "return", order })
  } catch (error) {
    console.error("Error processing cancellation request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}