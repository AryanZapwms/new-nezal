// /api/products/route.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes for API responses

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
        .select("name slug image images sizes company category stock")
        .lean();

      return NextResponse.json({ products });
    }
    // ─────────────────────────────────────────────────────

    const company = searchParams.get("company");
    const category = searchParams.get("category");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "12");
    const exclude = searchParams.get("exclude");

    // Create cache key from query parameters
    const cacheKey = getCacheKey({ company, category, page, limit, exclude });

    // Check cache first
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const query: any = { isActive: true };

    // Optimize company and category lookups with parallel queries
    const [companyDoc, categoryDoc] = await Promise.all([
      company ? Company.findOne({ slug: company, isActive: true }).select("_id") : null,
      category ? Category.findOne({ slug: category, isActive: true }).select("_id parent") : null,
    ]);

    if (companyDoc) {
      query.company = companyDoc._id;
    }

    if (categoryDoc) {
      // If it's a main category (no parent), include itself and sub-categories
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
        // It's a sub-category, just include itself
        query.category = categoryDoc._id;
      }
    }

    if (exclude) {
      query._id = { $ne: exclude };
    }

    const skip = (page - 1) * limit;

    // Execute count and products query in parallel for better performance
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("company", "name slug")
        .populate("category", "name slug")
        .select("name slug price discountPrice image images stock company category createdAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query),
    ]);

    const responseData = {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache the response
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

    //  SECURITY CHECK: Only admins can create products
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    console.log("🔍 Full request body keys:", Object.keys(body));
    console.log("🔍 Raw body.sizes:", body.sizes);

    const {
      name,
      slug,
      description,
      price,
      discountPrice,
      image,
      images,
      category,
      company,
      stock,
      sku,
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
      isActive,
    } = body;

    const product = new Product({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description,
      price,
      discountPrice,
      image: image || (images && images.length > 0 ? images[0] : undefined),
      images: images || (image ? [image] : []),
      category,
      company,
      stock,
      sku,
      ingredients,
      benefits,
      usage,
      suitableFor,
      results,
      sizes,
      isActive: isActive ?? true,
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