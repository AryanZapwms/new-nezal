"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAddToWishlist } from "@/lib/facebook-pixel";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { has, toggle } = useWishlistStore();
  // The store is saved in localStorage, which the server can't read. Show the
  // saved state only after mount, so a server-rendered heart (product page)
  // matches the browser's first render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const liked = mounted && has(productId);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    const wasLiked = liked;
    setLoading(true);
    // Optimistic: the heart flips now. The request doesn't put up the
    // full-screen overlay (SILENT_REQUESTS in lib/fetch-interceptor.ts).
    toggle(productId);

    if (!wasLiked) {
      trackAddToWishlist(productId, productName || productId, productPrice);
    }

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error(`Wishlist update failed: ${res.status}`);
    } catch {
      toggle(productId); // roll back
      toast({
        title: "Couldn't update your wishlist",
        description: "Please try again.",
        variant: "destructive",
      });
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