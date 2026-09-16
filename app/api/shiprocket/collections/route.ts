// app/api/shiprocket/collections/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Collection } from "@/lib/models/collection";
import { mapCollectionToShiprocket } from "@/lib/shiprocket-mapper";

/**
 * Shiprocket's "Fetch Collections" catalog feed — same auth/pagination/
 * response-envelope pattern as app/api/shiprocket/products/route.ts.
 * Mapping logic lives in lib/shiprocket-mapper.ts, shared with the outbound
 * webhook notifier in lib/shiprocket-webhooks.ts so the two never drift.
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

    const query = { isActive: true, numericId: { $exists: true } };

    const [collections, total] = await Promise.all([
      Collection.find(query).skip(skip).limit(limit).lean(),
      Collection.countDocuments(query),
    ]);

    const shopifyCollections = (collections as any[]).map(mapCollectionToShiprocket);

    return NextResponse.json({
      data: {
        total,
        collections: shopifyCollections,
      },
    });
  } catch (error) {
    console.error("Error building Shiprocket collections feed:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}
