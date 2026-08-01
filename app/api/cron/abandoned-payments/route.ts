// app/api/cron/abandoned-payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { sendEmail, getAbandonedPaymentEmail } from "@/lib/email"

const ABANDONED_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "+91 00000 00000" // ← set your real support number

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const cutoff = new Date(Date.now() - ABANDONED_THRESHOLD_MS)

  // Only ccavenue orders — a pending Order row for razorpay is never created
  // until payment succeeds, so there's nothing to find for that method here.
  const abandonedOrders = await Order.find({
    paymentMethod: "ccavenue",
    paymentStatus: "pending",
    abandonedEmailSentAt: null,
    createdAt: { $lte: cutoff },
  })

  let sentCount = 0

  for (const order of abandonedOrders) {
    const recipientEmail = order.guestEmail || (order.shippingAddress as any)?.email
    const recipientName = order.guestName || order.shippingAddress?.name || "Customer"

    if (!recipientEmail) continue

    try {
      const html = getAbandonedPaymentEmail({
        customerName: recipientName,
        orderId: order.orderNumber,
        totalAmount: order.totalAmount,
        supportPhone: SUPPORT_PHONE,
      })

      const sent = await sendEmail({
        to: recipientEmail,
        subject: `You left something behind - Order ${order.orderNumber}`,
        html,
      })

      if (sent) {
        await Order.findByIdAndUpdate(order._id, { abandonedEmailSentAt: new Date() })
        sentCount++
      }
    } catch (err) {
      console.error(`Failed to send abandoned-payment email for order ${order._id}:`, err)
    }
  }

  return NextResponse.json({ checked: abandonedOrders.length, sent: sentCount })
}