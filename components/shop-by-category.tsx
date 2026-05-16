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
  if (t.includes("gift")) {
    return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop";
  }
  return "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
};

// ── Trust bar ──────────────────────────────────────────
const trustFeatures = [
  { icon: Leaf,    label: "Natural Ingredients", sub: "Pure herbal extracts"       },
  { icon: Shield,  label: "Safe & Effective",    sub: "Dermatologically tested"    },
  { icon: Package, label: "Sustainable",         sub: "Eco‑friendly packaging"     },
  { icon: Users,   label: "Loved by Many",       sub: "10,000+ happy customers"   },
];

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
      <div className="border-b border-border bg-muted/30 py-5">
        <div className="container-nezal">
          <div className="flex flex-wrap items-center justify-center gap-6 md:justify-between">
            {trustFeatures.map((feat, idx) => (
              <div key={feat.label} className="flex items-center gap-3">
                {idx > 0 && <div className="hidden h-8 w-px bg-border md:block" />}
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <feat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{feat.label}</p>
                  <p className="text-xs text-muted-foreground">{feat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shop by Category section */}
      <section className="py-16 md:py-20">
        <div className="container-nezal">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Flower2 className="h-4 w-4" />
              Explore by Category
            </div>
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

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 gap-6 lg:grid-cols-4"
          >
            {activeItems.map((item) => {
              // ✅ THE FIX — links to /collections?category=face-care etc.
              const href = getCategoryHref(item.title);

              const imageUrl =
                item.image?.startsWith("http") || (typeof item.product === "object" && item.product?.image?.startsWith("http"))
                  ? (item.image || (typeof item.product === "object" ? item.product?.image : ""))
                  : item.image || (typeof item.product === "object" ? item.product?.image : "")
                  ? `/${item.image || (typeof item.product === "object" ? item.product?.image : "")}`
                  : getCategoryImage(item.title);

              return (
                <motion.div
                  key={item._id}
                  variants={cardVariants}
                  whileHover={{ y: -6 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl"
                >
                  <div className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                          <CategoryIcon title={item.title} />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                        {item.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm">
                        <img
                          src={imageUrl}
                          alt={`${item.title} category`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop";
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={href}
                        className="flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
                      >
                        Shop Now
                      </Link>
                    </div>
                  </div>

                  {/* Bottom hover bar */}
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}