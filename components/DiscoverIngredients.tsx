"use client"

import Link from "next/link"
import Image from "next/image"
import { Leaf } from "lucide-react"

const INGREDIENTS = [
  {
    label: "Aloe Vera",
    slug: "aloe-vera",
    tagline: "Universal soother for skin & hair",
    image: "/ingredients/aloe-vera.jpg",        // ← drop your image here
  },
  {
    label: "Neem",
    slug: "neem",
    tagline: "Ayurvedic antibacterial purifier",
    image: "/ingredients/neem.jpg",
  },
  {
    label: "Turmeric",
    slug: "turmeric",
    tagline: "Golden brightening & glow",
    image: "/ingredients/Turmeric.webp",
  },
  {
    label: "Tea Tree",
    slug: "tea-tree",
    tagline: "Pore-clearing acne control",
    image: "/ingredients/tea-tree.png",
  },
  {
    label: "Vitamin C",
    slug: "vitamin-c",
    tagline: "Radiance & antioxidant protection",
    image: "/ingredients/vitamin-c.webp",
  },
  {
    label: "Hyaluronic Acid",
    slug: "hyaluronic-acid",
    tagline: "Deep hydration specialist",
    image: "/ingredients/hyaluronic-acid.jpg",
  },
  {
    label: "Niacinamide",
    slug: "niacinamide",
    tagline: "Pore minimiser & skin brightener",
    image: "/ingredients/niacinamide.jpg",
  },
  {
    label: "Bhringraj",
    slug: "bhringraj",
    tagline: "Ayurvedic king of hair",
    image: "/ingredients/bringraj.webp",
  },
  {
    label: "Tulsi",
    slug: "tulsi",
    tagline: "Sacred herbal skin balancer",
    image: "/ingredients/tulsi.webp",
  },
  {
    label: "Shea Butter",
    slug: "shea-butter",
    tagline: "Deep nourishment & softness",
    image: "/ingredients/shea-butter.webp",
  },
  {
    label: "Salicylic Acid",
    slug: "salicylic-acid",
    tagline: "BHA for acne-prone skin",
    image: "/ingredients/Salicylic_Acid.webp",
  },
  {
    label: "Rose",
    slug: "rose",
    tagline: "Timeless floral hydration",
    image: "/ingredients/rose.webp",
  },
]

export function DiscoverIngredients() {
  return (
    <section className="py-14 md:py-8" style={{ backgroundColor: "#FAFAF8" }}>
      <div className="container-nezal">

        {/* Heading */}
        <div className="text-center mb-12">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
            style={{ backgroundColor: "#e8f5e8", color: "#1e6636" }}
          >
            <Leaf size={12} />
            Ingredient Library
          </span>
          <h2 className="text-[28px] md:text-[34px] font-bold mb-3" style={{ color: "#1e3a28" }}>
            Discover By Ingredients
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "#6b7c70" }}>
            Every Nezal product is powered by nature's finest botanicals and actives.
            Explore the ingredients behind your skincare — and find the products that contain them.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-5">
          {INGREDIENTS.map((ing) => (
            <Link
              key={ing.slug}
              href={`/ingredients/${ing.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-[#dde8de] bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ minHeight: "280px" }}
            >
              {/* Image */}
              <div className="relative w-full h-52 overflow-hidden bg-[#f0f7f0]">
                <Image
                  src={ing.image}
                  alt={ing.label}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // fallback to placeholder if image missing
                    (e.target as HTMLImageElement).src = "/placeholder.jpg"
                  }}
                />
                {/* subtle green overlay on hover */}
                <div className="absolute inset-0 bg-[#1e3a28]/0 group-hover:bg-[#1e3a28]/10 transition-colors duration-300" />
              </div>

              {/* Text */}
              <div className="p-4 flex flex-col gap-1">
                <p className="text-sm font-bold leading-tight" style={{ color: "#1e3a28" }}>
                  {ing.label}
                </p>
                <p className="text-xs leading-snug" style={{ color: "#6b7c70" }}>
                  {ing.tagline}
                </p>
                <span
                  className="text-xs font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: "#1e6636" }}
                >
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* View all */}
        <div className="mt-10 text-center">
          <Link
            href="/ingredients"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border transition-all hover:bg-[#1e6636] hover:text-white hover:border-[#1e6636]"
            
          >
            <Leaf size={14} />
            Browse All Ingredients
          </Link>
        </div>

      </div>
    </section>
  )
}