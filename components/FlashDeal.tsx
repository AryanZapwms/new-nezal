"use client"

import { useState, useEffect, useCallback } from "react"
import { Zap } from "lucide-react"
import ProductCard from "@/components/product-card"
import { useRouter } from "next/navigation"

interface FlashSaleProduct {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { _id: string; name: string; slug: string }
}

interface FlashSale {
  _id: string
  name: string
  discountPercent: number
  endsAt: string
  startsAt: string
  products: FlashSaleProduct[]
}

// ---- Palette (single source of truth) ----
// Card: warm neutral, not a loud hue, so the red accent has room to read as "urgent"
const CARD_BG = "#FFF8F3"
const CARD_BORDER = "#F0DFCF"
const INK = "#241C16" // near-black warm ink, replaces the stray dark-green text color
const INK_MUTED = "#8A7A6D"
// One accent does all the "urgency" work — timer, live badge, discount pills, CTA
const ACCENT = "#E4432B"
const ACCENT_DARK = "#C23520"
const ACCENT_SOFT_BG = "#FCE7E2"

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now()
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true }
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1_000)
    return { hours: h, minutes: m, seconds: s, expired: false }
  }, [endsAt])

  const [time, setTime] = useState(calc)

  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [calc])

  return time
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-12 md:w-20 md:h-14 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black tabular-nums"
        style={{ backgroundColor: ACCENT, color: "#fff" }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-xs font-semibold mt-1 uppercase tracking-widest" style={{ color: INK_MUTED }}>
        {label}
      </span>
    </div>
  )
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const { hours, minutes, seconds, expired } = useCountdown(endsAt)
  if (expired) return <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Sale has ended</p>
  return (
    <div className="flex items-end gap-2">
      <TimeBlock value={hours} label="hrs" />
      <span className="text-2xl font-black mb-3" style={{ color: INK }}>:</span>
      <TimeBlock value={minutes} label="min" />
      <span className="text-2xl font-black mb-3" style={{ color: INK }}>:</span>
      <TimeBlock value={seconds} label="sec" />
    </div>
  )
}

export default function FlashDeal({ sale }: { sale: FlashSale }) {
  const router = useRouter()

  // Apply discount to product prices
  const products = sale.products.map((p) => ({
    ...p,
    discountPrice: Math.round(p.price - (p.price * sale.discountPercent) / 100),
  }))

  return (
    <section className="py-12 md:py-16" style={{ backgroundColor: "#FAFAF8" }}>
      <div
        className="container-nezal py-8 px-7 rounded-xl border shadow-sm hover:shadow-lg transition-shadow duration-300"
        style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div className="flex flex-col gap-2">
            {/* Live badge */}
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: ACCENT }}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live Now
              </span>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: ACCENT_SOFT_BG, color: ACCENT_DARK }}
              >
                {sale.discountPercent}% OFF
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Zap className="w-7 h-7 fill-current" style={{ color: ACCENT }} />
              <div>
                <h2 className="text-[28px] md:text-[32px] font-black leading-tight" style={{ color: INK }}>
                  {sale.name}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: INK_MUTED }}>
                  {products.length} product{products.length !== 1 ? "s" : ""} on sale — grab them before time runs out!
                </p>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: INK_MUTED }}>
              Sale ends in
            </p>
            <CountdownTimer endsAt={sale.endsAt} />
          </div>
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <div key={product._id} className="relative">
              {/* Discount badge */}
              <div
                className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                -{sale.discountPercent}%
              </div>
              <ProductCard
                id={product._id}
                name={product.name}
                price={product.price}
                discountPrice={product.discountPrice}
                image={product.image}
                company={product.company}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => router.push("/shop")}
            className="group inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 font-semibold text-sm transition-all duration-200"
            style={{ borderColor: ACCENT, color: ACCENT }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = ACCENT
              e.currentTarget.style.color = "#fff"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = ACCENT
            }}
          >
            Shop All Products
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}