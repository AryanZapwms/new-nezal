"use client"

import * as React from "react"
import { Star } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Testimonial = {
  name: string
  quote: string
  image?: string
  profession?: string
  rating?: number
}

type TestimonialsProps = {
  companySlug?: string
  items?: Testimonial[]
  /** kept for API compatibility – ignored; always renders static 3-card layout */
  variant?: "light" | "dark"
  useScrollAnimation?: boolean
}

// ─── Static data ─────────────────────────────────────────────────────────────

const testimonialsByCompany: Record<string, Testimonial[]> = {
  nezal: [
    {
      name: "Kajal",
      profession: "Mumbai",
      rating: 4,
      image: undefined,
      quote:
        "Lumiflora's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      name: "Bhumika",
      profession: "Pune",
      rating: 3,
      image: undefined,
      quote:
        "Lumiflora's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      name: "Rajani",
      profession: "Delhi",
      rating: 4,
      image: undefined,
      quote:
        "Nezal's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
  ],
  dermaflay: [
    {
      name: "Ritika Shah",
      profession: "Mumbai",
      rating: 5,
      quote:
        "Dermaflay Blue Moisturizer is pure magic! It keeps my skin hydrated all day without feeling greasy. My dull, tired skin now looks soft and radiant.",
    },
    {
      name: "Amit Verma",
      profession: "Delhi",
      rating: 5,
      quote:
        "This Pro-Ac moisturizer absorbs so fast! Its lightweight yet super nourishing. My skin feels calm and looks fresh even after a long day.",
    },
    {
      name: "Neha Bansal",
      profession: "Pune",
      rating: 4.5,
      quote:
        "I have tried dozens of moisturizers, but Dermaflay Evantone moisturizer stands out. It actually repairs and smoothens my skin texture.",
    },
  ],
  default: [
    {
      name: "Kajal",
      profession: "Mumbai",
      rating: 4,
      quote:
        "Lumiflora's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      name: "Bhumika",
      profession: "Pune",
      rating: 3,
      quote:
        "Lumiflora's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      name: "Rajani",
      profession: "Delhi",
      rating: 4,
      quote:
        "Nezal's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
  ],
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function ReviewStars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating)
        const half = !filled && i < rating
        return (
          <Star
            key={i}
            className="w-3.5 h-3.5"
            fill={filled ? "#F5C842" : half ? "#F5C842" : "#D1D5DB"}
            stroke={filled || half ? "#F5C842" : "#D1D5DB"}
            opacity={half ? 0.6 : 1}
          />
        )
      })}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, image, size = "md" }: { name: string; image?: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "w-14 h-14 text-lg",
    md: "w-16 h-16 text-xl",
    lg: "w-20 h-20 text-2xl",
  }

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover border-2 border-white shadow-md`}
      />
    )
  }

  // Deterministic colour from name
  const colours = [
    "bg-[#1B6B2F]",
    "bg-amber-600",
    "bg-rose-500",
    "bg-sky-600",
    "bg-violet-600",
    "bg-teal-600",
  ]
  const colour = colours[name.charCodeAt(0) % colours.length]

  return (
    <div
      className={`${sizeMap[size]} ${colour} rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Verify Badge ─────────────────────────────────────────────────────────────

function VerifyBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B6B2F]">
      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verify users
    </span>
  )
}

// ─── Side Card (smaller, no green border) ────────────────────────────────────

function SideCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E0D8CC] p-5 flex flex-col items-center text-center gap-3 shadow-sm h-full">
      <Avatar name={testimonial.name} image={testimonial.image} size="sm" />

      <div>
        <p className="font-semibold text-[#1A1A1A] text-sm">{testimonial.name}</p>
        {testimonial.profession && (
          <p className="text-xs text-[#888888]">{testimonial.profession}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <ReviewStars rating={testimonial.rating ?? 5} />
        <VerifyBadge />
      </div>

      <p className="text-xs text-[#444444] leading-relaxed line-clamp-5">
        {testimonial.quote}
      </p>
    </div>
  )
}

// ─── Center Card (larger, green border) ──────────────────────────────────────

function CenterCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className="bg-white rounded-2xl border-2 p-7 flex flex-col items-center text-center gap-4 shadow-lg"
      style={{ borderColor: "#1B6B2F" }}
    >
      <Avatar name={testimonial.name} image={testimonial.image} size="lg" />

      <div>
        <p className="font-bold text-[#1A1A1A] text-base">{testimonial.name}</p>
        {testimonial.profession && (
          <p className="text-xs text-[#888888]">{testimonial.profession}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <ReviewStars rating={testimonial.rating ?? 5} />
        <VerifyBadge />
      </div>

      <p className="text-sm text-[#444444] leading-relaxed">
        {testimonial.quote}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Testimonials({
  companySlug,
  items,
}: TestimonialsProps) {
  const testimonials: Testimonial[] = React.useMemo(() => {
    if (items && items.length > 0) return items
    if (companySlug) {
      const match = testimonialsByCompany[companySlug.toLowerCase()]
      if (match && match.length > 0) return match
    }
    return testimonialsByCompany.default
  }, [companySlug, items])

  // We always show exactly 3 cards; if fewer provided, pad with defaults
  const padded = React.useMemo(() => {
    const base = [...testimonials]
    while (base.length < 3) base.push(testimonialsByCompany.default[base.length] ?? testimonialsByCompany.default[0])
    return base.slice(0, 3)
  }, [testimonials])

  const [left, center, right] = padded

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-14 px-4"
      style={{ backgroundColor: "#F5F0E8" }}
    >
      <div className="container-nezal mx-auto">
        {/* Title */}
        <h2
          id="testimonials-heading"
          className="text-center text-3xl md:text-4xl font-bold mb-10"
          style={{ color: "#1B6B2F", fontFamily: "'Courier New', monospace", letterSpacing: "0.02em" }}
        >
          Our customers
        </h2>

        {/* 3-column card grid — centre card is larger (scale + taller) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center max-w-4xl mx-auto">
          {/* Left — slightly smaller */}
          <div className="md:scale-95 md:origin-center">
            <SideCard testimonial={left} />
          </div>

          {/* Centre — featured, green border, larger */}
          <div className="md:scale-105 md:origin-center md:-mx-1 z-10">
            <CenterCard testimonial={center} />
          </div>

          {/* Right — slightly smaller */}
          <div className="md:scale-95 md:origin-center">
            <SideCard testimonial={right} />
          </div>
        </div>
      </div>
    </section>
  )
}