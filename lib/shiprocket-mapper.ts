// lib/shiprocket-mapper.ts
//
// Shared mapping from our Product/Collection documents to Shiprocket's
// required JSON shapes (Shopify-style products/variants + collections).
// Used by BOTH the catalog GET feed (app/api/shiprocket/products/route.ts)
// and the outbound webhook notifier (lib/shiprocket-webhooks.ts) so the two
// never drift out of sync on field names/formatting.
//
// Callers should pass populated documents — product.company / product.category
// should be populated with at least `name` (fallbacks below cover the case
// where they aren't, but vendor/product_type will be generic in that case).

import { computeSalePrice } from "@/lib/sale";

// Single source of truth for Shiprocket's variant-id scheme, used to build
// ids here AND to reverse them (see the checkout initiator
// lib/shiprocket-checkout.ts, which builds these ids forward, and the order
// webhook app/api/shiprocket/order-webhook/[secret]/route.ts, which decodes
// them back to a product/size — its own copy of this formula, since reverse
// math (/1000, %1000) isn't a call to this same function).
export const SHIPROCKET_VARIANT_ID_MULTIPLIER = 1000;

export function computeVariantId(numericId: number, sizeIndex: number | null): number {
  return numericId * SHIPROCKET_VARIANT_ID_MULTIPLIER + (sizeIndex ?? 0);
}

// ── Price computation ──────────────────────────────────────────────────
// sizes[].discountPrice is NOT kept in sync with the product's active sale —
// it's frequently just equal to sizes[].price even when the parent product
// has a live discount. So the real selling price for a size/variant is
// derived by re-applying the product's own salePercentage to size.price
// (the same computeSalePrice() call lib/sale.ts uses to produce the
// top-level discountPrice), rather than trusting size.discountPrice.
function computeVariantPricing(
  basePrice: number,
  product: any
): { price: number; compareAtPrice: number | null } {
  const hasActiveSale =
    product.saleSource && product.saleSource !== "none" && product.salePercentage;

  if (hasActiveSale) {
    return {
      price: computeSalePrice(basePrice, product.salePercentage),
      compareAtPrice: basePrice,
    };
  }
  return { price: basePrice, compareAtPrice: null };
}

function buildVariants(product: any, imageSrc: string) {
  const numericId = product.numericId;

  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes.map((size: any, index: number) => {
      const { price, compareAtPrice } = computeVariantPricing(size.price, product);
      const weightKg = typeof size.weight === "number" ? size.weight : product.weight ?? 0.3;

      return {
        id: computeVariantId(numericId, index),
        title: size.size,
        price: String(price),
        compare_at_price: compareAtPrice !== null ? String(compareAtPrice) : null,
        sku: size.sku,
        quantity: size.stock,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        taxable: true,
        option_values: { Size: size.size },
        grams: Math.round(weightKg * 1000),
        image: { src: imageSrc },
        weight: weightKg,
        weight_unit: "kg",
      };
    });
  }

  // No sizes — single fallback variant using the product's own price/stock/sku.
  const { price, compareAtPrice } = computeVariantPricing(product.price, product);
  const weightKg = product.weight ?? 0.3;

  return [
    {
      id: computeVariantId(numericId, null),
      title: "Default",
      price: String(price),
      compare_at_price: compareAtPrice !== null ? String(compareAtPrice) : null,
      sku: product.sku,
      quantity: product.stock,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      taxable: true,
      option_values: {},
      grams: Math.round(weightKg * 1000),
      image: { src: imageSrc },
      weight: weightKg,
      weight_unit: "kg",
    },
  ];
}

export function mapProductToShiprocket(product: any) {
  const imageSrc = product.image || product.images?.[0] || "";

  return {
    id: product.numericId,
    title: product.name,
    body_html: product.description || "",
    vendor: product.company?.name || "Nezal Herbocare",
    product_type: product.category?.name || "",
    created_at: product.createdAt,
    handle: product.slug,
    updated_at: product.updatedAt,
    tags: [...(product.skinTypes || []), ...(product.concerns || [])].join(","),
    status: product.isActive ? "active" : "draft",
    image: { src: imageSrc },
    options:
      product.sizes && product.sizes.length > 0
        ? [{ name: "Size", values: product.sizes.map((s: any) => s.size) }]
        : [],
    variants: buildVariants(product, imageSrc),
  };
}

// id is Collection.numericId (Shiprocket requires collections[].id to be a
// unique integer, same requirement class as products[].id) — resolved the
// follow-up flagged here earlier: Collection now has its own numericId,
// same pattern as Product's (see lib/models/collection.ts).
export function mapCollectionToShiprocket(collection: any) {
  return {
    id: collection.numericId,
    title: collection.name,
    handle: collection.slug,
    body_html: collection.tagline || collection.storyText || "",
    image: { src: collection.heroImage || "" },
    published_at: collection.createdAt,
    updated_at: collection.updatedAt,
    status: collection.isActive ? "active" : "draft",
  };
}
