import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import "@/lib/models/product"
import "@/lib/models/user"


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, shippingAddress, totalAmount, paymentMethod } = body;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orderNumber = `ORD-${Date.now()}`;

    // Map form fields to database schema
    const mappedAddress = {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      address: shippingAddress.street, // Map street to address
      city: shippingAddress.city,
      state: shippingAddress.state,
      zipCode: shippingAddress.zipCode,
      pincode: shippingAddress.zipCode, // Map zipCode to pincode
      country: shippingAddress.country,
    };

    const order = await Order.create({
      orderNumber,
      user: user._id,
      items,
      totalAmount,
      shippingAddress: mappedAddress,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: "pending",
      orderStatus: paymentMethod === "razorpay" ? "pending" : "pending",
    });

    //  IMPORTANT: Only send emails for COD orders immediately
    // For Razorpay: emails are sent by /api/razorpay/verify-payment after payment verification
    if (paymentMethod !== "razorpay") {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate("items.product")
          .lean();

        if (populatedOrder) {
          const itemsData = populatedOrder.items.map((item: any) => ({
            name: item.product?.name || "Product",
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize,
          }));

          const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

          // Send confirmation email to customer
          const confirmationEmailHtml = getOrderConfirmationEmail({
            orderId: order.orderNumber,
            customerName: user.name,
            items: itemsData,
            total: order.totalAmount,
            orderDate: orderDate,
          });

          await sendEmail({
            to: user.email,
            subject: `Order Received - ${order.orderNumber}`,
            html: confirmationEmailHtml,
          });

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
          });

          await sendEmail({
            to: process.env.GMAIL_EMAIL || "nezal@gmail.com",
            subject: `🚨 NEW ORDER - ${order.orderNumber}`,
            html: adminEmailHtml,
          });
        }
      } catch (emailError) {
        console.error("Failed to send order emails:", emailError);
        // Don't fail the order creation if email fails
      }
    }

    return NextResponse.json(
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orders = await Order.find({ 
      user: user._id,
      paymentStatus: { $ne: "failed" }  // Exclude failed orders
    })
      .sort({ createdAt: -1 })
      .populate("items.product");

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
