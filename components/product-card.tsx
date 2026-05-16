// components/product-card.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";
import { WishlistButton } from "@/components/wishlist-button";

import { Phone } from "lucide-react";

/* ───────────────────────────────────── */

interface Size {
  size: string;
  unit: "ml" | "l" | "g" | "kg";
  quantity: number;
  price: number;
  discountPrice?: number;
  stock: number;
}

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image?: string;
  company: {
    name: string;
    slug: string;
  };
  size?: "sm" | "md";
  hasMultipleSizes?: boolean;
  sizes?: Size[];
  stock?: number;
}

/* ───────────────────────────────────── */

export default function ProductCard({
  id,
  name,
  price,
  discountPrice,
  image,
  company,
  hasMultipleSizes = false,
  sizes = [],
  stock = 999,
}: ProductCardProps) {
  const router = useRouter();

  const { toast } = useToast();

  const addItem = useCartStore((state) => state.addItem);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const discount = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const displayPrice =
    hasMultipleSizes && sizes.length > 0
      ? Math.min(...sizes.map((s) => s.discountPrice || s.price))
      : discountPrice || price;

  const isOutOfStock = hasMultipleSizes
    ? sizes.every((s) => s.stock < 1)
    : stock < 1;

  function handleShopNow(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/shop/${company.slug}/product/${id}`);
  }

  function handleAddToCart(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const totalItems = getTotalItems();

    if (totalItems >= 5) {
      setShowBulkOrderModal(true);
      return;
    }

    if (hasMultipleSizes && sizes.length > 0) {
      if (!selectedSize) {
        toast({
          title: "Size required",
          description: "Please select a size.",
          variant: "destructive",
        });
        return;
      }

      addItem({
        productId: id,
        name,
        price: selectedSize.price,
        discountPrice: selectedSize.discountPrice,
        image,
        quantity: 1,
        company,
        selectedSize,
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
    });

    toast({ title: "Added to cart", description: `${name} added.` });
  }

  return (
    <>
      <div
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => router.push(`/shop/${company.slug}/product/${id}`)}
      >
        {/* IMAGE */}
        <div className="relative aspect-square overflow-hidden bg-[var(--color-bg-cream)]">
          {/* DISCOUNT BADGE */}
          {discount > 0 && (
            <div className="absolute right-3 top-3 z-10 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
              {discount}% OFF
            </div>
          )}

          {/* ❤️ WISHLIST BUTTON — top left */}
          <div
            className="absolute left-2 top-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <WishlistButton productId={id} />
          </div>

          {image && !imgError ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width:768px) 50vw, 25vw"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgError(true);
                setImgLoaded(true);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="relative h-20 w-20">
                <Image
                  src="/companylogo.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {!imgLoaded && image && !imgError && (
            <div className="absolute inset-0 animate-pulse bg-neutral-100" />
          )}
        </div>

        {/* CONTENT */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-h-[48px] text-sm font-medium text-[var(--color-text-heading)] transition-colors group-hover:text-[var(--color-brand-primary)]">
            {name}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--color-text-heading)]">
              ₹{Math.round(displayPrice).toLocaleString()}
            </span>

            {(discountPrice || hasMultipleSizes) && (
              <span className="text-sm text-neutral-400 line-through">
                ₹{price.toLocaleString()}
              </span>
            )}
          </div>

          {/* SIZE SELECT */}
          {hasMultipleSizes && sizes.length > 0 && (
            <select
              value={
                selectedSize
                  ? `${selectedSize.size}-${selectedSize.quantity}`
                  : ""
              }
              onChange={(e) => {
                const found =
                  sizes.find(
                    (s) => `${s.size}-${s.quantity}` === e.target.value
                  ) || null;
                setSelectedSize(found);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">Select size</option>
              {sizes.map((s, index) => (
                <option key={index} value={`${s.size}-${s.quantity}`}>
                  {s.size} ({s.quantity}
                  {s.unit}) — ₹{s.discountPrice ?? s.price}
                </option>
              ))}
            </select>
          )}

          {/* BUTTONS */}
          <div
            className="mt-auto flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleShopNow}
              className="h-10 rounded-xl bg-[var(--color-brand-primary)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Shop Now
            </button>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                isOutOfStock ||
                (hasMultipleSizes && sizes.length > 0 && !selectedSize)
              }
              className="h-10 rounded-xl bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>

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
              {["+91 9820623835", "+91 9819079079"].map((num) => (
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