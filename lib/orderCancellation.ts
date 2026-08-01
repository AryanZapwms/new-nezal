import { cancelShiprocketOrder } from "@/lib/shiprocket"
import { refundCCAvenueOrder } from "@/lib/ccavenue"
import { sendEmail } from "@/lib/email"
import { BRAND } from "@/lib/config"

function orderCancelledEmail({ customerName, orderNumber, totalAmount, reason, refundInitiated }: {
  customerName: string; orderNumber: string; totalAmount: number; reason?: string; refundInitiated: boolean
}) {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #b91c1c;">Your order has been cancelled</h2>
      <p>Hi ${customerName},</p>
      <p>Your order <b>${orderNumber}</b> has been cancelled${reason ? ` (${reason})` : ""}.</p>
      ${refundInitiated
        ? `<p>A refund of <b>₹${totalAmount.toFixed(2)}</b> has been initiated to your original payment method. It typically takes 5–7 business days to reflect, depending on your bank.</p>`
        : `<p>No payment was collected on this order, so no refund is due.</p>`}
      <p>You can check the latest status anytime from <a href="${process.env.NEXT_PUBLIC_SITE_URL}/profile/orders">your orders page</a>.</p>
      <p>Questions? Email us at <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a> or call +91 ${BRAND.whatsapp.primary} — we typically respond within 24 hours.</p>
    </div>
  `
}

interface FinalizeOptions {
  reason: string
  adminNote?: string | null
  /** true when Shiprocket already shows the shipment as cancelled — skip re-cancelling there */
  skipShiprocketCancel?: boolean
}

/**
 * Single source of truth for "an order is now cancelled": cancels the
 * Shiprocket shipment (unless already cancelled there), attempts a CCAvenue
 * refund if eligible, updates the order + cancellation record, and emails
 * the customer. Used by both the admin Cancel button and the Shiprocket
 * webhook, so every cancellation path behaves identically.
 */
export async function finalizeOrderCancellation(order: any, opts: FinalizeOptions) {
  if (!opts.skipShiprocketCancel && order.shiprocketOrderId) {
    try {
      await cancelShiprocketOrder(order.shiprocketOrderId)
    } catch (err) {
      console.error(`Shiprocket cancel failed for order ${order._id}:`, err)
    }
  }

  const eligibleForRefund =
    order.paymentMethod === "ccavenue" &&
    order.paymentStatus === "completed" &&
    !!order.ccavenueTrackingId

  let refundInitiated = false

  if (!eligibleForRefund) {
    order.cancellation.refund = {
      status: "not_applicable",
      amount: null, initiatedAt: null, completedAt: null,
      refundRefNo: null, failureReason: null, rawResponse: null,
    }
  } else {
    const refundRefNo = `${order._id}-${Date.now()}`
    order.cancellation.refund = {
      status: "initiated",
      amount: order.totalAmount,
      initiatedAt: new Date(),
      refundRefNo,
      completedAt: null, failureReason: null, rawResponse: null,
    }
    try {
      const result = await refundCCAvenueOrder({
        referenceNo: order.ccavenueTrackingId,
        refundAmount: order.totalAmount,
        refundRefNo,
      })
      order.cancellation.refund.rawResponse = result.raw
      if (result.success) {
        order.cancellation.refund.status = "success"
        order.cancellation.refund.completedAt = new Date()
        order.paymentStatus = "refunded"
        refundInitiated = true
      } else {
        order.cancellation.refund.status = "failed"
        order.cancellation.refund.failureReason = result.errorDesc || "Refund failed"
        console.error(`CCAvenue refund failed for order ${order._id}:`, result.errorDesc, result.raw)
      }
    } catch (err: any) {
      order.cancellation.refund.status = "failed"
      order.cancellation.refund.failureReason = err.message
      console.error(`CCAvenue refund threw for order ${order._id}:`, err)
    }
  }

  order.orderStatus = "cancelled"
  order.shippingStatus = "cancelled"
  order.cancellation.status = "completed"
  order.cancellation.type = order.cancellation.type || "cancel"
  order.cancellation.reason = order.cancellation.reason || opts.reason
  order.cancellation.processedAt = new Date()
  if (opts.adminNote) order.cancellation.adminNote = opts.adminNote

  await order.save()

  const email = order.guestEmail || order.shippingAddress?.email
  const name = order.guestName || order.shippingAddress?.name || "Customer"
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `Order Cancelled - ${order.orderNumber}`,
        html: orderCancelledEmail({
          customerName: name,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          reason: opts.reason,
          refundInitiated,
        }),
      })
    } catch (err) {
      console.error(`Failed to send cancellation email for order ${order._id}:`, err)
    }
  }

  return { refundInitiated }
}