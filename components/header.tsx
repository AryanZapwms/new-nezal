"use client";

import Link from "next/link";
import Image from "next/image";
import { CartIcon } from "@/components/cart-icon";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User, LogOut, ShoppingBag, ChevronDown,
  Search, Heart, Menu, X, Leaf, ChevronRight, LayoutDashboard,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { getCachedSync, fetchWithCache, initCache } from "@/lib/cacheClient";
import { BRAND } from "@/lib/config";
import { MobileNav } from "@/components/layout/MobileNav"
import { Button } from "./ui/button";
import { useCartStore } from "@/lib/store/cart-store"
import { SearchBar } from "@/components/SearchBar"

/* ─── Types ─────────────────────────────────────────────── */

interface Company {
  _id: string;
  name: string;
  slug: string;
}

/* ─── Constants ─────────────────────────────────────────── */

const COMPANIES_KEY = "companies:all";
const TTL = 1000 * 60 * 5;
const MAX_AGE = 1000 * 60 * 60 * 24;

const MENU_TTL = 1000 * 60 * 5;       // 5 min — background refresh kicks in after this
const MENU_MAX_AGE = 1000 * 60 * 30;  // 30 min — cached value is discarded after this

async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch companies");
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}


const MENU_COLLECTIONS_KEY = "menu:collections";
const MENU_CONCERNS_KEY = "menu:concerns";
const MENU_RITUALS_KEY = "menu:rituals";

async function fetchMenuCollections(): Promise<MenuCollection[]> {
  const res = await fetch("/api/collections", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch collections");
  const data = await res.json(); // bare array
  const list = Array.isArray(data) ? data : (data.collections ?? []);
  return list.map((c: any) => ({
    label: c.name,
    slug: c.slug,
    tagline: c.tagline || "",
    navCategory: c.navCategory,
    subCategory: c.subCategory,
  }));
}

async function fetchMenuConcerns(): Promise<MenuConcern[]> {
  const res = await fetch("/api/concerns", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch concerns");
  const data = await res.json(); // { concerns: [...] }
  return (data.concerns ?? []).map((c: any) => ({ label: c.label, slug: c.slug }));
}

async function fetchMenuRituals(): Promise<MenuRitual[]> {
  const res = await fetch("/api/rituals", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch rituals");
  const data = await res.json(); // { rituals: [...] }
  return (data.rituals ?? []).map((r: any) => ({ label: r.name, slug: r.slug, tagline: r.tagline || "" }));
}


function requestIdle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 1);
  }
}

/* ─── Mega Menu Data ────────────────────────────────────── */

// const NAV_CATEGORIES = [
//   {
//     heading: "Soap",
//     key: "soaps",
//     collections: [
//       { label: "Rock Soap",     slug: "rock-soap",     tagline: "Ancient mineral-rich rocks meet Ayurvedic botanicals" },
//       { label: "Designer Soap", slug: "designer-soap", tagline: "Aesthetic skincare with functional benefits"          },
//       { label: "Round Soap",    slug: "round-soap",    tagline: "Gentle care for everyday skin"                        },
//       { label: "Aissis Soap",   slug: "aissis-soap",   tagline: "Advanced skincare solutions in every bar"             },
//       { label: "Premium Soap",  slug: "premium-soap",  tagline: "Luxury bathing reimagined with active botanicals"     },
//       { label: "Doobie Soap",   slug: "doobie-soap",   tagline: "Pure natural cleansing for everyday skin"             },
//       { label: "Chip Soap",     slug: "chip-soap",     tagline: "Pure natural cleansing for everyday skin"             },
//     ],
//   },
//   {
//     heading: "Body Care",
//     key: "body-care",
//     collections: [
//       { label: "Body Lotion",      slug: "body-lotion",      tagline: "All-day hydration, nature's way"           },
//       { label: "Aloe Vera Gel",    slug: "aloe-vera-gel",    tagline: "Pure soothing hydration for skin and hair" },
//       { label: "Hand Wash",        slug: "hand-wash",        tagline: "Clean, protect and care for your hands"    },
//       { label: "Intimate Wash",    slug: "intimate-wash",    tagline: "Gentle care and daily freshness"           },
//     ],
//   },
//   {
//     heading: "Bath & Shower",
//     key: "bath-shower",
//     collections: [
//       { label: "Shower Gel", slug: "shower-gel", tagline: "Your daily cleanse, elevated" },
//       { label: "Bath Salt",  slug: "bath-salt",  tagline: "Turn your bath into a ritual" },
//     ],
//   },
//   {
//     heading: "Face Care",
//     key: "face-care",
//     collections: [
//       { label: "Foaming Face Wash", slug: "foaming-face-wash", tagline: "Deep cleanse without stripping your skin" },
//       { label: "Face Serum",        slug: "face-serum",        tagline: "Targeted actives for every skin story"   },
//     ],
//   },
//   {
//     heading: "Hair Care",
//     key: "hair-care",
//     collections: [
//       { label: "Shampoo",     slug: "shampoo",     tagline: "Cleanse your scalp, nourish your roots" },
//       { label: "Conditioner", slug: "conditioner", tagline: "Frizz-free, silky, nourished hair"      },
//       { label: "Hair Serum",  slug: "hair-serum",  tagline: "From root to tip — strength and growth" },
//     ],
//   },
//   {
//     heading: "Massage / Spa",
//     key: "massage-oil",
//     collections: [
//       { label: "Body Massage Oil", slug: "body-massage-oil", tagline: "Relaxation and skin nourishment in every drop" },
//        { label: "Bath Salt",  slug: "bath-salt",  tagline: "Turn your bath into a ritual" },
//     ],
//   },
//   {
//     heading: "Nezal's Rituals",
//     key: "rituals",
//     viewAllHref: "/rituals",
//     emptyState: { label: "Explore All Rituals", description: "Curated, step-by-step routines designed around how you want to feel." },
// collections: [
//   {
//     label: "Clear Skin Ritual",
//     slug: "clear-skin-ritual",
//     tagline: "...",
//     href: "/rituals/clear-skin-ritual",
//   },
//   {
//     label: "Radiance & Glow Ritual",
//     slug: "radiance-glow-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/radiance-glow-ritual",
//   },
//   {
//     label: "Hydration Ritual",
//     slug: "hydration-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/hydration-ritual",
//   },
//   {
//     label: "Hair Wellness Ritual",
//     slug: "hair-wellness-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/hair-wellness-ritual",
//   },
//   {
//     label: "Royal Glow Ritual",
//     slug: "royal-glow-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/royal-glow-ritual",
//   },
//   {
//     label: "Bridal Glow Ritual",
//     slug: "bridal-glow-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/bridal-glow-ritual",
//   },
//   {
//     label: "Spa Indulgence & Evening Ritual",
//     slug: "spa-indulgence-evening-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/spa-indulgence-evening-ritual",
//   },
//   {
//     label: "Daily Essentials Ritual",
//     slug: "daily-essentials-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/daily-essentials-ritual",
//   },
//   {
//     label: "Executive Gifting Ritual",
//     slug: "executive-gifting-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/executive-gifting-ritual",
//   },
//   {
//     label: "Morning Refresh Ritual",
//     slug: "morning-refresh-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/morning-refresh-ritual",
//   },
//   {
//     label: "Botanical Comfort Ritual",
//     slug: "botanical-comfort-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/botanical-comfort-ritual",
//   },
//   {
//     label: "Tropical Escape Ritual",
//     slug: "tropical-escape-ritual",
//     tagline: "Relaxation and skin nourishment in every drop",
//     href: "/rituals/tropical-escape-ritual",
//   },
// ],
//   },
//   {
//     heading: "Gift Kits",
//     key: "gift-kits",
//     collections: [
//       { label: "Gift Kits", slug: "gift-kits", tagline: "Curated care for the people you love" },
//     ],
//   },
// ];

// const CONCERNS = [
//   { label: "Acne & Oil Control",                 slug: "acne"                          },
//   { label: "Pigmentation & Dark Spots",           slug: "pigmentation"                  },
//   { label: "Dry Skin",                            slug: "dryness"                       },
//   { label: "Hair Fall & Thinning Hair",           slug: "hairfall"                      },
//   { label: "Dull & Tired Skin",                   slug: "dull-tired-skin"               },
//   { label: "Skin Brightening & Glow",             slug: "skin-brightening-glow"         },
//   { label: "Deep Hydration",                      slug: "hydration"                     },
//   { label: "Sensitive Skin Care",                 slug: "ensitive-skin-care"            },
//   { label: "Scalp Purification & Freshness",      slug: "scalp-purification-freshness"  },
//   { label: "Frizz Control & Dry Hair",            slug: "frizz-control-dry-hair"        },
//   { label: "Anti-Ageing Care",                    slug: "anti-ageing-care"              },
//   { label: "Daily Skin Nourishment",              slug: "daily-skin-nourishment"        },
//   { label: "Stress Relief & Relaxation",          slug: "stress-relief-relaxation"      },
//   { label: "Spa at Home",                         slug: "spa-at-home"                   },
//   { label: "Luxury Gifting",                      slug: "luxury-gifting"                },
//   { label: "Hair Growth & Scalp Nourishment",     slug: "hair-growth-scalp-nourishment" },
//   { label: "Daily Skin Care",                     slug: "daily-skin-care"               },
//   { label: "Sun Exposure & Tan Care",             slug: "sun-exposure-tan-care"         },
//   { label: "Deep Cleansing & Detox",              slug: "deep-cleansing-detox"          },
//   { label: "Rough & Uneven Skin Texture",         slug: "rough-uneven-skin-texture"     },
//   { label: "Soft & Smooth Skin",                  slug: "soft-smooth-skin"              },
//   { label: "Summer Skin Care",                    slug: "summer-skin-care"              },
//   { label: "Everyday Freshness",                  slug: "everyday-freshness"            },
// ];

// function getFlatCollections(cat: typeof NAV_CATEGORIES[number]) {
//   if ("sections" in cat && cat.sections) {
//     return cat.sections.flatMap((s) => s.collections);
//   }
//   return (cat as any).collections ?? [];
// }


const COLLECTION_MENU_GROUPS: { heading: string; key: string }[] = [
  { heading: "Soap",          key: "soaps" },
  { heading: "Body Care",     key: "body-care" },
  { heading: "Bath & Shower", key: "bath-shower" },
  { heading: "Face Care",     key: "face-care" },
  { heading: "Hair Care",     key: "hair-care" },
  { heading: "Massage / Spa", key: "massage-oil" },
  { heading: "Gift Kits",     key: "gift-kits" },
];

const RITUALS_MENU_GROUP = {
  heading: "Nezal's Rituals",
  key: "rituals",
  viewAllHref: "/rituals",
  emptyState: {
    label: "Explore All Rituals",
    description: "Curated, step-by-step routines designed around how you want to feel.",
  },
};

interface MenuCollection { label: string; slug: string; tagline: string; navCategory: string; subCategory: string }
interface MenuConcern { label: string; slug: string }
interface MenuRitual { label: string; slug: string; tagline: string }

interface MenuCategoryGroup {
  heading: string;
  key: string;
  collections: { label: string; slug: string; tagline?: string; href?: string }[];
  viewAllHref?: string;
  emptyState?: { label: string; description: string };
}

// INGREDIENTS stays exactly as it was — untouched, still hardcoded.



const INGREDIENTS = [
  { label: "Aloe Vera",        slug: "aloe-vera"        },
  { label: "Neem",             slug: "neem"             },
  { label: "Tulsi",            slug: "tulsi"            },
  { label: "Turmeric",         slug: "turmeric"         },
  { label: "Tea Tree",         slug: "tea-tree"         },
  { label: "Vitamin C",        slug: "vitamin-c"        },
  { label: "Hyaluronic Acid",  slug: "hyaluronic-acid"  },
  { label: "Niacinamide",      slug: "niacinamide"      },
  { label: "Bhringraj",        slug: "bhringraj"        },
  { label: "Shea Butter",      slug: "shea-butter"      },
  { label: "Salicylic Acid",   slug: "salicylic-acid"   },
  { label: "Rose",             slug: "rose"             },
]



/* ─── Collection Card (inside mega menu) ────────────────── */

function CollectionCard({
  label, slug, tagline, onClick, href,
}: {
  label: string; slug: string; tagline: string; onClick: () => void; href?: string;
}) {
  return (
    <Link
      href={href ?? `/collections/${slug}`}
      onClick={onClick}
      className="group flex items-start gap-3 p-3 border-[#efecec] border rounded-xl hover:bg-[var(--color-bg-cream)] transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-brand-primary)]/20 transition-colors">
        <Leaf size={16} className="text-[var(--color-brand-primary)]" />
      </div>
      <div className="flex flex-col items-center gap-0.5 min-w-0 ">
        <h1 className="text-sm font-semibold text-[var(--color-text-heading)] group-hover:text-[var(--color-brand-primary)] transition-colors">
          {label}
        </h1>
       
      </div>
    </Link>
  );
}

/* ─── Desktop Mega Menu ─────────────────────────────────── */

function MegaMenu({
  onClose, navCategories, concerns,
}: {
  onClose: () => void;
  navCategories: MenuCategoryGroup[];
  concerns: MenuConcern[];
}) {
  const [activeCategory, setActiveCategory] = useState(navCategories[0]);

  // navCategories arrives async (empty on first render before fetch resolves) —
  // keep activeCategory in sync once real data lands
  useEffect(() => {
    if (!navCategories.find((c) => c.key === activeCategory?.key)) {
      setActiveCategory(navCategories[0]);
    }
  }, [navCategories]);

  if (!activeCategory) return null; // brief instant on first paint, resolves as soon as cache/fetch lands

  return (
    <div
      className="absolute top-full z-50 mt-6 rounded-2xl border bg-white shadow-2xl"
      style={{
  borderColor: "var(--color-border)",
  width: "1200px",
  left: -250,
}}
    >
      <div className="grid grid-cols-[180px_1fr_160px_160px] items-stretch">

        {/* Zone 1 — Category list */}
        <div className="border-r bg-[var(--color-bg-cream)] p-4 flex flex-col gap-1 self-stretch" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-3 mb-2">
            Categories
          </p>
          {navCategories.map((cat) => (
            <button

              key={cat.key}
              onMouseEnter={() => setActiveCategory(cat)}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeCategory.key === cat.key
                  ? "bg-white text-[var(--color-brand-primary)] shadow-sm"
                  : "text-[var(--color-text-heading)] hover:bg-white/60"
              }`}
            >
              {cat.heading}
              <ChevronRight size={14} className="opacity-40" />
            </button>
          ))}

          <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link
              href="/shop"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[#127208] hover:text-white transition-colors border"
            >
              Shop All →
            </Link>
          </div>
        </div>

      <div className="p-5">
  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
    {activeCategory.heading} Collections
  </p>

  {activeCategory.collections.length > 0 ? (
    <div
  className="grid grid-cols-2 gap-1 overflow-y-auto custom-scroll pr-1"
  style={{ maxHeight: "320px" }}
>
  {activeCategory.collections.map((col) => (
    <CollectionCard
      key={col.slug}
      label={col.label}
      slug={col.slug}
      tagline={col.tagline}
      onClick={onClose}
      href={(col as any).href}
    />
  ))}
</div>
  ) : (
            (activeCategory as any).emptyState && (
              <Link
                href={(activeCategory as any).viewAllHref ?? "#"}
                onClick={onClose}
                className="flex flex-col gap-1 p-4 rounded-xl border border-[#efecec] hover:bg-[var(--color-bg-cream)] transition-colors"
              >
                <h1 className="text-sm font-semibold text-[var(--color-text-heading)]">
                  {(activeCategory as any).emptyState.label}
                </h1>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {(activeCategory as any).emptyState.description}
                </p>
              </Link>
            )
          )}

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link
              href={(activeCategory as any).viewAllHref ?? `/collections?category=${activeCategory.key}`}
              onClick={onClose}
              className="text-xs font-semibold text-[var(--color-brand-primary)] hover:bg-[#09882f] hover:text-white border px-3 py-2 rounded-xl transition-colors"
            >
              View all {activeCategory.heading} →
            </Link>
          </div>
        </div>

        {/* Zone 3 — By Concern */}
        <div className="border-l p-4 bg-[var(--color-bg-cream)] self-stretch flex flex-col" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-3">
            By Concern
          </p>
          <div className="flex flex-col gap-1 overflow-y-auto custom-scroll pr-1" style={{ maxHeight: "320px" }}>
            {concerns.map((concern) => (
              <Link
                key={concern.slug}
                href={`/concerns/${concern.slug}`}
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-[13px] text-[var(--color-text-body)] hover:bg-white hover:text-[var(--color-brand-primary)] font-medium transition-colors"
              >
                {concern.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link
              href="/concerns"
              onClick={onClose}
              className="text-xs font-semibold text-[var(--color-brand-primary)] border p-1 rounded-xl hover:text-white hover:bg-[#1fc706] "
            >
              All Concerns →
            </Link>
          </div>
        </div>

       {/* Zone 4 — By Ingredient */}
        <div className="border-l p-4 self-stretch flex flex-col" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-3">
            By Ingredient
          </p>
          <div className="flex flex-col gap-1 overflow-y-auto custom-scroll pr-1" style={{ maxHeight: "260px" }}>
            {INGREDIENTS.map((ing) => (
              <Link
                key={ing.slug}
                href={`/ingredients/${ing.slug}`}
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-[13px] text-[var(--color-text-body)] hover:bg-[var(--color-bg-cream)] hover:text-[var(--color-brand-primary)] font-medium transition-colors"
              >
                {ing.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link
              href="/ingredients"
              onClick={onClose}
              className="text-xs font-semibold  text-[var(--color-brand-primary)] border p-1 rounded-xl hover:text-white hover:bg-[#1fc706]"
            >
              All Ingredients →
            </Link>
          </div>

          <div className="pt-4 border-t mt-4" style={{ borderColor: "var(--color-border)" }}>
            <a
              href="/New Nezal Brochure.pdf"
              download="Nezal-Product-Brochure.pdf"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors text-[var(--color-text-muted)] hover:text-white hover:bg-[#097407]"
            >
              Download Brochure
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
/* ─── Header ────────────────────────────────────────────── */

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasFetchedRef = useRef(false);
  const prefetchedRef = useRef(new Set<string>());
  const shopMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [menuCollections, setMenuCollections] = useState<MenuCollection[]>([]);
const [menuConcerns, setMenuConcerns] = useState<MenuConcern[]>([]);
const [menuRituals, setMenuRituals] = useState<MenuRitual[]>([]);


  const clearCart = useCartStore((state) => state.clearCart)

  useEffect(() => {
    initCache();
    const cached = getCachedSync<Company[]>(COMPANIES_KEY, MAX_AGE) ?? [];
    if (cached.length > 0) setCompanies(cached);
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    let mounted = true;

    fetchWithCache(COMPANIES_KEY, fetchCompanies, {
      ttlMs: TTL, maxAgeMs: MAX_AGE, backgroundRefresh: true, persistToStorage: true,
    })
      .then((data) => {
        if (!mounted) return;
        setCompanies(data);
        requestIdle(() => {
          data.slice(0, 5).forEach((c) => {
            if (!prefetchedRef.current.has(c.slug)) {
              prefetchedRef.current.add(c.slug);
              try { router.prefetch(`/shop/${c.slug}`); } catch {}
            }
          });
        });
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [router]);

 useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (shopMenuRef.current && !shopMenuRef.current.contains(e.target as Node)) {
      setShopMenuOpen(false);
    }
  }
  function handleEscape(e: KeyboardEvent) {
    if (e.key === "Escape") setShopMenuOpen(false);
  }
  document.addEventListener("mousedown", handleClick);
  document.addEventListener("keydown", handleEscape);
  return () => {
    document.removeEventListener("mousedown", handleClick);
    document.removeEventListener("keydown", handleEscape);
  };
}, []);

  useEffect(() => {
    setShopMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

 useEffect(() => {
  const cachedCols = getCachedSync<MenuCollection[]>(MENU_COLLECTIONS_KEY, MENU_MAX_AGE) ?? [];
  if (cachedCols.length > 0) setMenuCollections(cachedCols);
  const cachedConcerns = getCachedSync<MenuConcern[]>(MENU_CONCERNS_KEY, MENU_MAX_AGE) ?? [];
  if (cachedConcerns.length > 0) setMenuConcerns(cachedConcerns);
  const cachedRituals = getCachedSync<MenuRitual[]>(MENU_RITUALS_KEY, MENU_MAX_AGE) ?? [];
  if (cachedRituals.length > 0) setMenuRituals(cachedRituals);
}, []);

useEffect(() => {
  fetchWithCache(MENU_COLLECTIONS_KEY, fetchMenuCollections, {
    ttlMs: MENU_TTL, maxAgeMs: MENU_MAX_AGE, backgroundRefresh: true, persistToStorage: true,
  }).then(setMenuCollections).catch(() => {});

  fetchWithCache(MENU_CONCERNS_KEY, fetchMenuConcerns, {
    ttlMs: MENU_TTL, maxAgeMs: MENU_MAX_AGE, backgroundRefresh: true, persistToStorage: true,
  }).then(setMenuConcerns).catch(() => {});

  fetchWithCache(MENU_RITUALS_KEY, fetchMenuRituals, {
    ttlMs: MENU_TTL, maxAgeMs: MENU_MAX_AGE, backgroundRefresh: true, persistToStorage: true,
  }).then(setMenuRituals).catch(() => {});
}, []);

const navCategories: MenuCategoryGroup[] = useMemo(() => {
  const bySubCategory = menuCollections.reduce<Record<string, MenuCollection[]>>((acc, c) => {
    if (!acc[c.subCategory]) acc[c.subCategory] = [];
    acc[c.subCategory].push(c);
    return acc;
  }, {});

  const collectionGroups: MenuCategoryGroup[] = COLLECTION_MENU_GROUPS.map((g) => ({
    heading: g.heading,
    key: g.key,
    collections: bySubCategory[g.key] || [],
  }));

  const ritualsGroup: MenuCategoryGroup = {
    ...RITUALS_MENU_GROUP,
    collections: menuRituals.map((r) => ({
      label: r.label,
      slug: r.slug,
      tagline: r.tagline,
      href: `/rituals/${r.slug}`, // preserves exactly how rituals link today
    })),
  };

  return [...collectionGroups, ritualsGroup];
}, [menuCollections, menuRituals]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/shop?search=${encodeURIComponent(query)}`);
    setSearchQuery("");
  }

  if (pathname?.startsWith("/admin")) return null;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  const isAdmin = session?.user?.role === "admin";

  const navLinks = [
    { label: "Home",     href: "/" },
    { label: "About Us", href: "/about-us" },
     { label: "Reviews",    href: "/reviews" },
    { label: "Blogs",    href: "/blog" },
    { label: "Contact",  href: "/contact-us" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm ">
        <div className="" style={{ borderColor: "var(--color-border)" }}>
          <div className="container-nezal w-full">
            <div className="flex h-25 items-center gap-6  ">

              {/* LOGO */}
              <Link href="/" className="flex shrink-0 items-center gap-2 " aria-label={`${BRAND.name} home`}>
                <div className="relative h-25 w-25">
                  <Image src="/nezallogo.jpg" alt={BRAND.name} fill className="object-contain" priority />
                </div>
              </Link>

              {/* DESKTOP NAV */}
              <nav className="hidden flex-1 items-center gap-0 lg:flex relative" >


                {/* Home — first link */}
                <Link
                  href="/"
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive("/")
                      ? "text-[var(--color-brand-primary)]"
                      : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                  }`}
                >
                  Home
                </Link>

                {/* SHOP + MEGA MENU — placed right after Home */}
                <div className="relative" ref={shopMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShopMenuOpen((v) => !v)}
                    className={`flex items-center gap-1 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      pathname?.startsWith("/shop") || pathname?.startsWith("/collections")
                        ? "text-[var(--color-brand-primary)]"
                        : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                    }`}
                  >
                    Shop
                    <ChevronDown className={`h-4 w-4 transition-transform ${shopMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {shopMenuOpen && (
  <MegaMenu
    onClose={() => setShopMenuOpen(false)}
    navCategories={navCategories}
    concerns={menuConcerns}
  />
)}
                </div>

                {/* Remaining links — About Us, Blogs, Contact */}
                {navLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      isActive(link.href)
                        ? "text-[var(--color-brand-primary)]"
                        : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="w-full max-w-md">
               <SearchBar />
              </div>

              {/* RIGHT SIDE */}
              <div className="ml-auto flex items-center gap-2">

                {isAdmin ? (
                  /* ADMIN — Dashboard button only */
                  <>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-[#efb01d] text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
              

                            <Button className="bg-red-500 text-sm rounded-xl"   onClick={() => { clearCart(); signOut({ callbackUrl: "/" }); }}>
                              Sign out
                            </Button>
                </>
                ) : (
                  /* REGULAR USER — Search, Wishlist, Cart, Account */
                  <>

                    


                    {/* WISHLIST */}
                 
<Link
  href={session?.user ? "/profile/wishlist" : "/auth/login?redirect=/profile/wishlist"}
  className="relative rounded-full p-2 transition-colors hover:bg-red-50 group"
  aria-label="My Wishlist"
>
  <Heart className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
</Link>

                    {/* CART */}
                    <CartIcon />

                    {/* ACCOUNT */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors hover:bg-[var(--color-bg-cream)]"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold shrink-0">
                            {session?.user?.name
                              ? session.user.name.charAt(0).toUpperCase()
                              : <User className="h-4 w-4" />}
                          </div>
                          {session?.user?.name && (
                            <span className="hidden text-sm font-medium text-[var(--color-text-heading)] lg:block max-w-[80px] truncate">
                              {session.user.name.split(" ")[0]}
                            </span>
                          )}
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="mt-2 w-52 rounded-xl border-green-300 p-1 shadow-xl bg-white">
                        {session?.user ? (
                          <>
                            <div className="px-3 py-2 border-b border-gray-100 mb-1">
                              <p className="text-sm font-semibold text-[var(--color-text-heading)] truncate">{session.user.name}</p>
                              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                            </div>
                            <DropdownMenuItem asChild>
                              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <User className="h-4 w-4" /> Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/profile/orders" className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <ShoppingBag className="h-4 w-4" /> Orders
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/profile/wishlist" className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Heart className="h-4 w-4" /> Wishlist
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { clearCart(); signOut({ callbackUrl: "/" }); }}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-red-500 mt-1 border-t border-gray-100"
                            >
                              <LogOut className="h-4 w-4" /> Sign Out
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href="/auth/login" className="rounded-lg px-3 py-2 hover:bg-green-500 rounded-xl hover:text-white">
                                Sign In
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/auth/register" className="rounded-lg px-3 py-2 hover:bg-green-500 rounded-xl hover:text-white">
                                Register
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {/* MOBILE TOGGLE — always visible regardless of admin/user */}
                <button
                  type="button"
                  className="rounded-full p-2 lg:hidden"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

              </div>

            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAV — rendered outside header so it can be full-screen */}
      <MobileNav
  open={mobileMenuOpen}
  onClose={() => setMobileMenuOpen(false)}
  navCategories={navCategories}
  concerns={menuConcerns}
/>
    </>
  );
}