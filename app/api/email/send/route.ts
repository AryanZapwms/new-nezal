// app/api/email/send/route.ts
//
// Lets a signed-in customer trigger a transactional email to THEMSELVES.
// The recipient is always the session's account email — a `to` pointing
// anywhere else is rejected, so this can't be used to send Nezal-branded
// mail to arbitrary addresses. Order confirmations are built server-side
// from an order the caller owns (lib/order-access.ts), never from
// client-supplied order data.
import mongoose from "mongoose"
import { sendEmail, getOrderConfirmationEmail, getPaymentFailedEmail } from "@/lib/email"
import { orderSummaryFields, type EmailContent } from "@/lib/email-templates"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import "@/lib/models/product"
import { isOrderOwnedBy } from "@/lib/order-access"

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "")

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accountEmail = normalizeEmail(session?.user?.email)
    const userId = (session?.user as any)?.id
    if (!session || !accountEmail || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, to, subject, data, orderId } = body ?? {}

    if (to !== undefined && to !== null && to !== "" && normalizeEmail(to) !== accountEmail) {
      return NextResponse.json({ error: "Emails can only be sent to your own account email." }, { status: 403 })
    }

    let email: EmailContent

    switch (type) {
      case "order-confirmation": {
        if (typeof orderId !== "string" || !orderId) {
          return NextResponse.json({ error: "orderId is required" }, { status: 400 })
        }
        await connectDB()
        const order: any = await Order.findOne(
          mongoose.Types.ObjectId.isValid(orderId) ? { _id: orderId } : { orderNumber: orderId },
        )
          .populate("items.product", "name")
          .lean()
        if (!order || !isOrderOwnedBy(order, { _id: userId, email: accountEmail })) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }
        email = getOrderConfirmationEmail({
          orderId: order.orderNumber,
          customerName: order.shippingAddress?.name || session.user?.name || "Customer",
          items: (order.items || []).map((item: any) => ({
            name: item.product?.name || "Product",
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize?.size ? item.selectedSize : undefined,
          })),
          total: order.totalAmount,
          orderDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
          paymentStatus: order.paymentStatus,
          ...orderSummaryFields(order),
        })
        break
      }
      case "payment-failed": {
        const failedEmail = getPaymentFailedEmail({
          customerName: cleanText(data?.customerName, 100) || session.user?.name || "Customer",
          totalAmount: Number(data?.totalAmount) || 0,
          reason: cleanText(data?.reason, 300) || undefined,
        })
        // The checkout page names the specific failure in `subject`; fall back to the template's.
        email = { ...failedEmail, subject: cleanText(subject, 150) || failedEmail.subject }
        break
      }
      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    const sent = await sendEmail({ to: accountEmail, ...email })

    if (sent) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    )
  }
}
