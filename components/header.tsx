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
  User,
  LogOut,
  ShoppingBag,
  ChevronDown,
  Search,
  Heart,
  Menu,
  X,
} from "lucide-react";

import { useEffect, useState, useRef, useMemo } from "react";

import {
  getCachedSync,
  fetchWithCache,
  initCache,
} from "@/lib/cacheClient";

import { BRAND } from "@/lib/config";

/* ─────────────────────────────────────── */

interface Company {
  _id: string;
  name: string;
  slug: string;
}

const COMPANIES_KEY = "companies:all";
const TTL = 1000 * 60 * 5;
const MAX_AGE = 1000 * 60 * 60 * 24;

async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch("/api/companies", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }

  const json = await res.json();

  return Array.isArray(json) ? json : (json?.data ?? []);
}

function requestIdle(cb: () => void) {
  if (
    typeof window !== "undefined" &&
    "requestIdleCallback" in window
  ) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 1);
  }
}

const MEGA_MENU_COLUMNS = [
  {
    heading: "Face Care",
    items: [
      { label: "Face Moisturizer", slug: "face-moisturizer" },
      { label: "Face Serum", slug: "face-serum" },
      { label: "Face Wash", slug: "face-wash" },
      { label: "Face Scrub", slug: "face-scrub" },
    ],
  },
  {
    heading: "Body Care",
    items: [
      { label: "Body Lotion", slug: "body-lotion" },
      { label: "Body Oil", slug: "body-oil" },
      { label: "Body Wash", slug: "body-wash" },
    ],
  },
  {
    heading: "Hair Care",
    items: [
      { label: "Shampoo", slug: "shampoo" },
      { label: "Conditioner", slug: "conditioner" },
      { label: "Hair Serum", slug: "hair-serum" },
    ],
  },
  {
    heading: "Gift Kits",
    items: [
      { label: "Essential Kit", slug: "essential-kit" },
      { label: "Comfort Kit", slug: "comfort-kit" },
    ],
  },
];

/* ─────────────────────────────────────── */

export  function Header() {
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

  const pathParts = useMemo(
    () => pathname?.split("/") || [],
    [pathname]
  );

  const companySlug = pathParts[2];

  useEffect(() => {
    initCache();

    const cached =
      getCachedSync<Company[]>(
        COMPANIES_KEY,
        MAX_AGE
      ) ?? [];

    if (cached.length > 0) {
      setCompanies(cached);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;

    let mounted = true;

    fetchWithCache(COMPANIES_KEY, fetchCompanies, {
      ttlMs: TTL,
      maxAgeMs: MAX_AGE,
      backgroundRefresh: true,
      persistToStorage: true,
    })
      .then((data) => {
        if (!mounted) return;

        setCompanies(data);

        requestIdle(() => {
          data.slice(0, 5).forEach((c) => {
            if (!prefetchedRef.current.has(c.slug)) {
              prefetchedRef.current.add(c.slug);

              try {
                router.prefetch(`/shop/${c.slug}`);
              } catch {}
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        shopMenuRef.current &&
        !shopMenuRef.current.contains(e.target as Node)
      ) {
        setShopMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );
    };
  }, []);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  function handleSearch(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    router.push(
      `/shop?search=${encodeURIComponent(query)}`
    );

    setSearchQuery("");
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about-us" },

    { label: "Blogs", href: "/blog" },
    { label: "Contact", href: "/contact-us" },
    ,
  ];

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname?.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div
        className="border-b"
        style={{
          borderColor: "var(--color-border)",
        }}
      >
        <div className="container-nezal">
          <div className="flex h-16 items-center gap-6">
            {/* LOGO */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2"
              aria-label={`${BRAND.name} home`}
            >
              <div className="relative h-10 w-10">
                <Image
                  src="/companylogo.png"
                  alt={BRAND.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden flex-1 items-center gap-1 lg:flex">
              {navLinks.map((link) => (
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

              {/* SHOP MENU */}
              <div
                className="relative"
                ref={shopMenuRef}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShopMenuOpen((v) => !v)
                  }
                  className={`flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                    pathname?.startsWith("/shop")
                      ? "text-[var(--color-brand-primary)]"
                      : "text-[var(--color-text-heading)] hover:text-[var(--color-brand-primary)]"
                  }`}
                >
                  Shop

                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      shopMenuOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {shopMenuOpen && (
                  <div
                    className="absolute left-1/2 top-full z-50 mt-2 w-[860px] -translate-x-1/2 overflow-hidden rounded-2xl border bg-white shadow-2xl"
                    style={{
                      borderColor:
                        "var(--color-border)",
                    }}
                  >
                    <div className="p-6">
                      <div className="grid grid-cols-4 gap-6">
                        {MEGA_MENU_COLUMNS.map(
                          (column) => (
                            <div
                              key={column.heading}
                            >
                              <p className="mb-3 text-sm font-bold text-[var(--color-text-heading)]">
                                {column.heading}
                              </p>

                              <ul className="space-y-2">
                                {column.items.map(
                                  (item) => (
                                    <li
                                      key={item.slug}
                                    >
                                      <Link
                                        href={`/shop?category=${item.slug}`}
                                        onClick={() =>
                                          setShopMenuOpen(
                                            false
                                          )
                                        }
                                        className="text-sm text-[var(--color-text-body)] transition-colors hover:text-[var(--color-brand-primary)]"
                                      >
                                        {
                                          item.label
                                        }
                                      </Link>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* RIGHT SIDE */}
            <div className="ml-auto flex items-center gap-2">
              {/* SEARCH */}
              <form
                onSubmit={handleSearch}
                className="hidden items-center gap-2 rounded-full border px-3 py-1.5 md:flex"
                style={{
                  borderColor:
                    "var(--color-border)",
                  background: "#F5F5F5",
                }}
              >
                <Search
                  className="h-4 w-4"
                  style={{
                    color:
                      "var(--color-text-muted)",
                  }}
                />

                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </form>

              {/* HEART */}
              <button
                type="button"
                className="rounded-full p-2 transition-colors hover:bg-[var(--color-bg-cream)]"
              >
                <Heart className="h-5 w-5" />
              </button>

              {/* CART */}
              <CartIcon />

              {/* ACCOUNT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-2 transition-colors hover:bg-[var(--color-bg-cream)]"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="mt-2 w-52 rounded-xl border-green-300 p-1 shadow-xl bg-white"
                >
                  {session?.user ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile/orders"
                          className="flex items-center gap-2 rounded-lg px-3 py-2"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Orders
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          signOut({
                            callbackUrl: "/",
                          })
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-red-500 "
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild >
                        <Link
                          href="/auth/login"
                          className="rounded-lg px-3 py-2 hover:bg-green-500 rounded-xl hover:text-white "
                        >
                          Sign In
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/auth/register"
                          className="rounded-lg px-3 py-2 hover:bg-green-500 rounded-xl  hover:text-white"
                        >
                          Register
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* MOBILE MENU */}
              <button
                type="button"
                className="rounded-full p-2 lg:hidden"
                onClick={() =>
                  setMobileMenuOpen((v) => !v)
                }
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV */}
      {mobileMenuOpen && (
        <div className="border-b bg-white lg:hidden">
          <div className="container-nezal space-y-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className="block rounded-lg px-4 py-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}