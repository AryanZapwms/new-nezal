"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";
import { useToast } from "@/hooks/use-toast";
import { Leaf, Shield, Package, Users, Flower2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────
interface ConcernProduct {
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

interface ShopByConcernItem {
  _id: string;
  title: string;
  image: string;
  description?: string;
  isActive: boolean;
  priority: number;
  product?: ConcernProduct | string;
}

interface ShopByConcernSettings {
  isVisible: boolean;
  limit: number;
}

interface ShopByConcernProps {
  companyId: string;
  companySlug: string;
}

// ── Concern SVG Icons ────────────────────────────────
const ConcernIcon = ({ title }: { title: string }) => {
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
  return <Leaf className="h-5 w-5" />;
};

// ── Get related image based on concern title ──────────
const getConcernImage = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes("face")) {
    return "https://gotoskincare.com/cdn/shop/articles/0221_GT_Website_BlogImagery_8.jpg?v=1613451516&width=1024";
  }
  if (t.includes("body")) {
    return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=400&fit=crop";
  }
  if (t.includes("bath") || t.includes("shower")) {
    return "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=400&fit=crop";
  }
  if (t.includes("massage") || t.includes("oil")) {
    return "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop";
  }
  if (t.includes("hair")) {
    return "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=400&h=400&fit=crop";
  }
  if (t.includes("acne")) {
    return "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop";
  }
  if (t.includes("pigmentation") || t.includes("dark spot")) {
    return "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop";
  }
  return "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
};

// ── Trust bar ─────────────────────────────────────────
const trustFeatures = [
  { icon: Leaf, label: "Natural Ingredients", sub: "Pure herbal extracts" },
  { icon: Shield, label: "Safe & Effective", sub: "Dermatologically tested" },
  { icon: Package, label: "Sustainable", sub: "Eco‑friendly packaging" },
  { icon: Users, label: "Loved by Many", sub: "10,000+ happy customers" },
];

// ── Main Component ────────────────────────────────────
export function ShopByConcern({ companyId, companySlug }: ShopByConcernProps) {
  const [items, setItems] = useState<ShopByConcernItem[]>([]);
  const [settings, setSettings] = useState<ShopByConcernSettings>({ isVisible: true, limit: 6 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();

  // Fetch concerns
  useEffect(() => {
    const fetchConcerns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/companies/${companyId}/shop-by-concern`);
        if (!response.ok) throw new Error("Failed to fetch shop by concern data");
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
            .filter((item: ShopByConcernItem | null): item is ShopByConcernItem => item !== null);
          setItems(transformed);
        }
      } catch (err) {
        console.error("Error fetching shop by concern data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    if (companyId) fetchConcerns();
  }, [companyId, companySlug]);

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => i.isActive)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, settings.limit),
    [items, settings.limit]
  );

  const handleAddToCart = (e: React.MouseEvent, item: ShopByConcernItem) => {
    e.preventDefault();
    e.stopPropagation();
    const p = item.product && typeof item.product === "object" ? (item.product as ConcernProduct) : null;
    if (!p) {
      toast({ title: "Unavailable", description: "Product info not available.", variant: "destructive" });
      return;
    }
    addItem({
      productId: p._id,
      name: p.name,
      price: p.price ?? 0,
      discountPrice: p.discountPrice,
      image: p.image,
      quantity: 1,
      company: p.company,
    });
    toast({ title: "Added to cart", description: `${p.name} added.` });
  };

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
              <div key={i} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <>
      {/* Trust bar */}
      <div className="border-b border-emerald-100 bg-white/50 py-5 backdrop-blur-sm">
        <div className="container-nezal">
          <div className="flex flex-wrap items-center justify-center gap-6 md:justify-between">
            {trustFeatures.map((feat, idx) => (
              <div key={feat.label} className="flex items-center gap-3">
                {idx > 0 && <div className="hidden h-8 w-px bg-emerald-200 md:block" />}
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-700">
                  <feat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e3a28]">{feat.label}</p>
                  <p className="text-xs text-emerald-700/70">{feat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shop By Concern section */}
      <section className="py-16 md:py-20">
        <div className="container-nezal">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <Flower2 className="h-4 w-4" />
              Personalised Skincare
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#1e3a28] md:text-4xl">
              Shop by <span className="text-emerald-600">Concern</span>
            </h2>
            <div className="mt-2 flex justify-center">
              <div className="h-0.5 w-24 rounded-full bg-emerald-500" />
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-[#4a5e50]">
              Find the perfect solution for your unique skin needs – curated by our experts.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 gap-6 lg:grid-cols-4"
          >
            {activeItems.map((item) => {
              // 🔁 CHANGED: Always go to shop page with concern + company filter
              const shopHref = `/shop?concern=${encodeURIComponent(item.title)}${companySlug ? `&company=${companySlug}` : ''}`;

              const imageUrl =
                item.image?.startsWith("http") || (typeof item.product === "object" && item.product?.image?.startsWith("http"))
                  ? (item.image || (typeof item.product === "object" ? item.product?.image : ""))
                  : item.image || (typeof item.product === "object" ? item.product?.image : "")
                  ? `/${item.image || (typeof item.product === "object" ? item.product?.image : "")}`
                  : getConcernImage(item.title);

              return (
                <motion.div
                  key={item._id}
                  variants={cardVariants}
                  whileHover={{ y: -6 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
                >
                  <div className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-2 inline-flex rounded-xl bg-emerald-50 p-2 text-emerald-700">
                          <ConcernIcon title={item.title} />
                        </div>
                        <h3 className="text-lg font-bold text-[#1e3a28]">{item.title}</h3>
                        {item.description && (
                          <p className="mt-1 text-xs leading-relaxed text-[#6b7c70] line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 shadow-sm">
                        <img
                          src={imageUrl}
                          alt={`${item.title} skincare concern`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-2">
                      <Link
                        href={shopHref}
                        className="flex w-full items-center justify-center rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-800 hover:shadow-md"
                      >
                        Shop Now
                      </Link>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-500 transition-all duration-300 group-hover:w-full" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}