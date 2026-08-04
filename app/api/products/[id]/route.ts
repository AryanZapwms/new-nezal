// app/api/products/[id]/route.ts
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import "@/lib/models/category";
import "@/lib/models/collection";
import { getActiveFlashSaleMap, applyFlashSale } from "@/lib/flashSale";
import { setDirectSale, clearDirectSale } from "@/lib/sale";

export const dynamic = "force-dynamic";

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

// ---------------- GET PRODUCT ----------------
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await connectDB();

    const product = await Product.findById(id)
      .populate("company", "name slug")
      .populate("category", "name slug")
      .populate("collectionSaleId", "name slug");

    if (!product) {
      console.warn("⚠️ Product not found:", id);
     return NextResponse.json({ error: "Product not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const productObj = product.toObject();

    // Merge in flash-sale pricing so the product detail page shows the
    // same sale price / ribbon as the shop grid, cart, etc.
    const flashSaleMap = await getActiveFlashSaleMap();
    const productWithSale = applyFlashSale(productObj, flashSaleMap);

    const populatedProduct = {
      ...productWithSale,
      company: product.company || { name: "Unknown", slug: "unknown" },
      // ── FIX: don't override a real populated category with a fake fallback object;
      //    return null so the UI shows "Product" heading instead of a fake slug ──
      category: product.category || null,
    };

    return NextResponse.json(populatedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}


// ---------------- TOGGLE ACTIVE STATUS ----------------
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    )
      .populate("company", "name slug")
      .populate("category", "name slug");

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product.toObject(), {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    return NextResponse.json({ error: "Failed to update product status" }, { status: 500 });
  }
}



// ---------------- UPDATE PRODUCT ----------------
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    for (let i = 0; i < 3; i++) {
      try { await connectDB(); break }
      catch (err) { if (i === 2) throw err; await new Promise(r => setTimeout(r, 300)) }
    }

    const body = await request.json();

    const {
  name,
  slug,
  description,
  price,
  salePercentage,
  image,
  images,
  category,
  mainCategory,
  company,
  stock,
  sku,
  weight,
  length,      // ← add
  breadth,     // ← add
  height,      // ← add
  amazonUrl,
  variantLabel,     // ← added
  skinTypes,        // ← added
  ingredients,
  benefits,
  usage,
  suitableFor,
  results,
  sizes,
  isActive,
  whyYoullLoveIt,
  fragranceExp,
  whoIsItFor,
  skinHairConcern,
  expectedResults,
  keyIngredients,
  gstPercent,
  hsn,
  isBestSeller,
} = body;

    // ── FIX: resolve category — prefer subcategory, fall back to mainCategory ──
    const resolvedCategory =
  category && category !== ""
    ? category
    : mainCategory && mainCategory !== ""
    ? mainCategory
    : undefined;

    const updateData: any = {
  name,
  slug,
  description,
  price,
  image: image || (images && images.length > 0 ? images[0] : undefined),
  images: images || (image ? [image] : []),
  company,
  stock,
  sku,
  weight: weight !== undefined ? Number(weight) : 0.3,
  length: length !== undefined ? Number(length) : 10,     // ← add
  breadth: breadth !== undefined ? Number(breadth) : 10,   // ← add
  height: height !== undefined ? Number(height) : 10,      // ← add
  amazonUrl: typeof amazonUrl === "string" ? amazonUrl.trim() : "",
  variantLabel: typeof variantLabel === "string" ? variantLabel.trim() : "",   // ← added
  skinTypes: normalizeStringArray(skinTypes),                                  // ← added
      ingredients: normalizeStringArray(ingredients),  // ← fixed: handles \n and ,
      benefits:    normalizeStringArray(benefits),
      suitableFor: normalizeStringArray(suitableFor),
      usage,
      results,
      sizes,
      isActive,
      isBestSeller: !!isBestSeller,
        whyYoullLoveIt:  normalizeStringArray(whyYoullLoveIt),
  fragranceExp:    normalizeStringArray(fragranceExp),
  whoIsItFor:      whoIsItFor      ?? "",
  skinHairConcern: skinHairConcern ?? "",
  expectedResults: expectedResults ?? "",
  keyIngredients:  Array.isArray(keyIngredients) ? keyIngredients : [],
  gstPercent: gstPercent !== undefined && gstPercent !== "" ? Number(gstPercent) : null,
  hsn: typeof hsn === "string" ? hsn.trim() : "",
    };

    // Only set category if we resolved one — avoids wiping an existing category
    // if the edit form loaded without categories (e.g. network error)
    if (resolvedCategory !== undefined) {
      updateData.category = resolvedCategory;
    }

    let product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Direct sale is set/cleared as its own step (rather than folded into
    // updateData above) so that recomputing the effective sale — and
    // deciding whether this counts as a fresh "most recent" action — always
    // happens against the just-saved price.
    const pct = salePercentage !== undefined && salePercentage !== "" ? Number(salePercentage) : 0;
    product = pct > 0 ? await setDirectSale(id, pct) : await clearDirectSale(id);

    await product!.populate("company", "name slug");
    await product!.populate("category", "name slug");
    await product!.populate("collectionSaleId", "name slug");

    const updatedProduct = product!.toObject ? product!.toObject() : product;

    console.log("✅ Product updated successfully:", id);
    return NextResponse.json(updatedProduct, {
  headers: {
    "Cache-Control": "no-store, must-revalidate",
  },
})
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// ---------------- DELETE PRODUCT ----------------
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await connectDB();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      console.warn("⚠️ Product not found for deletion:", id);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}