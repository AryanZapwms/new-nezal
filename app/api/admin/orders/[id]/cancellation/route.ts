// app/api/admin/orders/[id]/cancellation/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { finalizeOrderCancellation } from "@/lib/orderCancellation"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { action, adminNote } = await req.json()

  await connectDB()
  const order = await Order.findById(id)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  if (action !== "admin_cancel" && (!order.cancellation || order.cancellation.status === "none")) {
    return NextResponse.json({ error: "No request on this order" }, { status: 400 })
  }

  if (action === "admin_cancel") {
    if (order.orderStatus === "cancelled") {
      return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 })
    }
    if (order.orderStatus === "delivered") {
      return NextResponse.json({ error: "Delivered orders can't be cancelled this way" }, { status: 400 })
    }
    order.cancellation = {
      status: "requested", // finalizeOrderCancellation flips this to "completed"
      type: "cancel",
      reason: "Cancelled by admin",
      note: order.cancellation?.note || null,
      requestedAt: order.cancellation?.requestedAt || new Date(),
      processedAt: null,
      adminNote: adminNote || null,
    }
    await finalizeOrderCancellation(order, { reason: "cancelled by our team", adminNote })
    return NextResponse.json({ success: true, order })

  } else if (action === "approve") {
    order.cancellation.status = "approved"
    order.cancellation.processedAt = new Date()
    order.cancellation.adminNote = adminNote || null
    await order.save()
    return NextResponse.json({ success: true, order })

  } else if (action === "reject") {
    order.cancellation.status = "rejected"
    order.cancellation.processedAt = new Date()
    order.cancellation.adminNote = adminNote || null
    await order.save()
    return NextResponse.json({ success: true, order })

  } else if (action === "complete") {
    await finalizeOrderCancellation(order, { reason: order.cancellation.reason || "return completed", adminNote })
    return NextResponse.json({ success: true, order })

  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }
}