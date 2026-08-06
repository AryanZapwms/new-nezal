"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackAddToWishlist } from "@/lib/facebook-pixel";

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  productPrice?: number;
  className?: string;
}

export function WishlistButton({
  productId,
  productName,
  productPrice,
  className = "",
}: WishlistButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { has, toggle } = useWishlistStore();
  const liked = has(productId);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    const wasLiked = liked;
    setLoading(true);
    toggle(productId); // optimistic

    if (!wasLiked) {
      trackAddToWishlist(productId, productName || productId, productPrice);
    }

    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    } catch {
      toggle(productId); // revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-full p-2 transition-all duration-200 ${
        liked
          ? "text-red-500 bg-red-50 hover:bg-red-100"
          : "text-gray-400 hover:text-red-500 hover:bg-red-50"
      } ${className}`}
      aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={`h-5 w-5 transition-all ${liked ? "fill-red-500" : ""}`} />
    </button>
  );
}