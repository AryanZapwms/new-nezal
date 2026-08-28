// app/api/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, getOrderConfirmationEmail, getAdminOrderNotificationEmail } from "@/lib/email";
import "@/lib/models/product"
import "@/lib/models/user"
import { Product } from "@/lib/models/product";
import { autoCreateShiprocketOrder } from "@/lib/shiprocket";
import { sendCapiPurchaseEvent, getRequestMeta } from "@/lib/meta-capi";
import { syncUserContactFromOrder } from "@/lib/syncUserContact";

// Strips spaces/dashes/parens/country-code prefixes and returns a clean
// 10-digit Indian mobile number, or "" if it can't be normalized to one.
// This is what caused the recurring Shiprocket 422 "billing_phone must be
// 10 digits" errors — the raw input (e.g. "96228 40139") was being saved
// and forwarded to Shiprocket verbatim, space and all.
function sanitizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, ""); // strip spaces, +, -, (), etc.
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await request.json();
      


    const { items, shippingAddress, totalAmount, paymentMethod, shippingAmount, codCharge, shippingBreakdown } = body;



    await connectDB();

    let user = null;

    if (session?.user?.email) {
      // ── Logged-in path (unchanged) ──
      user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else {
      // ── Guest path ──
      if (!shippingAddress?.email) {
        return NextResponse.json(
          { error: "Email is required to place an order" },
          { status: 400 }
        );
      }
    }

    // Reject bad phone numbers at checkout instead of letting them silently
    // fail later at Shiprocket (or worse, retry forever in the abandoned
    // payments cron). Do this before any DB writes.
    const cleanPhone = sanitizePhone(shippingAddress?.phone);
    if (!cleanPhone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number." },
        { status: 400 }
      );
    }

    let computedTotal = 0;
    let totalTaxableValue = 0;
    let totalGstAmount = 0;
    const verifiedItems = [];

      for (const item of items) {
  const product = await Product.findById(item.product);
  if (!product) {
    return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 400 });
  }

  // Resolve price + stock from the selected size variant if one was chosen.
  // Falling back to the base product.price/stock silently (as before) was
  // the bug: it ignored which size the customer actually picked and charged
  // them the base variant's price regardless.
  let realPrice = product.price;
  let availableStock = product.stock;

  if (item.selectedSize?.size) {
    const matchedSize = product.sizes?.find(
      (s: any) =>
        s.size === item.selectedSize.size &&
        (item.selectedSize.sku ? s.sku === item.selectedSize.sku : true)
    );

    if (!matchedSize) {
      return NextResponse.json(
        { error: `Selected size "${item.selectedSize.size}" is no longer available for ${product.name}` },
        { status: 400 }
      );
    }

    realPrice = matchedSize.discountPrice || matchedSize.price;
    availableStock = matchedSize.stock;
  }

  if (availableStock < item.quantity) {
    return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
  }

  const gstPercent = product.gstPercent ?? 0;

  const lineTotal = realPrice * item.quantity;
  const lineTaxableValue = gstPercent > 0 ? lineTotal / (1 + gstPercent / 100) : lineTotal;
  const lineGstAmount = lineTotal - lineTaxableValue;

  computedTotal += lineTotal;
  totalTaxableValue += lineTaxableValue;
  totalGstAmount += lineGstAmount;

  verifiedItems.push({
    product: product._id,
    quantity: item.quantity,
    price: realPrice,
    gstPercent,
    taxableValue: Math.round(lineTaxableValue * 100) / 100,
    gstAmount: Math.round(lineGstAmount * 100) / 100,
    selectedSize: item.selectedSize,
  });
}

const realShipping = shippingAmount ?? 0;
const realCodCharge = paymentMethod === "cod" ? (codCharge ?? 0) : 0;
const realTotal = computedTotal + realShipping + realCodCharge;

// fallback if the checkout page doesn't send a breakdown (e.g. old cached client bundle)
const realShippingBreakdown = shippingBreakdown ?? {
  baseCourierRate: Math.max(realShipping - 8, 0),
  smartOrderFee: 5,
  rateDriftBuffer: 3,
  courierNameQuoted: null,
};

    const orderNumber = `ORD-${Date.now()}`;

    const mappedAddress = {
      name: shippingAddress.name,
      phone: cleanPhone,
      street: shippingAddress.street,
      address: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zipCode: shippingAddress.zipCode,
      pincode: shippingAddress.zipCode,
      country: shippingAddress.country,
    };

    const order = await Order.create({
      orderNumber,
      user: user?._id,
      guestEmail: user ? undefined : shippingAddress.email,
      guestName: user ? undefined : shippingAddress.name,
      guestPhone: user ? undefined : cleanPhone,
      items: verifiedItems,
      totalAmount: realTotal,
      shippingAmount: realShipping,
      shippingBreakdown: realShippingBreakdown,
      codCharge: realCodCharge,
      shippingAddress: mappedAddress,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: "pending",
      orderStatus: "pending",
      totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
      totalGstAmount: Math.round(totalGstAmount * 100) / 100,
    });

    if (user) await syncUserContactFromOrder(user._id, mappedAddress);

    const recipientEmail = user?.email || shippingAddress.email;
    const recipientName = user?.name || shippingAddress.name;

    // Only send "order received" emails for payment methods that confirm
    // immediately (COD). Razorpay and CCAvenue send their own confirmation
    // emails once payment is verified, in their respective callback routes.
    if (paymentMethod === "cod") {
       await autoCreateShiprocketOrder(order._id.toString());

      const { clientIp, userAgent, fbp, fbc, eventSourceUrl } = getRequestMeta(request);
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
      }).catch((err) => console.error("[meta-capi] COD purchase event failed:", err));

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

          const confirmationEmailHtml = getOrderConfirmationEmail({
            orderId: order.orderNumber,
            customerName: recipientName,
            items: itemsData,
            total: order.totalAmount,
            orderDate: orderDate,
          });

          await sendEmail({
            to: recipientEmail,
            subject: `Order Received - ${order.orderNumber}`,
            html: confirmationEmailHtml,
          });

          const adminEmailHtml = getAdminOrderNotificationEmail({
            customerName: recipientName,
            customerEmail: recipientEmail,
            customerPhone: user?.phone || cleanPhone || "N/A",
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
  // Unchanged — order history stays login-only, guests have no account to list against
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
      paymentStatus: { $ne: "failed" }
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
