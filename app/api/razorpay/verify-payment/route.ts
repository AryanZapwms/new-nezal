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
import Razorpay from "razorpay" 


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})


export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, totalAmount, shippingAmount } = await request.json()

    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex")

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

     const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId)

     let computedTotal = 0
const verifiedItems = []
for (const item of items) {
  const product = await Product.findById(item.product)
  if (!product) {
    return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 400 })
  }
  if (product.stock < item.quantity) {
    return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 })
  }
  const realPrice = product.price
  computedTotal += realPrice * item.quantity
  verifiedItems.push({
    product: product._id,
    quantity: item.quantity,
    price: realPrice,
    selectedSize: item.selectedSize,
  })
}
const realShipping = shippingAmount ?? 0
const realTotal = computedTotal + realShipping

    const expectedAmountPaise = Math.round(realTotal * 100)
if (razorpayOrder.amount !== expectedAmountPaise) {
  console.error(`Amount mismatch: real total ${expectedAmountPaise}, Razorpay paid ${razorpayOrder.amount}`)
  return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
}

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
  totalAmount: realTotal,
  shippingAmount: realShipping,
    shippingAddress: mappedAddress,
    paymentMethod: "razorpay",
    paymentStatus: "completed",
    orderStatus: "processing",
    razorpayOrderId,
    razorpayPaymentId,
  })
}

    await autoCreateShiprocketOrder(order._id.toString()) 

    await Promise.all(
      items.map(async (item: any) => {
        const quantity = item.quantity ?? 0
        if (quantity && item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -quantity } })
        }
      }),
    )

    const recipientEmail = user?.email || shippingAddress.email
    const recipientName = user?.name || shippingAddress.name

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

    return NextResponse.json({
      success: true,
      orderId: order._id,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}