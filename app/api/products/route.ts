// app/api/products/route.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";
import { getNextSequence } from "@/lib/models/counter";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale";
import { computeEffectiveSale } from "@/lib/sale";
import { notifyProductWebhook } from "@/lib/shiprocket-webhooks";
import { listProducts } from "@/lib/product-listing";

// ── FIX: normalize any value (string with commas/newlines, or array) → string[] ──
function normalizeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((v) =>
        typeof v === "string"
          ? v.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
          : []
      );
  }
  if (typeof val === "string") {
    return val.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}



export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // ── WISHLIST BATCH FETCH ──────────────────────────────
    const ids = searchParams.get("ids");
    if (ids) {
      const idList = ids
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (!idList.length) {
        return NextResponse.json({ products: [] });
      }

      const products = await Product.find({ _id: { $in: idList } })
        .populate("company", "name slug")
        .populate("category", "name slug")
      .select("name slug image images sizes company category stock price discountPrice salePercentage gstPercent isBestSeller rating reviewCount")
        .lean();

      // Flash-sale pricing shows up in the wishlist too, not just the shop grid
      const flashSaleMap = await getActiveFlashSaleMap();
      const productsWithSales = applyFlashSaleToList(products, flashSaleMap);

      return NextResponse.json({ products: productsWithSales });
    }
    // ─────────────────────────────────────────────────────

    const company = searchParams.get("company");
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "12");
    const exclude = searchParams.get("exclude");
  const sort = searchParams.get("sort") || "manual";   // was "newest"
    const includeInactiveParam = searchParams.get("includeInactive") === "true";

    // Only an authenticated admin can actually see inactive products
    let includeInactive = false;
    if (includeInactiveParam) {
      const session = await getServerSession(authOptions);
      includeInactive = !!session?.user && session.user.role === "admin";
    }

    // Shared with the server-rendered shop pages — see lib/product-listing.ts
    return NextResponse.json(
      await listProducts({ company, category, search, page, limit, exclude, sort, includeInactive })
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

  const {
  name, slug, description, price, salePercentage, image, images,
  category, mainCategory, company, stock, sku, weight, length, breadth, height, amazonUrl,
  ingredients, benefits, usage, suitableFor, results, sizes,
  isActive, gstPercent, hsn, variantLabel, skinTypes, isBestSeller,
} = body;

    // A direct sale set at creation time counts as the first "most recent"
    // action on this product, same as setting one later via the edit page.
    const pct = salePercentage !== undefined && salePercentage !== "" ? Number(salePercentage) : 0;
    const directSalePercentage = pct > 0 ? pct : null;
    const directSaleAppliedAt = pct > 0 ? new Date() : null;
    const effectiveSale = computeEffectiveSale({
      price: Number(price),
      directSalePercentage,
      directSaleAppliedAt,
    });

    // ── FIX: resolve category — prefer subcategory, fall back to mainCategory ──
    const resolvedCategory =
      category && category !== ""
        ? category
        : mainCategory && mainCategory !== ""
        ? mainCategory
        : undefined;

      const highestOrder = await Product.findOne().sort({ sortOrder: -1 }).select("sortOrder");
      const nextSortOrder = (highestOrder?.sortOrder ?? -1) + 1;

    const product = new Product({
      numericId: await getNextSequence("productId"),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      price,
      directSalePercentage,
      directSaleAppliedAt,
      saleSource: effectiveSale.saleSource,
      salePercentage: effectiveSale.salePercentage,
      saleAppliedAt: effectiveSale.saleAppliedAt,
      discountPrice: effectiveSale.discountPrice,
      image: image || (images && images.length > 0 ? images[0] : undefined),
      images: images || (image ? [image] : []),
      category: resolvedCategory,               // ← fixed: never empty when mainCategory is set
      company,
      stock,
      sku,
      weight: weight ? Number(weight) : 0.3,
      length: length ? Number(length) : 10,     // ← add
      breadth: breadth ? Number(breadth) : 10,   // ← add
      height: height ? Number(height) : 10,      // ← add
      amazonUrl: amazonUrl?.trim() || "",
      sortOrder: nextSortOrder,          // ← added
      variantLabel: typeof variantLabel === "string" ? variantLabel.trim() : "",   // ← added
      skinTypes: normalizeStringArray(skinTypes),                                  // ← added
      ingredients: normalizeStringArray(ingredients),  // ← fixed: handles \n and ,
      benefits:    normalizeStringArray(benefits),
      suitableFor: normalizeStringArray(suitableFor),
      usage,
      results,
      sizes,
      isActive: isActive ?? true,
      isBestSeller: !!isBestSeller,
      gstPercent: gstPercent !== undefined && gstPercent !== "" ? Number(gstPercent) : null,
      hsn: typeof hsn === "string" ? hsn.trim() : "",
    });

    await product.save();

    // Populated so the Shiprocket webhook fired below has real vendor/
    // product_type instead of falling back to the generic defaults.
    await product.populate("company", "name");
    await product.populate("category", "name");

    const productObject = product.toObject ? product.toObject() : product;

    // Fire-and-forget — a Shiprocket outage must never block product creation.
    void notifyProductWebhook(productObject);

    return NextResponse.json(productObject, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}