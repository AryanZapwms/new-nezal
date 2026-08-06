// components/product-card.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BULK_ORDER_LIMIT } from "@/lib/config";

import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";
import { WishlistButton } from "@/components/wishlist-button";

import {
  Phone,
  Zap,
  Star,
  StarHalf,
  Flame,
  Sparkles,
  Leaf,
  Hand,
  Droplet,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";

/* ───────────────────────────────────── */

interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
}

interface FlashSaleInfo {
  saleId: string;
  saleName: string;
  discountPercent: number;
  endsAt: string;
}

type ProductBadge =
  | "bestseller"
  | "new"
  | "organic"
  | "handmade"
  | "vegan"
  | "sulfate-free";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  salePercentage?: number | null;
  image?: string;
  company: {
    name: string;
    slug: string;
  };
  size?: "sm" | "md";
  /** @deprecated no longer read — the card derives this from sizes.length itself */
  hasMultipleSizes?: boolean;
  sizes?: Size[];
  stock?: number;
  // Present whenever the product is currently part of an active flash sale.
  // Comes straight through from the product API responses — see lib/flashSale.ts
  flashSale?: FlashSaleInfo | null;
  // Admin-set flag on the product itself — shows a "Best Seller" ribbon.
  isBestSeller?: boolean;

  // ── New optional fields — all gracefully hidden if not provided ──
  badges?: ProductBadge[];
  shortDescription?: string;
  rating?: number;
  reviewCount?: number;
  /** Static weight/size label for single-size products, e.g. "100g", "Pack of 3" */
  weightLabel?: string;
  /** Top 2-3 key ingredients to surface on the card, e.g. ["Apricot oil", "Shea butter"] */
  ingredients?: string[];
}

/* ───────────────────────────────────── */

const BADGE_CONFIG: Record<ProductBadge, { label: string; icon: typeof Flame; bg: string; color: string }> = {
  bestseller: { label: "Bestseller", icon: Flame, bg: "#fef3c7", color: "#b45309" },
  new: { label: "New", icon: Sparkles, bg: "#e0f0e4", color: "#1e6636" },
  organic: { label: "Organic", icon: Leaf, bg: "#e0f0e4", color: "#1e6636" },
  handmade: { label: "Handmade", icon: Hand, bg: "#fdeee0", color: "#9a4a1c" },
  vegan: { label: "Vegan", icon: Leaf, bg: "#e6f4ea", color: "#1e6636" },
  "sulfate-free": { label: "Sulfate Free", icon: Droplet, bg: "#e6f0fa", color: "#1d5a8c" },
};

const MAX_VISIBLE_INGREDIENTS = 2;

// A product's `size` field sometimes already includes the unit (e.g. "250ml"),
// sometimes doesn't (e.g. "250" with unit "ml" separately). Avoid "250mlml".
function formatSize(s: Size): string {
  return s.size.toLowerCase().includes(s.unit.toLowerCase()) ? s.size : `${s.size}${s.unit}`;
}

// Renders a 5-star row for any 0-5 rating, including halves (e.g. 4.6 -> 4 full + 1 half).
function StarRating({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const roundedUp = clamped - full >= 0.75;
  const totalFull = full + (roundedUp ? 1 : 0);

  return (
    <div className="flex items-center" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < totalFull) {
          return <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />;
        }
        if (i === totalFull && hasHalf) {
          return <StarHalf key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />;
        }
        return <Star key={i} className="h-3 w-3 text-neutral-200" />;
      })}
    </div>
  );
}

export default function ProductCard({
  id,
  name,
  price,
  discountPrice,
  salePercentage = null,
  image,
  company,
  sizes: rawSizes = [],
  stock = 999,
  flashSale = null,
  isBestSeller = false,
  badges = [],
  shortDescription,
  rating,
  reviewCount,
  weightLabel,
  ingredients = [],
}: ProductCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const addItem = useCartStore((state) => state.addItem);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // ── Defensive de-dupe — protects the UI even if the source data has
  //    genuine duplicate size entries (e.g. "500ml" saved twice in admin) ──
  const sizes = useMemo(() => {
    const seen = new Set<string>();
    return rawSizes.filter((s) => {
      const key = `${s.size}-${s.unit}-${s.quantity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawSizes]);

  // ── Derive size behavior from the actual (de-duped) data ──
  const showSizeSelector = sizes.length > 1;
  const singleSize = sizes.length === 1 ? sizes[0] : null;

  // Auto-select the only available size so pricing/stock/cart-add all work
  // without requiring the user to interact with anything.
  useEffect(() => {
    if (singleSize && !selectedSize) {
      setSelectedSize(singleSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleSize?.sku, singleSize?.size, singleSize?.quantity]);

  // ── Pricing — based on real size data whenever sizes exist at all ──
  //
  // `discountPrice` already reflects whichever sale (flash, direct, or
  // collection) is currently in effect on the product's base `price` — see
  // lib/flashSale.ts and lib/sale.ts. Sizes carry their own (legacy,
  // per-size) discountPrice independently, so a product-level sale would
  // otherwise never show up for a sized product. Deriving the sale's
  // percentage-off here and applying it to each size's own price (unless a
  // size already has a more specific manual discount) makes the sale
  // actually apply to every variant, not just size-less products.
  const percentOff =
  salePercentage != null && salePercentage > 0
    ? salePercentage / 100
    : discountPrice != null && discountPrice < price && price > 0
      ? (price - discountPrice) / price
      : 0;

  const sizeSalePrice = (s: Size) =>
    s.discountPrice ?? (percentOff > 0 ? Math.round(s.price * (1 - percentOff)) : undefined);

  const cheapestSize =
  sizes.length > 0
    ? sizes.reduce((min, s) => {
        const eff = sizeSalePrice(s) ?? s.price;
        const minEff = sizeSalePrice(min) ?? min.price;
        return eff < minEff ? s : min;
      }, sizes[0])
    : null;

  const activeSize = selectedSize ?? cheapestSize;

const originalPrice = activeSize ? activeSize.price : price;
const effectivePrice = activeSize
  ? sizeSalePrice(activeSize) ?? activeSize.price
  : discountPrice ?? price;
const hasDiscount = effectivePrice < originalPrice;

const discount = hasDiscount
  ? salePercentage != null && salePercentage > 0
    ? Math.round(salePercentage)
    : Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
  : 0;
  
const savedAmount = hasDiscount ? Math.round(originalPrice - effectivePrice) : 0;

  // ── Stock ──
  const effectiveStock =
    sizes.length > 0
      ? selectedSize
        ? selectedSize.stock
        : Math.max(0, ...sizes.map((s) => s.stock))
      : stock;

  const isOutOfStock = sizes.length > 0 ? sizes.every((s) => s.stock < 1) : stock < 1;

  const isLowStock = !isOutOfStock && effectiveStock > 0 && effectiveStock <= 5;

  const visibleBadges = badges.slice(0, 2);

  const visibleIngredients = ingredients.slice(0, MAX_VISIBLE_INGREDIENTS);
  const extraIngredientCount = Math.max(0, ingredients.length - MAX_VISIBLE_INGREDIENTS);

  const hasRating = typeof rating === "number" && rating > 0;

  // Add to Cart only appears once we actually have something to add:
  // immediately for no-size / single-size products, only after a pick
  // for multi-size products.
  const canAddToCart = sizes.length === 0 || !!selectedSize;

  function handleViewDetails(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/shop/${company.slug}/product/${id}`);
  }

  function handleSelectSize(e: React.MouseEvent<HTMLButtonElement>, s: Size) {
    e.preventDefault();
    e.stopPropagation();
    if (s.stock < 1) return;
    setSelectedSize(s);
  }

  function handleAddToCart(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const totalItems = getTotalItems();

    if (totalItems >= BULK_ORDER_LIMIT) {
      setShowBulkOrderModal(true);
      return;
    }

    if (sizes.length > 0) {
      if (!selectedSize) {
        toast({
          title: "Size required",
          description: "Please select a size.",
          variant: "destructive",
        });
        return;
      }

      const selectedSizeSalePrice = sizeSalePrice(selectedSize);
      addItem({
        productId: id,
        name,
        price: selectedSize.price,
        discountPrice: selectedSizeSalePrice,
        image,
        quantity: 1,
        company,
        selectedSize: { ...selectedSize, discountPrice: selectedSizeSalePrice },
        flashSale,
      });

      toast({ title: "Added to cart", description: `${name} added.` });
      return;
    }

    addItem({
      productId: id,
      name,
      price,
      discountPrice,
      image,
      quantity: 1,
      company,
      flashSale,
    });

    toast({ title: "Added to cart", description: `${name} added.` });
  }

  return (
    <>
      <article
        className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border bg-white transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(30,58,40,0.25)]"
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => router.push(`/shop/${company.slug}/product/${id}`)}
      >
        {/* ── IMAGE ── */}
        <div
          className="relative overflow-hidden bg-[var(--color-bg-cream)]"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* FLASH SALE RIBBON — takes priority over Best Seller; only one ribbon at a time */}
          {flashSale ? (
            <div className="absolute -left-10 top-4 z-20 w-36 -rotate-45 overflow-hidden">
              <div
                className="flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
                style={{ backgroundColor: "#E4432B" }}
              >
                <Zap className="h-3 w-3 fill-current" />
                Flash Sale
              </div>
            </div>
          ) : (
            isBestSeller && (
              <div className="absolute -left-10 top-4 z-20 w-36 -rotate-45 overflow-hidden">
                <div
                  className="flex items-center justify-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider shadow-md"
                  style={{ backgroundColor: "#1a3a2a", color: "#e8cf9e" }}
                >
                  <Flame className="h-3 w-3 fill-current" />
                  Best Seller
                </div>
              </div>
            )
          )}

          {/* QUALITY / STATUS BADGES — top-left, stacked, max 2 */}
          {visibleBadges.length > 0 && (
            <div
              className={`absolute left-3 z-20 flex flex-col gap-1.5 ${
                flashSale || isBestSeller ? "top-12" : "top-3"
              }`}
            >
              {visibleBadges.map((badge) => {
                const cfg = BADGE_CONFIG[badge];
                const Icon = cfg.icon;
                return (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* WISHLIST — top-right */}
          <div
            className="absolute right-3 top-3 z-20 rounded-full bg-white/85 p-1.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <WishlistButton productId={id} />
          </div>

          {image && !imgError ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              sizes="(max-width:768px) 50vw, 25vw"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgError(true);
                setImgLoaded(true);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="relative h-16 w-16 opacity-70">
                <Image src="/nezallogo.jpg" alt="Logo" fill className="object-contain" />
              </div>
            </div>
          )}

          {!imgLoaded && image && !imgError && (
            <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-neutral-100 to-neutral-200" />
          )}

          {/* Soft scrim so a discount tag stays legible over any photo */}
          {hasDiscount && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-16 bg-gradient-to-t from-black/25 to-transparent" />
          )}

          {/* DISCOUNT TAG — bottom-left, over the image */}
          {hasDiscount && (
            <div className="absolute bottom-2.5 left-2.5 z-20">
              <span className="inline-flex items-center rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white shadow-md sm:text-[11px]">
                {discount}% OFF
              </span>
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
          {/* Title — fixed height regardless of length */}
          <h3 className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-heading)] transition-colors group-hover:text-[var(--color-brand-primary)] sm:text-[15px]">
            {name}
          </h3>

          {/* Short description */}
          {shortDescription && (
            <p className="line-clamp-1 text-[11px] text-neutral-500 sm:text-xs">
              {shortDescription}
            </p>
          )}

          {/* Rating — shown whenever a rating exists, review count is optional context */}
          {hasRating && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={rating!} />
              <span className="text-[11px] font-semibold text-[var(--color-text-heading)] sm:text-xs">
                {rating!.toFixed(1)}
              </span>
              {!!reviewCount && (
                <span className="text-[11px] text-neutral-400 sm:text-xs">
                  ({reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Key ingredients — small pill chips, max 2 + overflow count */}
          {visibleIngredients.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleIngredients.map((ing) => (
                <span
                  key={ing}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px]"
                  style={{ backgroundColor: "#e6f0e4", color: "#1e6636" }}
                >
                  <Leaf className="h-2.5 w-2.5" />
                  {ing}
                </span>
              ))}
              {extraIngredientCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 sm:text-[11px]">
                  +{extraIngredientCount}
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
            <span className="text-lg font-extrabold tracking-tight text-[var(--color-text-heading)] sm:text-xl">
              ₹{Math.round(effectivePrice).toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through sm:text-sm">
                ₹{Math.round(originalPrice).toLocaleString()}
              </span>
            )}
            {hasDiscount && savedAmount > 0 && (
              <span className="text-[10px] font-semibold text-emerald-700 sm:text-[11px]">
                You save ₹{savedAmount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium sm:text-xs">
            {isOutOfStock ? (
              <>
                <XCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">Out of Stock</span>
              </>
            ) : isLowStock ? (
              <>
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600">Only {effectiveStock} left</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-neutral-400">In Stock</span>
              </>
            )}
          </div>

          {/* CTA — size selector sits directly above Add to Cart */}
          <div className="mt-auto flex flex-col gap-1.5 pt-2" onClick={(e) => e.stopPropagation()}>
            {/* Size / weight — pill buttons instead of a dropdown */}
            {showSizeSelector ? (
  <div className="flex flex-wrap gap-1.5 pb-0.5">
    {sizes.map((s, idx) => {
      const isSelected =
        selectedSize?.size === s.size &&
        selectedSize?.unit === s.unit &&
        selectedSize?.quantity === s.quantity;
      const oos = s.stock < 1;
      return (
        <button
          key={idx}
          type="button"
          disabled={oos}
          onClick={(e) => handleSelectSize(e, s)}
          className="rounded-full border px-3 py-1 text-[10px] font-semibold transition-all duration-150 sm:text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: isSelected ? "var(--color-brand-primary)" : "#ffffff",
            borderColor: isSelected ? "var(--color-brand-primary)" : "var(--color-border)",
            color: isSelected ? "#ffffff" : "var(--color-text-heading)",
            textDecoration: oos ? "line-through" : "none",
            boxShadow: isSelected ? "0 2px 8px -2px rgba(30,58,40,0.4)" : "none",
          }}
        >
          {formatSize(s)}
        </button>
      );
    })}
  </div>
) : singleSize ? (
  <span className="w-fit rounded-md bg-[var(--color-bg-cream)] px-2 py-0.5 text-[11px] font-medium text-neutral-600 sm:text-xs">
    {formatSize(singleSize)}
  </span>
) : weightLabel ? (
  <span className="w-fit rounded-md bg-[var(--color-bg-cream)] px-2 py-0.5 text-[11px] font-medium text-neutral-600 sm:text-xs">
    {weightLabel}
  </span>
) : null}

            {canAddToCart && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-primary)] text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:h-11 sm:text-sm animate-in fade-in"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
            )}

            <button
              type="button"
              onClick={handleViewDetails}
              className="h-8 text-center text-[11px] font-medium text-neutral-400 underline-offset-2 transition-colors duration-200 hover:text-[var(--color-brand-primary)] hover:underline sm:text-xs"
            >
              {canAddToCart ? "View Details" : "Select a size to continue"}
            </button>
          </div>
        </div>
      </article>

      {/* BULK ORDER MODAL */}
      <Dialog open={showBulkOrderModal} onOpenChange={setShowBulkOrderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Order Enquiry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              You've reached the cart limit. Please contact us for bulk orders.
            </p>

            <div className="space-y-2">
              {["+91 7710076400"].map((num) => (
                <a
                  key={num}
                  href={`tel:${num.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Phone className="h-4 w-4" />
                  <span>{num}</span>
                </a>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}