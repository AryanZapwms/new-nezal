// app/api/products/route.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale";
import { computeEffectiveSale } from "@/lib/sale";
import Fuse from "fuse.js";

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = process.env.NODE_ENV === "development" ? 0 : 1000 * 60 * 2; // 2 minutes

function getCacheKey(params: Record<string, string>) {
  return JSON.stringify(params);
}

function getCachedResponse(key: string) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

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

function getSortStage(sort: string): Record<string, 1 | -1> {
  switch (sort) {
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "name_asc":
      return { name: 1 };
    case "newest":
      return { createdAt: -1 };
    case "manual":
    default:
      // Falls back to createdAt for any products that share the same
      // (default) sortOrder, so nothing on the live site changes until
      // an admin actually drags something — at that point sortOrder
      // values diverge and take precedence.
      return { sortOrder: 1, createdAt: -1 };
  }
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
      .select("name slug image images sizes company category stock price discountPrice salePercentage gstPercent isBestSeller")
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

    const cacheKey = getCacheKey({ company, category, search, page, limit, exclude, sort, includeInactive: String(includeInactive) });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const query: any = includeInactive ? {} : { isActive: true };

    const [companyDoc, categoryDoc] = await Promise.all([
      company ? Company.findOne({ slug: company, isActive: true }).select("_id") : null,
      category ? Category.findOne({ slug: category, isActive: true }).select("_id parent") : null,
    ]);

    if (companyDoc) {
      query.company = companyDoc._id;
    }

    if (categoryDoc) {
      if (!categoryDoc.parent) {
        const subCategories = await Category.find({
          parent: categoryDoc._id,
          isActive: true,
        }).select("_id");
        const categoryIds = [
          categoryDoc._id,
          ...subCategories.map((sub) => sub._id),
        ];
        query.category = { $in: categoryIds };
      } else {
        query.category = categoryDoc._id;
      }
    }

    
if (exclude) {
  const excludeIds = exclude
    .split(",")
    .map((s) => s.trim())
    .filter((s) => mongoose.Types.ObjectId.isValid(s));
  if (excludeIds.length) {
    query._id = { $nin: excludeIds };
  }
}
    

    const skip = (page - 1) * limit;


      let products: any[];
      let total: number;

    if (search) {
  // Typo-tolerant search: pull everything matching the other filters,
  // then let Fuse.js rank by closeness so "sleo vera" still finds "Aloe Vera".
  const candidates = await Product.find(query)
    .populate("company", "name slug")
    .populate("category", "name slug")
    .select("name slug price discountPrice salePercentage image images stock sizes company category isActive createdAt isBestSeller")
    .sort({ createdAt: -1 })
    .lean();  

  const fuse = new Fuse(candidates, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "company.name", weight: 0.3 },
    ],
    threshold: 0.4,        // 0 = exact only, 1 = match almost anything
    ignoreLocation: true,  // typo can be anywhere in the word, not just start
    minMatchCharLength: 2,
  });

  const fuzzyResults = fuse.search(search).map((r) => r.item);

  if (sort === "price_asc") {
  fuzzyResults.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0));
} else if (sort === "price_desc") {
  fuzzyResults.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0));
} else if (sort === "name_asc") {
  fuzzyResults.sort((a: any, b: any) => a.name.localeCompare(b.name));
}


  total = fuzzyResults.length;
  products = fuzzyResults.slice(skip, skip + limit);
} else {
  [products, total] = await Promise.all([
    Product.find(query)
      .populate("company", "name slug")
      .populate("category", "name slug")
      .select("name slug price discountPrice salePercentage image images stock sizes company category isActive createdAt isBestSeller")
      .skip(skip)
      .limit(limit)
       .sort(getSortStage(sort))
      .lean(),
    Product.countDocuments(query),
  ]);
}

    // ── Merge in flash-sale pricing so every listing (shop, search, home, etc.)
    //    reflects an active sale automatically ──────────────────────────────
    const flashSaleMap = await getActiveFlashSaleMap();
    const productsWithSales = applyFlashSaleToList(products, flashSaleMap);

    const responseData = {
      products: productsWithSales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };

    // Note: flash sales are time-boxed to the minute, so caching this for
    // the full 2-minute TTL is fine — worst case a sale's start/end is off
    // by up to CACHE_TTL. If that's too loose, drop the cache write when
    // flashSaleMap.size > 0, or shorten CACHE_TTL.
    setCachedResponse(cacheKey, responseData);

    return NextResponse.json(responseData);
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

    const productObject = product.toObject ? product.toObject() : product;

    return NextResponse.json(productObject, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}