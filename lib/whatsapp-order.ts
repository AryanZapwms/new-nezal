// lib/whatsapp-order.ts
//
// The WhatsApp order confirmation (ScaleChat template order_confirmation),
// sent once per order from each place an order becomes a confirmed purchase —
// the same four spots that send the confirmation email:
//   - app/api/orders/route.ts                   own checkout, COD
//   - app/api/razorpay/verify-payment/route.ts  own checkout, Razorpay
//   - app/api/ccavenue/response/route.ts        own checkout, CCAvenue
//   - lib/shiprocket-checkout-order.ts          Shiprocket checkout
//
// Call sites fire it without awaiting (`void sendOrderConfirmationWhatsApp(...)`):
// it never throws, and a slow ScaleChat must not hold up an order.
//
// Test mode is the default — WHATSAPP_ORDER_MODE must be exactly "live" to
// leave it (its own switch, separate from the cart reminder's
// WHATSAPP_REMINDER_MODE). In test mode only an order whose phone is
// WHATSAPP_TEST_PHONE gets a message.
//
// Skipped, never messaged: an order with no usable phone number, and a phone
// that has opted out (lib/models/whatsapp-opt-out.ts).
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"
import { WhatsAppMessageLog } from "@/lib/models/whatsapp-message-log"
import { getWhatsAppTestMode, sendWhatsAppTemplate, toWhatsAppPhone } from "@/lib/whatsapp"

// Approved in ScaleChat with three body variables — customer name, order
// number, total — and no buttons. The body carries its own ₹ sign, so the
// total goes in as digits only.
const ORDER_TEMPLATE = "order_confirmation"
const ORDER_TEMPLATE_LANGUAGE = "en"

const TAG = "[order-whatsapp]"

// "1,249", "1,25,000", "1,249.50" — Indian digit grouping, paise only when
// the total has any.
export function formatOrderTotal(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

async function saveLog(entry: Record<string, unknown>) {
  try {
    await WhatsAppMessageLog.create({ ...entry, templateName: ORDER_TEMPLATE })
  } catch (err) {
    // The console line already recorded the outcome.
    console.error(`${TAG} failed to save message log:`, err)
  }
}

export async function sendOrderConfirmationWhatsApp(orderId: mongoose.Types.ObjectId | string): Promise<void> {
  try {
    // Checked before touching the database, so an environment without
    // ScaleChat set up does no work here at all.
    if (!process.env.SCALECHAT_API_KEY) {
      console.warn(`${TAG} not sent for order ${orderId}: SCALECHAT_API_KEY is not set`)
      return
    }

    await connectDB()

    const order: any = await Order.findById(orderId)
      .select("orderNumber totalAmount shippingAddress.name shippingAddress.phone guestName guestPhone whatsappConfirmationSentAt")
      .lean()
    if (!order) {
      console.warn(`${TAG} not sent: order ${orderId} not found`)
      return
    }
    if (order.whatsappConfirmationSentAt) return

    // Last 10 digits — the form the opt-out list and WHATSAPP_TEST_PHONE are
    // compared in.
    const phone = String(order.shippingAddress?.phone || order.guestPhone || "")
      .replace(/\D/g, "")
      .slice(-10)
    if (phone.length !== 10) {
      console.warn(`${TAG} ${order.orderNumber} skipped: no usable phone number`)
      return
    }

    const { testMode, testPhone } = getWhatsAppTestMode("WHATSAPP_ORDER_MODE")
    if (testMode && phone !== testPhone) {
      console.log(`${TAG} ${order.orderNumber} skipped: test mode — not the test number`)
      return
    }

    if (await WhatsAppOptOut.exists({ phone })) {
      console.log(`${TAG} ${order.orderNumber} skipped: phone has opted out`)
      return
    }

    // Claim before sending — only the caller that flips
    // whatsappConfirmationSentAt from null gets to send, so a repeated
    // payment callback, or the Shiprocket webhook racing the success page,
    // can't message the customer twice. The claim is kept even when the send
    // fails: nothing retries an order confirmation.
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, whatsappConfirmationSentAt: null },
      { $set: { whatsappConfirmationSentAt: new Date() } },
    )
    if (!claimed) return

    // Body placeholders, in the order the template was approved with.
    const firstName = String(order.shippingAddress?.name || order.guestName || "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 40)
    const variables = [firstName || "Customer", String(order.orderNumber), formatOrderTotal(order.totalAmount)]

    const mode = testMode ? "test" : "live"
    const logEntry = { order: order._id, phone: toWhatsAppPhone(phone), variables, mode, attempt: 1 }
    const line = `${order.orderNumber} phone=******${phone.slice(-4)} mode=${mode}`

    try {
      const response = await sendWhatsAppTemplate({
        phone,
        templateName: ORDER_TEMPLATE,
        language: ORDER_TEMPLATE_LANGUAGE,
        variables,
      })
      console.log(`${TAG} sent ${line}`)
      await saveLog({ ...logEntry, status: "sent", response })
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown error"
      console.error(`${TAG} failed ${line} error=${error}`)
      await saveLog({ ...logEntry, status: "failed", error })
    }
  } catch (err) {
    console.error(`${TAG} unexpected error for order ${orderId}:`, err)
  }
}
