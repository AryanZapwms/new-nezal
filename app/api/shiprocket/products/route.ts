// app/api/shiprocket/products/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Collection } from "@/lib/models/collection";
import { mapProductToShiprocket } from "@/lib/shiprocket-mapper";

/**
 * Shiprocket Custom Checkout catalog feed. Shiprocket polls this endpoint
 * to sync our product/variant list. Response shape is Shiprocket's required
 * contract (Shopify-style products/variants) — do not rename fields.
 * Mapping logic lives in lib/shiprocket-mapper.ts, shared with the outbound
 * webhook notifier in lib/shiprocket-webhooks.ts so the two never drift.
 *
 * Also doubles as Shiprocket's "Fetch Products by Collection" — an optional
 * ?collection_id=<Collection.numericId> query param filters to that
 * collection's products (Product.collectionSlug === Collection.slug is the
 * actual relationship — see the comment below). Omit it for the unfiltered
 * "Fetch Products" behavior, unchanged from before.
 *
 * Auth: same x-api-key header pattern as app/api/webhooks/shipment-updates.
 */

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.SHIPROCKET_CATALOG_API_KEY) {
    console.warn("Shiprocket catalog sync: invalid or missing x-api-key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1") || 1;
    const limit = Number.parseInt(searchParams.get("limit") || "100") || 100;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { isActive: true, numericId: { $exists: true } };

    const collectionIdParam = searchParams.get("collection_id");
    if (collectionIdParam) {
      const collectionNumericId = Number(collectionIdParam);
      // Product has no direct ref to Collection — the relationship is a
      // plain string match: Product.collectionSlug === Collection.slug.
      // Confirmed against both actual schemas, not assumed.
      const collection = Number.isFinite(collectionNumericId)
        ? await Collection.findOne({ numericId: collectionNumericId }).select("slug").lean()
        : null;

      if (!collection) {
        // Unknown collection_id — empty result, not an error.
        return NextResponse.json({ data: { total: 0, products: [] } });
      }

      query.collectionSlug = (collection as any).slug;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("company", "name")
        .populate("category", "name")
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const shopifyProducts = (products as any[]).map(mapProductToShiprocket);

    return NextResponse.json({
      data: {
        total,
        products: shopifyProducts,
      },
    });
  } catch (error) {
    console.error("Error building Shiprocket catalog feed:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
