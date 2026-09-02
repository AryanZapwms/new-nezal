// app/api/admin/carts/route.ts
//
// Admin visibility into the server Cart mirror — "which customers have
// items in their cart but haven't purchased them." Auth pattern mirrors
// app/api/admin/orders/route.ts exactly (session → User lookup → role
// check). "Abandoned" is derived here from lastActivityAt rather than
// stored on the cart — see CART_ABANDONED_THRESHOLD_MS in lib/cart-server.ts.
import { connectDB } from "@/lib/db";
import { Cart } from "@/lib/models/cart";
import { User } from "@/lib/models/user";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { CART_ABANDONED_THRESHOLD_MS } from "@/lib/cart-server";

// Never show empty carts — they carry no purchase-intent signal and would
// otherwise clutter every status view (section 12 of the feature spec).
const NON_EMPTY: Record<string, unknown> = { "items.0": { $exists: true } };

function resolveItemPrice(item: any): number {
  const product = item.product;
  const price = item.selectedSize?.discountPrice ?? item.selectedSize?.price ?? product?.discountPrice ?? product?.price ?? 0;
  return price * item.quantity;
}

function shapeCart(cart: any) {
  const items = (cart.items || [])
    .filter((item: any) => !!item.product)
    .map((item: any) => ({
      productId: item.product._id,
      name: item.product.name,
      image: item.product.image,
      quantity: item.quantity,
      selectedSize: item.selectedSize || undefined,
      price: item.selectedSize?.discountPrice ?? item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price,
    }));

  const cartTotal = (cart.items || []).reduce((sum: number, item: any) => (item.product ? sum + resolveItemPrice(item) : sum), 0);

  const isAbandoned = cart.status === "active" && new Date(cart.lastActivityAt).getTime() <= Date.now() - CART_ABANDONED_THRESHOLD_MS;

  return {
    _id: cart._id,
    status: cart.status,
    derivedStatus: cart.status === "active" ? (isAbandoned ? "abandoned" : "active") : cart.status,
    lastActivityAt: cart.lastActivityAt,
    createdAt: cart.createdAt,
    convertedAt: cart.convertedAt,
    convertedOrderId: cart.convertedOrderId,
    cartTotal: Math.round(cartTotal * 100) / 100,
    itemCount: items.reduce((n: number, i: any) => n + i.quantity, 0),
    items,
    // Guest carts never expose the raw token — the admin only needs to know
    // there's an anonymous customer here, not be able to impersonate them.
    customer: cart.user
      ? { type: "user", name: cart.user.name, email: cart.user.email, phone: cart.user.phone }
      : { type: "guest", name: "Guest", email: null, phone: null },
  };
}

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

    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const search = searchParams.get("search")?.trim();
    const statusParam = searchParams.get("status") || "active"; // active | abandoned | converted | all

    const cutoff = new Date(Date.now() - CART_ABANDONED_THRESHOLD_MS);

    const filter: Record<string, any> = { ...NON_EMPTY };
    if (statusParam === "converted") {
      filter.status = "converted";
    } else if (statusParam === "abandoned") {
      filter.status = "active";
      filter.lastActivityAt = { $lte: cutoff };
    } else if (statusParam === "active") {
      filter.status = "active";
    } // "all" — no status constraint beyond non-empty

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);
      filter.user = { $in: userIds }; // guest carts have no name/email to search — excluded when searching
    }

    const skip = (page - 1) * limit;

    const [carts, total, activeCarts, abandonedCarts, revenueAgg, topProductsAgg] = await Promise.all([
      Cart.find(filter)
        .sort({ lastActivityAt: 1 }) // stalest (most neglected) first — the ones worth acting on
        .skip(skip)
        .limit(limit)
        .populate("user", "name email phone")
        .populate("items.product", "name image price discountPrice")
        .lean(),
      Cart.countDocuments(filter),
      Cart.countDocuments({ status: "active", ...NON_EMPTY }),
      Cart.countDocuments({ status: "active", ...NON_EMPTY, lastActivityAt: { $lte: cutoff } }),
      Cart.aggregate([
        { $match: { status: "active", "items.0": { $exists: true }, lastActivityAt: { $lte: cutoff } } },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDoc" } },
        { $unwind: "$productDoc" },
        {
          $project: {
            lineTotal: {
              $multiply: [
                "$items.quantity",
                {
                  $ifNull: [
                    "$items.selectedSize.discountPrice",
                    { $ifNull: ["$items.selectedSize.price", { $ifNull: ["$productDoc.discountPrice", "$productDoc.price"] }] },
                  ],
                },
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$lineTotal" } } },
      ]),
      // "Most Abandoned Products" — which products sit in abandoned carts most often.
      Cart.aggregate([
        { $match: { status: "active", "items.0": { $exists: true }, lastActivityAt: { $lte: cutoff } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", cartCount: { $sum: 1 } } },
        { $sort: { cartCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDoc" } },
        { $unwind: "$productDoc" },
        { $project: { _id: 0, productId: "$_id", name: "$productDoc.name", image: "$productDoc.image", cartCount: 1 } },
      ]),
    ]);

    return NextResponse.json({
      carts: carts.map(shapeCart),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        activeCarts,
        abandonedCarts,
        potentialRevenue: Math.round((revenueAgg[0]?.total ?? 0) * 100) / 100,
      },
      topAbandonedProducts: topProductsAgg,
    });
  } catch (error) {
    console.error("Error fetching admin carts:", error);
    return NextResponse.json({ error: "Failed to fetch carts" }, { status: 500 });
  }
}
