import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import { sendEmail, getOrderStatusUpdateEmail } from "@/lib/email"
import "@/lib/models/product"
import "@/lib/models/user"
import { BRAND } from "@/lib/config"
import { isOrderOwnedBy } from "@/lib/order-access"
import mongoose from "mongoose"


// Every failure carries a machine-readable `code` alongside the human
// `error` message so app/profile/orders/[id]/page.tsx can show the customer
// the actual reason instead of one generic "failed to fetch".
function orderError(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status })
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let id: string | undefined
  try {
    ;({ id } = await context.params)

    const session = await getServerSession()
    if (!session?.user?.email) {
      return orderError(401, "UNAUTHENTICATED", "Please sign in to view this order.")
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`[orders/:id] Invalid order id "${id}" requested by ${session.user.email}`)
      return orderError(400, "INVALID_ORDER_ID", "This order link is invalid.")
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      console.warn(`[orders/:id] No User record for session email ${session.user.email}`)
      return orderError(401, "USER_NOT_FOUND", "We couldn't find your account. Please sign in again.")
    }

    const order = await Order.findById(id)
      .populate({
        path: "items.product",
        populate: { path: "company", select: "name slug" },
      })
      .lean()

    if (!order) {
      console.warn(`[orders/:id] Order ${id} not found (requested by user ${user._id})`)
      return orderError(404, "ORDER_NOT_FOUND", "We couldn't find this order.")
    }

    if (!isOrderOwnedBy(order as any, user)) {
      console.warn(
        `[orders/:id] User ${user._id} denied access to order ${id} (order.user=${(order as any).user ?? "none"}, hasGuestEmail=${Boolean((order as any).guestEmail)})`
      )
      return orderError(
        403,
        "ORDER_FORBIDDEN",
        "This order isn't linked to your account. Sign in with the email address you used at checkout to view it."
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error(`[orders/:id] Error fetching order ${id}:`, error)
    return orderError(500, "SERVER_ERROR", "Something went wrong on our side while loading this order. Please try again.")
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { orderStatus, paymentStatus } = body

    // Cancellations must go through /api/admin/orders/[id]/cancellation —
    // that route handles Shiprocket cancellation, refunds, and the
    // correct customer-facing email. Blocking it here so it can't be
    // bypassed accidentally.
    if (orderStatus === "cancelled") {
      return NextResponse.json(
        { error: "Use the order cancellation endpoint to cancel orders, not this route." },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (orderStatus) updateData.orderStatus = orderStatus
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    const order = await Order.findByIdAndUpdate(id, updateData, { new: true })
      .populate("user")
      .populate("items.product")

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Send status update email
    try {
      if (order.user) {
        const userData = order.user as any
        const itemsData = order.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
        }))

        const emailHtml = getOrderStatusUpdateEmail({
          orderId: order.orderNumber,
          customerName: userData.name,
          orderStatus: order.orderStatus,
          items: itemsData,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        })

        await sendEmail({
          to: userData.email,
          subject: `Order Status Updated - ${order.orderNumber}`,
          html: emailHtml,
        })
      }
    } catch (emailError) {
      console.error("Failed to send order status update email:", emailError)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
