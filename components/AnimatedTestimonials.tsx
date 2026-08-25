"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Star } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────
interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  rating: number
  quote: string
  product: string
}

// ─── Data — replace avatars with real customer photos ────────
const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Priya Sharma",
    role: "Verified Buyer",
    avatar: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200",
    rating: 5,
    quote: "The Neem Tulsi Face Wash has completely transformed my skin. My acne has reduced so much in just 3 weeks. I'll never go back to chemical-laden products again!",
    product: "Neem Tulsi Face Wash",
  },
  {
    id: "2",
    name: "Ananya Patel",
    role: "Verified Buyer",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
    rating: 5,
    quote: "I was skeptical about herbal hair serums but Nezal's Bhringraj Serum proved me wrong. My hair fall has reduced drastically and I can see new growth already!",
    product: "Bhringraj Hair Serum",
  },
  {
    id: "3",
    name: "Meera Iyer",
    role: "Verified Buyer",
    avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200",
    rating: 5,
    quote: "The Rose Bath Salt is pure luxury. After a long day, soaking in it feels like a spa experience at home. My skin feels incredibly soft afterward.",
    product: "Rose Bath Salt",
  },
  {
    id: "4",
    name: "Kavya Reddy",
    role: "Verified Buyer",
    avatar: "https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=200",
    rating: 5,
    quote: "Gifted the Comfort Neo Kit to my mom and she absolutely loved it. The packaging is beautiful and the products are genuinely effective. Will order again!",
    product: "Gift Kit",
  },
  {
    id: "5",
    name: "Sneha Nair",
    role: "Verified Buyer",
    avatar: "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
    rating: 5,
    quote: "Almond Nourishing Cream is exactly what my dry skin needed. It absorbs quickly, doesn't feel greasy, and my skin glows all day. Absolutely love it.",
    product: "Almond Nourishing Cream",
  },
]

// ─── Star Rating ─────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "fill-[#F5C842] text-[#F5C842]" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  )
}

// ─── Stacked Avatars ─────────────────────────────────────────
function StackedAvatars({
  testimonials,
  activeIndex,
  onSelect,
}: {
  testimonials: Testimonial[]
  activeIndex: number
  onSelect: (i: number) => void
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-0" style={{ height: 300}}>
      {testimonials.map((t, i) => {
        const offset = i - activeIndex
        const isActive = i === activeIndex
        const absOffset = Math.abs(offset)

        // Only show active + 2 on each side
        if (absOffset > 2) return null

        const translateY = offset * 60
        const scale = isActive ? 1 : 1 - absOffset * 0.12
        const opacity = isActive ? 1 : 1 - absOffset * 0.3
        const zIndex = 10 - absOffset

        return (
         <button
  key={t.id}
  onClick={() => onSelect(i)}
  className="absolute rounded-full overflow-hidden border-2 transition-all duration-500 ease-in-out focus:outline-none flex items-center justify-center"
  style={{
    width: isActive ? 80 : 64,
    height: isActive ? 80 : 64,
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    zIndex,
    borderColor: isActive ? "var(--color-brand-primary)" : "white",
    boxShadow: isActive
      ? "0 0 0 4px rgba(42,122,91,0.2), 0 8px 24px rgba(0,0,0,0.12)"
      : "0 2px 8px rgba(0,0,0,0.08)",
    backgroundColor: "#e8f5e8",
  }}
>
  {t.avatar && !t.avatar.includes("placeholder") ? (
    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
  ) : (
    <span
      className="font-bold select-none"
      style={{
        fontSize: isActive ? 28 : 22,
        color: "var(--color-brand-primary)",
      }}
    >
      {t.name.charAt(0).toUpperCase()}
    </span>
  )}
</button>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export function AnimatedTestimonials({
  testimonials = TESTIMONIALS,
}: {
  testimonials?: Testimonial[]
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<"up" | "down">("up")

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === activeIndex) return
      setDirection(index > activeIndex ? "up" : "down")
      setAnimating(true)
      setTimeout(() => {
        setActiveIndex(index)
        setAnimating(false)
      }, 300)
    },
    [activeIndex, animating]
  )

  const next = useCallback(() => {
    goTo((activeIndex + 1) % testimonials.length)
  }, [activeIndex, goTo, testimonials.length])

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  const active = testimonials[activeIndex]

  return (
    <section className="py-8 md:py-8 bg-white">
      <div className="container-nezal">
        {/* Section label */}
        <div className="text-center mb-5 md:mb-12">

          <h2 className="mt-2 text-xl md:text-[32px] font-bold text-[var(--color-text-heading)]">
            What Our Customers Say
          </h2>
        </div>

        {/* Main testimonial card */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-16 bg-[#FAFAF8] rounded-2xl md:rounded-3xl p-4 md:p-12 border border-[var(--color-border)]">

            {/* Left — avatar */}
            <div className="flex-shrink-0 flex flex-row md:flex-col items-center gap-3 md:gap-5">
              {/* Mobile: single compact avatar, no orbit animation */}
              <div
                className="md:hidden w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: "var(--color-brand-primary)", backgroundColor: "#e8f5e8" }}
              >
                {active.avatar && !active.avatar.includes("placeholder") ? (
                  <img src={active.avatar} alt={active.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm" style={{ color: "var(--color-brand-primary)" }}>
                    {active.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Desktop: full orbiting stack */}
              <div className="hidden md:block">
                <StackedAvatars
                  testimonials={testimonials}
                  activeIndex={activeIndex}
                  onSelect={goTo}
                />
              </div>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5 md:gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === activeIndex ? 20 : 6,
                      height: 6,
                      background:
                        i === activeIndex
                          ? "var(--color-brand-primary)"
                          : "var(--color-border)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right — quote content */}
            <div className="flex-1 flex flex-col gap-2 md:gap-5">
              {/* Large quote mark */}
              <span
                className="hidden md:block text-7xl font-serif leading-none select-none"
                style={{ color: "var(--color-brand-primary)", opacity: 0.15, lineHeight: 0.8 }}
              >
                "
              </span>

              {/* Quote text with fade animation */}
              <div
                className="transition-all duration-300"
                style={{
                  opacity: animating ? 0 : 1,
                  transform: animating
                    ? `translateY(${direction === "up" ? "-12px" : "12px"})`
                    : "translateY(0)",
                }}
              >
                <p className="text-sm md:text-xl font-medium text-[var(--color-text-heading)] leading-snug md:leading-relaxed line-clamp-3 md:line-clamp-none">
                  {active.quote}
                </p>
              </div>

              {/* Divider */}
              <div
                className="hidden md:block h-px w-12"
                style={{ background: "var(--color-brand-primary)" }}
              />

              {/* Name + rating */}
              <div
                className="transition-all duration-300 delay-75"
                style={{
                  opacity: animating ? 0 : 1,
                  transform: animating ? "translateY(8px)" : "translateY(0)",
                }}
              >
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-sm md:text-base text-[var(--color-text-heading)]">
                      {active.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {active.role} · {active.product}
                    </p>
                  </div>
                  <StarRating rating={active.rating} />
                </div>
              </div>

              {/* Prev / Next arrows */}
              <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                <button
                  onClick={() =>
                    goTo((activeIndex - 1 + testimonials.length) % testimonials.length)
                  }
                  className="w-7 h-7 md:w-9 md:h-9 rounded-full border flex items-center justify-center text-white border-[#056b1b] bg-[#055f0f] hover:bg-[#1bd40a] transition-colors text-sm"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  ←
                </button>
                <button
                  onClick={next}
                  className="w-7 h-7 md:w-9 md:h-9 rounded-full border flex items-center justify-center text-white border-[#056b1b] bg-[#055f0f] hover:bg-[#1bd40a] transition-colors text-sm"

                >
                  →
                </button>
                <span className="text-xs text-[var(--color-text-muted)] ml-1">
                  {activeIndex + 1} / {testimonials.length}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}