// app/api/razorpay/verify-payment/route.ts
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email"
import { autoCreateShiprocketOrder } from "@/lib/shiprocket"
import { sendCapiPurchaseEvent, getRequestMeta } from "@/lib/meta-capi"
import { syncUserContactFromOrder } from "@/lib/syncUserContact"
import { CART_TOKEN_COOKIE, getOrCreateActiveCart, markCartConverted, setCartTokenCookie, type CartIdentity } from "@/lib/cart-server"
import { getActiveFlashSaleMap } from "@/lib/flashSale"
import { resolveCurrentPrice } from "@/lib/pricing"
import { validateCouponServerSide, redeemCoupon } from "@/lib/coupon-server"
import { notifyProductWebhook } from "@/lib/shiprocket-webhooks"
import Razorpay from "razorpay"


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})


export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, totalAmount, shippingAmount, couponCode } = await request.json()

    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex")

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

     const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId)

     let computedTotal = 0
const verifiedItems = []
const flashSaleMap = await getActiveFlashSaleMap()
for (const item of items) {
  const product = await Product.findById(item.product)
  if (!product) {
    return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 400 })
  }

  // Resolve price + stock from the selected size variant if one was chosen,
  // and apply whichever sale (flash, direct, or collection) is currently
  // active — see lib/pricing.ts. Matches app/api/orders/route.ts's COD/
  // CCAvenue path so a Razorpay payment charges the same amount.
  let realPrice: number
  let availableStock: number

  if (item.selectedSize?.size) {
    const matchedSize = product.sizes?.find(
      (s: any) =>
        s.size === item.selectedSize.size &&
        (item.selectedSize.sku ? s.sku === item.selectedSize.sku : true)
    )
    if (!matchedSize) {
      return NextResponse.json(
        { error: `Selected size "${item.selectedSize.size}" is no longer available for ${product.name}` },
        { status: 400 }
      )
    }
    const resolved = resolveCurrentPrice(product, flashSaleMap, matchedSize)
    realPrice = resolved.discountPrice ?? resolved.price
    availableStock = matchedSize.stock
  } else {
    const resolved = resolveCurrentPrice(product, flashSaleMap, null)
    realPrice = resolved.discountPrice ?? resolved.price
    availableStock = product.stock
  }

  if (availableStock < item.quantity) {
    return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
  }

  computedTotal += realPrice * item.quantity
  verifiedItems.push({
    product: product._id,
    quantity: item.quantity,
    price: realPrice,
    selectedSize: item.selectedSize,
  })
}
const realShipping = shippingAmount ?? 0

// Coupon: re-validate server-side via the same shared helper Stage 1 uses —
// never trust a discount echoed back by the client. UNLIKE order creation,
// this route runs AFTER Razorpay has already captured the payment (the
// widget's `handler` only fires on a successful charge), so a stale coupon
// here can't be handled by simply rejecting — the customer's money is
// already gone, and rejecting would take it with nothing to show for it.
//
// Option 3 (agreed): if the coupon fails re-validation, don't reject —
// trust razorpayOrder.amount (fetched server-to-server from Razorpay above,
// NOT client-supplied, so this isn't "trusting the client") as the actual
// amount paid, record the coupon as NOT honored (couponCode/discountAmount
// stay null/0), and flag the order via couponDiscrepancy for manual review
// — see app/admin/orders/page.tsx. usedCount is correspondingly NOT
// incremented for a discount that was never actually confirmed.
let verifiedCouponCode: string | null = null
let verifiedDiscountAmount = 0
let couponDiscrepancy: string | null = null

if (couponCode) {
  const couponResult = await validateCouponServerSide(couponCode, computedTotal)
  if (couponResult.valid) {
    verifiedCouponCode = couponResult.coupon.code
    verifiedDiscountAmount = couponResult.discountAmount ?? 0
  } else {
    couponDiscrepancy =
      `Coupon "${couponCode}" was applied at checkout but failed re-validation after payment was already captured by Razorpay (reason: ${couponResult.error}). ` +
      `The captured amount is being honored as paid and the order was created; the coupon's usedCount was NOT incremented. ` +
      `Review and consider a manual partial refund of the discount portion if the coupon should have been honored.`
    console.error(
      `[razorpay/verify-payment] Coupon discrepancy: razorpayOrderId=${razorpayOrderId}, coupon=${couponCode}: ${couponResult.error}`
    )
  }
}

const discountedItemsTotal = Math.max(0, computedTotal - verifiedDiscountAmount)
const realTotal = discountedItemsTotal + realShipping

// Skip the mismatch guard when the only source of a would-be mismatch is a
// coupon we can no longer verify — see the Option 3 comment above. Any
// OTHER drift (item price changed, etc.) still rejects exactly as before;
// this bypass only applies to the specific coupon-invalid case.
if (!couponDiscrepancy) {
  const expectedAmountPaise = Math.round(realTotal * 100)
  if (razorpayOrder.amount !== expectedAmountPaise) {
    console.error(`Amount mismatch: real total ${expectedAmountPaise}, Razorpay paid ${razorpayOrder.amount}`)
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
  }
}

// When the coupon is the discrepancy, the order total is whatever Razorpay
// actually captured (not our undiscounted expectation) — we have no basis
// to claim more money changed hands than really did.
const finalOrderTotal = couponDiscrepancy ? razorpayOrder.amount / 100 : realTotal

    await connectDB()

    const session = await getServerSession()
    let user = null

    if (session?.user?.email) {
      user = await User.findOne({ email: session.user.email })
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    } else {
      if (!shippingAddress?.email) {
        return NextResponse.json(
          { error: "Email is required to place an order" },
          { status: 400 }
        )
      }
    }

    // Idempotency check (unchanged)
    let existingOrder = await Order.findOne({ razorpayPaymentId })
    if (existingOrder) {
      return NextResponse.json({ success: true, orderId: existingOrder._id })
    }

    // Cart mirror: unlike CCAvenue, this route is hit via a same-origin
    // client fetch (not a cross-site redirect), so the session/guest cookie
    // is reliably present and identity can be resolved here directly.
    // Razorpay never creates a pending local Order before payment succeeds,
    // so this is the first and only place a Razorpay cart gets converted.
    const cartIdentity: CartIdentity = user
      ? { kind: "user", userId: user._id.toString() }
      : { kind: "guest", guestToken: request.cookies.get(CART_TOKEN_COOKIE)?.value || null }
    const { cart: orderCart, newGuestToken } = await getOrCreateActiveCart(cartIdentity)

    // Find a pending order to update — match by user OR guest email
    existingOrder = await Order.findOne(
      user
        ? { user: user._id, paymentMethod: "razorpay", paymentStatus: "pending", totalAmount }
        : { guestEmail: shippingAddress.email, paymentMethod: "razorpay", paymentStatus: "pending", totalAmount }
    ).sort({ createdAt: -1 })

    let order;
    const mappedAddress = {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      address: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zipCode: shippingAddress.zipCode,
      pincode: shippingAddress.zipCode,
      country: shippingAddress.country,
    }

    if (existingOrder) {
  order = await Order.findByIdAndUpdate(
    existingOrder._id,
    {
      razorpayOrderId,
      razorpayPaymentId,
      shippingAmount: shippingAmount ?? existingOrder.shippingAmount ?? 0,   // ← add this
      paymentStatus: "completed",
      orderStatus: "processing",
      cartId: existingOrder.cartId ?? orderCart._id,
    },
    { new: true }
  )
} else {
  const orderNumber = `ORD-${Date.now()}`

  order = await Order.create({
    orderNumber,
    user: user?._id,
    guestEmail: user ? undefined : shippingAddress.email,
    guestName: user ? undefined : shippingAddress.name,
    guestPhone: user ? undefined : shippingAddress.phone,
     items: verifiedItems,
  totalAmount: finalOrderTotal,
  couponCode: verifiedCouponCode,
  discountAmount: verifiedDiscountAmount,
  couponDiscrepancy,
  shippingAmount: realShipping,
    shippingAddress: mappedAddress,
    paymentMethod: "razorpay",
    paymentStatus: "completed",
    orderStatus: "processing",
    razorpayOrderId,
    razorpayPaymentId,
    cartId: orderCart._id,
  })
}

    // Redeem now — payment is confirmed (signature verified, amount
    // checked/reconciled above), so this is the right point for Razorpay,
    // unlike COD which redeems at order-creation time (see
    // app/api/orders/route.ts). If the atomic redeem loses a race (someone
    // else took the literal last use in the same instant), we do NOT fail
    // the response — the payment is already captured and the order already
    // exists; log it rather than bounce a customer who already paid.
    if (verifiedCouponCode) {
      const redeemResult = await redeemCoupon(verifiedCouponCode)
      if (!redeemResult.success) {
        console.error(
          `[razorpay/verify-payment] redeemCoupon lost the race for ${verifiedCouponCode} on order ${order._id}: ${redeemResult.error}`
        )
      }
    }

    // Signature already verified above and payment status is "completed" —
    // this is a confirmed purchase, so convert now.
    await markCartConverted(orderCart._id, order._id)

    if (user) await syncUserContactFromOrder(user._id, mappedAddress);

    await autoCreateShiprocketOrder(order._id.toString())

    await Promise.all(
      items.map(async (item: any) => {
        const quantity = item.quantity ?? 0
        if (quantity && item.product) {
          const updatedProduct = await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -quantity } },
            { new: true }
          )
            .populate("company", "name")
            .populate("category", "name")
          // Fire-and-forget — a Shiprocket outage must never block order confirmation.
          if (updatedProduct) void notifyProductWebhook(updatedProduct.toObject())
        }
      }),
    )

    const recipientEmail = user?.email || shippingAddress.email
    const recipientName = user?.name || shippingAddress.name

    const { clientIp, userAgent, fbp, fbc, eventSourceUrl } = getRequestMeta(request)
    sendCapiPurchaseEvent({
      eventId: order._id.toString(),
      value: order.totalAmount,
      contentIds: verifiedItems.map((item) => item.product.toString()),
      numItems: verifiedItems.length,
      eventSourceUrl,
      user: {
        email: recipientEmail,
        phone: mappedAddress.phone,
        fullName: recipientName,
        city: mappedAddress.city,
        state: mappedAddress.state,
        zip: mappedAddress.zipCode,
        country: mappedAddress.country,
        clientIp,
        userAgent,
        fbp,
        fbc,
      },
    }).catch((err) => console.error("[meta-capi] Razorpay purchase event failed:", err))

    try {
      const populatedOrder = await Order.findById(order._id)
        .populate("items.product")
        .lean()

      if (populatedOrder) {
        const itemsData = populatedOrder.items.map((item: any) => ({
          name: item.product?.name || "Product",
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize,
        }))

        const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

        const confirmationEmailHtml = getOrderConfirmationEmail({
          orderId: order.orderNumber,
          customerName: recipientName,
          items: itemsData,
          total: order.totalAmount,
          orderDate: orderDate,
          paymentStatus: "completed",
        })

        await sendEmail({
          to: recipientEmail,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: confirmationEmailHtml,
        })

        const adminEmailHtml = getAdminOrderNotificationEmail({
          customerName: recipientName,
          customerEmail: recipientEmail,
          customerPhone: user?.phone || shippingAddress.phone || "N/A",
          orderId: order.orderNumber,
          items: itemsData,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          shippingAddress: mappedAddress,
          orderDate: orderDate,
        })

        await sendEmail({
          to: process.env.GMAIL_EMAIL || "nezal@gmail.com",
          subject: `🚨 NEW ORDER - ${order.orderNumber}`,
          html: adminEmailHtml,
        })
      }
    } catch (emailError) {
      console.error("Failed to send order emails:", emailError)
    }

    const response = NextResponse.json({
      success: true,
      orderId: order._id,
    })
    if (newGuestToken) setCartTokenCookie(response, newGuestToken)
    return response
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}