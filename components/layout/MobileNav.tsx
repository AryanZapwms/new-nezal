/* ─── Mobile Nav ────────────────────────────────────────────────────────────
 *
 *  Drop-in replacement for the MobileNav function inside Header.tsx
 *  Replaces lines 241–347 in the original file.
 *
 *  Features:
 *  - Smooth slide-in from left with backdrop
 *  - Concern pills — horizontal scroll with peek UX
 *  - Category accordion with horizontal-scroll collection cards
 *  - "View all [Category]" link per accordion
 *  - Sticky brochure CTA at bottom
 *  - Body scroll lock when open
 * ────────────────────────────────────────────────────────────────────────── */

"use client";

import Link from "next/link";
import Image from "next/image";
import { X, ChevronDown, Download, Leaf, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

/* ── reuse the same constants from Header.tsx ── */
// const NAV_CATEGORIES = [
//   {
//     heading: "Soap",
//     key: "soaps",
//     collections: [
//       { label: "Rock Soap",     slug: "rock-soap",     tagline: "Ancient mineral-rich rocks meet Ayurvedic botanicals" },
//       { label: "Designer Soap", slug: "designer-soap", tagline: "Aesthetic skincare with functional benefits"           },
//       { label: "Round Soap",    slug: "round-soap",    tagline: "Gentle care for everyday skin"                        },
//       { label: "Aissis Soap",   slug: "aissis-soap",   tagline: "Advanced skincare solutions in every bar"             },
//       { label: "Premium Soap",  slug: "premium-soap",  tagline: "Luxury bathing reimagined with active botanicals"     },
//       { label: "Doobie Soap",   slug: "doobie-soap",   tagline: "Pure natural cleansing for everyday skin"             },
//     ],
//   },
//   {
//     heading: "Body Care",
//     key: "body-care",
//     collections: [
//       { label: "Body Lotion",   slug: "body-lotion",   tagline: "All-day hydration, nature's way"           },
//       { label: "Aloe Vera Gel", slug: "aloe-vera-gel", tagline: "Pure soothing hydration for skin and hair" },
//       { label: "Hand Wash",     slug: "hand-wash",     tagline: "Clean, protect and care for your hands"    },
//       { label: "Intimate Wash", slug: "intimate-wash", tagline: "Gentle care and daily freshness"           },
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
//     heading: "Massage Oil",
//     key: "massage-oil",
//     collections: [
//       { label: "Body Massage Oil", slug: "body-massage-oil", tagline: "Relaxation and skin nourishment in every drop" },
//     ],
//   },
//   {
//     heading: "Nezal's Rituals",
//     key: "rituals",
//     viewAllHref: "/rituals",
//     collections: [],
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
//   { label: "Acne",         slug: "acne"         },
//   { label: "Pigmentation", slug: "pigmentation" },
//   { label: "Open Pores",   slug: "open-pores"   },
//   { label: "Hydration",    slug: "hydration"    },
//   { label: "Hair Fall",    slug: "hairfall"     },
//   { label: "Dryness",      slug: "dryness"      },
// ];


const INGREDIENTS = [
  { label: "Aloe Vera",       slug: "aloe-vera"       },
  { label: "Neem",            slug: "neem"            },
  { label: "Turmeric",        slug: "turmeric"        },
  { label: "Tea Tree",        slug: "tea-tree"        },
  { label: "Vitamin C",       slug: "vitamin-c"       },
  { label: "Hyaluronic Acid", slug: "hyaluronic-acid" },
  { label: "Niacinamide",     slug: "niacinamide"     },
  { label: "Bhringraj",       slug: "bhringraj"       },
  { label: "Tulsi",           slug: "tulsi"           },
  { label: "Shea Butter",     slug: "shea-butter"     },
  { label: "Salicylic Acid",  slug: "salicylic-acid"  },
  { label: "Rose",            slug: "rose"            },
]

const NAV_LINKS = [
  { label: "Home",     href: "/"          },
  { label: "About Us", href: "/about-us"  },
  { label: "Blogs",    href: "/blog"      },
  { label: "Contact",  href: "/contact-us"},
];

/* ── Collection mini-card (horizontal scroll) ── */
function MobileCollectionCard({
  label, slug, tagline, onClick, href,
}: {
  label: string; slug: string; tagline?: string; onClick: () => void; href?: string;
}) {
  return (
    <Link
      href={href ?? `/collections/${slug}`}
      onClick={onClick}
      className="flex-shrink-0 w-36 flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-bg-cream)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/40 transition-colors"
    >
      {/* Icon placeholder */}
      <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center">
        <Leaf size={14} className="text-[var(--color-brand-primary)]" />
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--color-text-heading)] leading-tight">{label}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-snug mt-0.5 line-clamp-2">{tagline}</p>
      </div>
    </Link>
  );
}

/* ── MobileNav ── */
export function MobileNav({
  open, onClose, navCategories, concerns,
}: {
  open: boolean;
  onClose: () => void;
  navCategories: {
    heading: string;
    key: string;
    collections: { label: string; slug: string; tagline?: string; href?: string }[];
    viewAllHref?: string;
  }[];
  concerns: { label: string; slug: string }[];
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"concerns" | "ingredients">("concerns")

  // Animate in/out
  useEffect(() => {
    if (open) {
      // tiny delay so the CSS transition fires
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 z-50 h-full w-[85vw] max-w-sm bg-white flex flex-col lg:hidden shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(-100%)" }}
      >

        {/* ── Header row ── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-[var(--color-brand-primary)]" />
            <span className="font-bold text-[var(--color-text-heading)] text-sm">Nezal Herbocare</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-bg-cream)] transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

         {/* Concerns + Ingredients tabbed section */}
<div className="px-5 pt-4 pb-3 bg-[var(--color-bg-cream)] border-b" style={{ borderColor: "var(--color-border)" }}>
  
  {/* Tab switcher */}
  <div className="flex gap-1 mb-3 bg-white rounded-xl p-1 border" style={{ borderColor: "var(--color-border)" }}>
    <button
      onClick={() => setActiveTab("concerns")}
      className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-colors ${
        activeTab === "concerns"
          ? "bg-[var(--color-brand-primary)] text-white"
          : "text-[var(--color-text-muted)]"
      }`}
    >
      By Concern
    </button>
    <button
      onClick={() => setActiveTab("ingredients")}
      className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-colors ${
        activeTab === "ingredients"
          ? "bg-[var(--color-brand-primary)] text-white"
          : "text-[var(--color-text-muted)]"
      }`}
    >
      By Ingredient
    </button>
  </div>

  {/* Pills */}
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
    {activeTab === "concerns"
      ? concerns.map((item) => ( 
          <Link
            key={item.slug}
            href={`/concerns/${item.slug}`}
            onClick={onClose}
            className="flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/30 bg-white hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] transition-colors"
          >
            {item.label}
          </Link>
        ))
      : INGREDIENTS.map((item) => (
          <Link
            key={item.slug}
            href={`/ingredients/${item.slug}`}
            onClick={onClose}
            className="flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/30 bg-white hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] transition-colors"
          >
            {item.label}
          </Link>
        ))
    }
  </div>
</div>

          <div className="px-4 py-3 flex flex-col gap-0.5">

            {/* Regular nav links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-heading)] hover:bg-[var(--color-bg-cream)] transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t" style={{ borderColor: "var(--color-border)" }} />

            {/* Shop All shortcut */}
            <Link
              href="/shop"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold bg-[#0fa334] text-[#fff] hover:bg-[#084f09] transition-colors"
            >
              Shop All Products
              <ChevronRight size={15} />
            </Link>

            <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />

            {/* Category accordions */}
            {navCategories.map((cat) => (
              <div key={cat.key}>
                <button
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-bg-cream)] transition-colors"
                  onClick={() =>
                    setExpandedCategory(expandedCategory === cat.key ? null : cat.key)
                  }
                >
                  {cat.heading}
                  <ChevronDown
                    size={15}
                    className={`text-[var(--color-text-muted)] transition-transform duration-200 ${
                      expandedCategory === cat.key ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedCategory === cat.key && (
                  <div className="pb-2">
                    {cat.collections.length > 0 ? (
                      /* Horizontal scroll collection cards — 2.2 visible = peek UX */
                      <div className="flex gap-3 overflow-x-auto pl-3 pr-1 pb-1 scrollbar-hide">
                        {cat.collections.map((col) => (
                          <MobileCollectionCard
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
                      <p className="px-3 text-xs text-[var(--color-text-muted)]">
                        Curated, step-by-step routines designed around how you want to feel.
                      </p>
                    )}

                    {/* View all link */}
                    <Link
                      href={(cat as any).viewAllHref ?? `/collections?category=${cat.key}`}
                      onClick={onClose}
                      className="flex items-center gap-1 ml-3 mt-2 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                    >
                      View all {cat.heading} <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* ── Sticky bottom — Brochure CTA ── */}
        <div
          className="shrink-0 px-5 py-4 border-t bg-[var(--color-bg-cream)]"
          style={{ borderColor: "var(--color-border)" }}
        >
          <a
            href="/nezal-brochure.pdf"
            download="Nezal-Product-Brochure.pdf"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-[var(--color-brand-primary)]/30 bg-white text-sm font-bold text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] transition-all"
          >
            <Download size={15} />
            Download Product Brochure
          </a>
        </div>

      </div>
    </>
  );
}