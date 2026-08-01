"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";

import { Leaf, ArrowRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────
interface CategoryProduct {
  _id: string;
  name: string;
  slug: string;
  price?: number;
  discountPrice?: number;
  image?: string;
  company: {
    _id: string;
    slug: string;
    name: string;
  };
}

interface ShopByCategoryItem {
  _id: string;
  title: string;
  image: string;
  description?: string;
  isActive: boolean;
  priority: number;
  product?: CategoryProduct | string;
}

interface ShopByCategorySettings {
  isVisible: boolean;
  limit: number;
}

interface ShopByCategoryProps {
  companyId: string;
  companySlug: string;
}

// ── Map title → /collections?category= slug ───────────
const TITLE_TO_CATEGORY: Record<string, string> = {
  "face care":  "face-care",
  "body care":  "body-care",
  "hair care":  "hair-care",
  "gift kits":  "gift-kits",
  "gift kit":   "gift-kits",
  // add more mappings here if your admin uses different titles
};

function getCategoryHref(title: string): string {
  const key = title.toLowerCase().trim();
  const category = TITLE_TO_CATEGORY[key];
  if (category) return `/collections?category=${category}`;
  // fallback — show all collections
  return `/collections`;
}

// ── Category SVG Icons ────────────────────────────────
const CategoryIcon = ({ title }: { title: string }) => {
  const t = title.toLowerCase();
  if (t.includes("face"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M9 11c0 1.657 1.343 3 3 3s3-1.343 3-3" />
        <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
      </svg>
    );
  if (t.includes("body"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <path d="M6.5 8h11l1.5 5-3 1v6h-8v-6L5 13z" />
      </svg>
    );
  if (t.includes("bath") || t.includes("shower"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4z" />
        <path d="M6 12V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1" />
        <path d="M8 21v1M16 21v1" />
      </svg>
    );
  if (t.includes("massage") || t.includes("oil"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  if (t.includes("hair"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 5 5 5 9c0 2.5 1 4.5 3 6l1 7h6l1-7c2-1.5 3-3.5 3-6 0-4-3-7-7-7z" />
      </svg>
    );
  if (t.includes("gift"))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v10H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    );
  return <Leaf className="h-5 w-5" />;
};

// ── Get category image based on title ─────────────────
const getCategoryImage = (title: string): string => {
  const t = title.toLowerCase();

  if (t.includes("face"))
    return "https://img.magnific.com/free-photo/woman-using-face-roller-skincare_23-2151983502.jpg?semt=ais_hybrid&w=740&q=80";

  if (t.includes("body"))
    return "https://img.magnific.com/free-photo/close-beauty-portrait-topless-woman-with-perfect-skin-holding-bottle-shampoo-lotion-apply-shoulders-body-white-background_343596-8008.jpg?semt=ais_hybrid&w=740&q=80";

  if (t.includes("bath") || t.includes("shower"))
    return "https://media.istockphoto.com/id/1141213118/photo/smiling-female-rubbing-body-with-foam.jpg?s=612x612&w=0&k=20&c=XtCgHPKv78vuDvrpad11ifsbRHT-4_XMq6qhdbeChJk=";

  if (t.includes("massage") || t.includes("oil"))
    return "https://media.istockphoto.com/id/994810170/photo/therapist-pouring-massage-oil-at-spa.jpg?s=612x612&w=0&k=20&c=T2QnfdS3LEVqUV4mOjSRFxxrvHgkHaMjHcfshDIyNL8=";

  if (t.includes("hair"))
    return "https://cdn.prod.website-files.com/667a8e3de4fbbd05a23d72ec/6914604de6ce2410681c4ec6_Natural%20Hair%20Mask%20Formulations%20for%20Restoring%20Damaged%20Hair.webp";

  if (t.includes("gift"))
    return "https://png.pngtree.com/png-vector/20241224/ourmid/pngtree-pink-cosmetic-products-arranged-neatly-symbolizing-beauty-and-self-care-png-image_14846374.png";

  // fallback
  return "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
};

// ── Main Component ─────────────────────────────────────
export function ShopByCategory({ companyId, companySlug }: ShopByCategoryProps) {
  const [items, setItems] = useState<ShopByCategoryItem[]>([]);
  const [settings, setSettings] = useState<ShopByCategorySettings>({ isVisible: true, limit: 6 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/companies/${companyId}/shop-by-concern`);
        if (!response.ok) throw new Error("Failed to fetch category data");
        const data = await response.json();
        setSettings(data.settings || { isVisible: true, limit: 6 });
        if (Array.isArray(data.items)) {
          const transformed = data.items
            .map((item: any) => {
              if (!item) return null;
              const product = item.product || item.productId;
              return {
                _id: item._id,
                title: item.title,
                image: item.image,
                description: item.description,
                isActive: item.isActive ?? true,
                priority: item.priority ?? 0,
                product:
                  product && typeof product === "object"
                    ? {
                        _id: product._id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        discountPrice: product.discountPrice,
                        image: product.image,
                        company: product.company || { _id: companyId, slug: companySlug, name: "" },
                      }
                    : undefined,
              };
            })
            .filter((item: ShopByCategoryItem | null): item is ShopByCategoryItem => item !== null);
          setItems(transformed);
        }
      } catch (err) {
        console.error("Error fetching category data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    if (companyId) fetchCategories();
  }, [companyId, companySlug]);

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => i.isActive)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, settings.limit),
    [items, settings.limit]
  );

  const marqueeWrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const offsetRef = useRef(0);        // current translateX, in px (negative = scrolled left)
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const velocityRef = useRef(0);      // px/frame, for momentum after release
  const lastDragXRef = useRef(0);

  useEffect(() => {
    let frameId: number;
    const autoSpeed = 1;     // px/frame auto-scroll speed
    const maxScale = 1;
    const minScale = 0.72;
    const falloff = 260;

    function tick() {
      const wrap = marqueeWrapRef.current;
      const track = trackRef.current;

      if (track && wrap) {
        // ── position ──
        if (draggingRef.current) {
          velocityRef.current *= 0.0; // velocity computed on the fly in pointermove instead
        } else {
          if (Math.abs(velocityRef.current) > 0.05) {
            offsetRef.current += velocityRef.current;
            velocityRef.current *= 0.95; // momentum decay
          } else {
            velocityRef.current = 0;
            offsetRef.current -= autoSpeed; // resume auto-scroll
          }
        }

        // seamless infinite wrap (content is duplicated, so half width = one full loop)
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0) {
          if (offsetRef.current <= -halfWidth) offsetRef.current += halfWidth;
          if (offsetRef.current > 0) offsetRef.current -= halfWidth;
        }

        track.style.transform = `translateX(${offsetRef.current}px)`;

        // ── coverflow scaling ──
        const wrapRect = wrap.getBoundingClientRect();
        const centerX = wrapRect.left + wrapRect.width / 2;

        itemRefs.current.forEach((el) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const itemCenterX = rect.left + rect.width / 2;
          const dist = Math.abs(itemCenterX - centerX);
          const t = Math.min(dist / falloff, 1);
          const eased = 1 - Math.pow(1 - t, 2);
          const scale = maxScale - eased * (maxScale - minScale);

          el.style.transform = `scale(${scale})`;
          el.style.zIndex = String(Math.round((1 - t) * 100));
        });
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [activeItems.length]);

  // ── Drag handlers ──
  function handlePointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    lastDragXRef.current = e.clientX;
    velocityRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const delta = e.clientX - dragStartXRef.current;
    offsetRef.current = dragStartOffsetRef.current + delta;
    velocityRef.current = e.clientX - lastDragXRef.current; // for momentum on release
    lastDragXRef.current = e.clientX;
  }

  function handlePointerUp() {
    draggingRef.current = false;
    // velocityRef.current already holds last frame's delta — momentum decay picks it up in tick()
  }

  if (loading) {
    return (
      <section className="py-12">
        <div className="container-nezal">
          <div className="mb-8 text-center">
            <Skeleton className="mx-auto h-8 w-56" />
            <Skeleton className="mx-auto mt-2 h-1 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-20 w-20 rounded-xl" />
                </div>
                <Skeleton className="mt-4 h-5 w-3/4" />
                <Skeleton className="mt-2 h-10 w-full" />
                <Skeleton className="mt-3 h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !settings.isVisible || activeItems.length === 0) return null;

  return (
    <section className="py-16 md:py-8 overflow-hidden">
      <div className="container-nezal">
        <div className="mb-12 text-center">
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Shop by <span className="text-primary">Category</span>
          </h2>
          <div className="mt-2 flex justify-center">
            <div className="h-0.5 w-24 rounded-full bg-primary" />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Browse our curated collections and find exactly what you're looking for.
          </p>
        </div>

        {/* Marquee */}
        <div
          ref={marqueeWrapRef}
          className="nezal-marquee-wrap relative w-full cursor-grab active:cursor-grabbing select-none overflow-hidden "
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-background to-transparent" />

          <div ref={trackRef} className="flex items-center" style={{ gap: "2rem", willChange: "transform" }}>
            {[...activeItems, ...activeItems].map((item, i) => {
              const href = getCategoryHref(item.title);
              const imageUrl = getCategoryImage(item.title);
              const baseSize = 200;

              return (
                <Link
                  key={`${item._id}-${i}`}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  href={href}
                  draggable={false}
                  onClick={(e) => {
                    // if the user dragged more than a few px, treat it as a drag, not a click
                    if (Math.abs(velocityRef.current) > 1 || draggingRef.current) e.preventDefault();
                  }}
                  className="group relative overflow-hidden rounded-full border-2 border-border shadow-sm transition-shadow duration-300 hover:shadow-xl"
                  style={{
                    flex: `0 0 ${baseSize}px`,
                    width: baseSize,
                    height: baseSize,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`${item.title} category`}
                    draggable={false}
                    className="h-full w-full object-cover pointer-events-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-3 pb-4 text-center">
                    <p className="font-bold text-white drop-shadow-sm text-sm">{item.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Explore All Categories Button */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all duration-300 hover:gap-3 hover:shadow-lg"
            style={{
              backgroundColor: "#1e3a28",
              color: "#fdfaf5",
            }}
          >
            See All Categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes nezal-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .nezal-marquee-track {
          animation-name: nezal-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .nezal-marquee-wrap:hover .nezal-marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}