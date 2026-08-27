// app/api/admin/orders/route.ts
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const dbUser = await User.findOne({ email: session.user.email });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    //  SECURITY CHECK: Only admins can access this endpoint
    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);
    const search = searchParams.get("search")?.trim();

    // Search matches the same fields the admin UI used to filter client-side:
    // order number, guest name/email, or the linked user's name/email.
    let filter: Record<string, any> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);
      filter = {
        $or: [
          { orderNumber: regex },
          { guestName: regex },
          { guestEmail: regex },
          ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ],
      };
    }

    const skip = (page - 1) * limit;

    // Stats cards always reflect ALL orders, independent of search/pagination.
    const [orders, total, totalOrders, completed, shipped, pending, feesAgg] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email phone")
        .populate("items.product", "name price image"),
      Order.countDocuments(filter),
      Order.countDocuments({}),
      Order.countDocuments({ paymentStatus: "completed" }),
      Order.countDocuments({ shiprocketOrderId: { $exists: true, $ne: null } }),
      Order.countDocuments({ paymentStatus: { $nin: ["completed", "failed"] } }),
      Order.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $add: [
                  { $ifNull: ["$shippingBreakdown.smartOrderFee", 0] },
                  { $ifNull: ["$shippingBreakdown.rateDriftBuffer", 0] },
                ],
              },
            },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      orders,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        totalOrders,
        completed,
        pending,
        shipped,
        feesCollected: feesAgg[0]?.total ?? 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
