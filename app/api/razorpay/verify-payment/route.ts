import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { Product } from "@/lib/models/product"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, items, shippingAddress, totalAmount } = await request.json()

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex")

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    await connectDB()

    // Get current user session
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if order already exists with this Razorpay payment ID (idempotency)
    let existingOrder = await Order.findOne({ razorpayPaymentId })
    if (existingOrder) {
      return NextResponse.json({ success: true, orderId: existingOrder._id })
    }

    // Check if order was already created via /api/orders with pending status (for this user)
    // If found, update it with payment details instead of creating a new one
    existingOrder = await Order.findOne({
      user: user._id,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      totalAmount,
    }).sort({ createdAt: -1 })

    let order;

    if (existingOrder) {
      // Update existing order with payment details
      order = await Order.findByIdAndUpdate(
        existingOrder._id,
        {
          razorpayOrderId,
          razorpayPaymentId,
          paymentStatus: "completed",
          orderStatus: "processing",
        },
        { new: true }
      )
    } else {
      // Payment verified - create new order (for backwards compatibility)
      const orderNumber = `ORD-${Date.now()}`

      // Map form fields to database schema
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

      order = await Order.create({
        orderNumber,
        user: user._id,
        items,
        totalAmount,
        shippingAddress: mappedAddress,
        paymentMethod: "razorpay",
        paymentStatus: "completed", // Payment already verified
        orderStatus: "processing",
        razorpayOrderId,
        razorpayPaymentId,
      })
    }

    // Update product stock
    await Promise.all(
      items.map(async (item: any) => {
        const quantity = item.quantity ?? 0
        if (quantity && item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -quantity } })
        }
      }),
    )

    // Send confirmation emails
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

        // Send confirmation email to customer
        const confirmationEmailHtml = getOrderConfirmationEmail({
          orderId: order.orderNumber,
          customerName: user.name,
          items: itemsData,
          total: order.totalAmount,
          orderDate: orderDate,
          paymentStatus: "completed",
        })

        await sendEmail({
          to: user.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: confirmationEmailHtml,
        })

        // Send admin notification email
        const adminEmailHtml = getAdminOrderNotificationEmail({
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || "N/A",
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
      // Don't fail the order creation if email fails
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
