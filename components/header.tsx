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

async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch("/api/companies", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch companies");
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}

function requestIdle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 1);
  }
}

/* ─── Mega Menu Data ────────────────────────────────────── */

const NAV_CATEGORIES = [
  {
    heading: "Face Care",
    key: "face-care",
    collections: [
      { label: "Foaming Face Wash", slug: "foaming-face-wash", tagline: "Deep cleanse without stripping your skin" },
      { label: "Face Serum",        slug: "face-serum",        tagline: "Targeted actives for every skin story"   },
    ],
  },
  {
    heading: "Body Care",
    key: "body-care",
    sections: [
      {
        label: "Soaps",
        collections: [
          { label: "Rock Soap",     slug: "rock-soap",     tagline: "Ancient mineral-rich rocks meet Ayurvedic botanicals" },
          { label: "Designer Soap", slug: "designer-soap", tagline: "Aesthetic skincare with functional benefits"           },
          { label: "Round Soap",    slug: "round-soap",    tagline: "Gentle care for everyday skin"                        },
          { label: "Aissis Soap",   slug: "aissis-soap",   tagline: "Advanced skincare solutions in every bar"             },
          { label: "Premium Soap",  slug: "premium-soap",  tagline: "Luxury bathing reimagined with active botanicals"     },
          { label: "Doobie Soap",   slug: "doobie-soap",   tagline: "Pure natural cleansing for everyday skin"             },
        ],
      },
      {
        label: "Body Care",
        collections: [
          { label: "Body Lotion",      slug: "body-lotion",      tagline: "All-day hydration, nature's way"                },
          { label: "Aloe Vera Gel",    slug: "aloe-vera-gel",    tagline: "Pure soothing hydration for skin and hair"      },
          { label: "Body Massage Oil", slug: "body-massage-oil", tagline: "Relaxation and skin nourishment in every drop"  },
          { label: "Shower Gel",       slug: "shower-gel",       tagline: "Your daily cleanse, elevated"                   },
          { label: "Bath Salt",        slug: "bath-salt",        tagline: "Turn your bath into a ritual"                   },
          { label: "Hand Wash",        slug: "hand-wash",        tagline: "Clean, protect and care for your hands"         },
          { label: "Intimate Wash",    slug: "intimate-wash",    tagline: "Gentle care and daily freshness"                },
        ],
      },
    ],
  },
  {
    heading: "Hair Care",
    key: "hair-care",
    collections: [
      { label: "Shampoo",     slug: "shampoo",     tagline: "Cleanse your scalp, nourish your roots"    },
      { label: "Conditioner", slug: "conditioner", tagline: "Frizz-free, silky, nourished hair"         },
      { label: "Hair Serum",  slug: "hair-serum",  tagline: "From root to tip — strength and growth"    },
    ],
  },
  {
    heading: "Gift Kits",
    key: "gift-kits",
    collections: [
      { label: "Gift Kits", slug: "gift-kits", tagline: "Curated care for the people you love" },
    ],
  },
];

function getFlatCollections(cat: typeof NAV_CATEGORIES[number]) {
  if ("sections" in cat && cat.sections) {
    return cat.sections.flatMap((s) => s.collections);
  }
  return (cat as any).collections ?? [];
}

const CONCERNS = [
  { label: "Acne",          slug: "acne"           },
  { label: "Pigmentation",  slug: "pigmentation"   },
  { label: "Open Pores",    slug: "open-pores"     },
  { label: "Hydration",     slug: "hydration"      },
  { label: "Hair Fall",     slug: "hairfall"       },
  { label: "Dryness",       slug: "dryness"        },
];

/* ─── Collection Card (inside mega menu) ────────────────── */

function CollectionCard({
  label, slug, tagline, onClick,
}: {
  label: string; slug: string; tagline: string; onClick: () => void;
}) {
  return (
    <Link
      href={`/collections/${slug}`}
      onClick={onClick}
      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-cream)] transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-brand-primary)]/20 transition-colors">
        <Leaf size={16} className="text-[var(--color-brand-primary)]" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold text-[var(--color-text-heading)] group-hover:text-[var(--color-brand-primary)] transition-colors">
          {label}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] leading-snug line-clamp-2">
          {tagline}
        </span>
      </div>
    </Link>
  );
}

/* ─── Desktop Mega Menu ─────────────────────────────────── */

function MegaMenu({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(NAV_CATEGORIES[0]);

  const isBodyCare = "sections" in activeCategory && activeCategory.sections;

  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 overflow-hidden rounded-2xl border bg-white shadow-2xl"
      style={{ borderColor: "var(--color-border)", width: isBodyCare ? "920px" : "820px" }}
    >
      <div className={`grid ${isBodyCare ? "grid-cols-[180px_1fr_180px]" : "grid-cols-[180px_1fr_180px]"}`}>

        {/* Zone 1 — Category list */}
        <div className="border-r bg-[var(--color-bg-cream)] p-4 flex flex-col gap-1" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-3 mb-2">
            Categories
          </p>
          {NAV_CATEGORIES.map((cat) => (
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
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-white transition-colors"
            >
              Shop All →
            </Link>
          </div>
        </div>

        {/* Zone 2 — Collection cards */}
        <div className="p-5 overflow-y-auto max-h-[480px]">
          {isBodyCare ? (
            <div className="flex flex-col gap-6">
              {(activeCategory as any).sections.map((section: { label: string; collections: { label: string; slug: string; tagline: string }[] }) => (
                <div key={section.label}>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {section.collections.map((col) => (
                      <CollectionCard
                        key={col.slug}
                        label={col.label}
                        slug={col.slug}
                        tagline={col.tagline}
                        onClick={onClose}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                {activeCategory.heading} Collections
              </p>
              <div className="grid grid-cols-2 gap-1">
                {getFlatCollections(activeCategory).map((col) => (
                  <CollectionCard
                    key={col.slug}
                    label={col.label}
                    slug={col.slug}
                    tagline={col.tagline}
                    onClick={onClose}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <Link
              href={`/collections?category=${activeCategory.key}`}
              onClick={onClose}
              className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              View all {activeCategory.heading} →
            </Link>
          </div>
        </div>

        {/* Zone 3 — Shop by Concern */}
        <div className="border-l p-4 bg-[var(--color-bg-cream)]" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-3">
            By Concern
          </p>
          <div className="flex flex-col gap-1">
            {CONCERNS.map((concern) => (
              <Link
                key={concern.slug}
                href={`/concerns/${concern.slug}`}
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-sm text-[var(--color-text-body)] hover:bg-white hover:text-[var(--color-brand-primary)] font-medium transition-colors"
              >
                {concern.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t mt-4" style={{ borderColor: "var(--color-border)" }}>
            <a
              href="/nezal-brochure.pdf"
              download="Nezal-Product-Brochure.pdf"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] hover:bg-white transition-colors"
            >
              ↓ Download Brochure
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setShopMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

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
    { label: "Blogs",    href: "/blog" },
    { label: "Contact",  href: "/contact-us" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="container-nezal">
            <div className="flex h-16 items-center gap-6">

              {/* LOGO */}
              <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${BRAND.name} home`}>
                <div className="relative h-10 w-10">
                  <Image src="/companylogo.png" alt={BRAND.name} fill className="object-contain" priority />
                </div>
              </Link>

              {/* DESKTOP NAV */}
              <nav className="hidden flex-1 items-center gap-1 lg:flex">

                {/* Home — first link */}
                <Link
                  href="/"
                  className={`rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
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
                    className={`flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                      pathname?.startsWith("/shop") || pathname?.startsWith("/collections")
                        ? "text-[var(--color-brand-primary)]"
                        : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                    }`}
                  >
                    Shop
                    <ChevronDown className={`h-4 w-4 transition-transform ${shopMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {shopMenuOpen && (
                    <MegaMenu onClose={() => setShopMenuOpen(false)} />
                  )}
                </div>

                {/* Remaining links — About Us, Blogs, Contact */}
                {navLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                      isActive(link.href)
                        ? "text-[var(--color-brand-primary)]"
                        : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

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
              

                            <Button className="bg-red-500 text-sm rounded-xl" onClick={() => signOut({ callbackUrl: "/" })}>
                              Sign out
                            </Button>
                </>
                ) : (
                  /* REGULAR USER — Search, Wishlist, Cart, Account */
                  <>
                    {/* SEARCH */}
                    <form
                      onSubmit={handleSearch}
                      className="hidden items-center gap-2 rounded-full border px-3 py-1.5 md:flex"
                      style={{ borderColor: "var(--color-border)", background: "#F5F5F5" }}
                    >
                      <Search className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </form>

                    {/* WISHLIST */}
                    <Link
                      href="/profile/wishlist"
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
                              onClick={() => signOut({ callbackUrl: "/" })}
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
      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}