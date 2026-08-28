// components/promo-bar.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, ArrowRight } from "lucide-react"

interface Promo {
  _id: string
  title: string
  message: string
  link?: string
  linkText?: string
  backgroundColor: string
  textColor: string
  isActive: boolean
  priority: number
}

const ROTATE_MS = 5000

export function PromoBar() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [index, setIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await fetch("/api/promos?active=true")
        if (res.ok) {
          const data: Promo[] = await res.json()
          const sorted = data
            .filter((p) => p.isActive)
            .sort((a, b) => b.priority - a.priority)
          setPromos(sorted)
        }
      } catch (error) {
        console.error("Error fetching promo:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPromos()
  }, [])

  useEffect(() => {
    if (promos.length <= 1) return
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % promos.length)
        setIsTransitioning(false)
      }, 250)
    }, ROTATE_MS)
    return () => clearInterval(interval)
  }, [promos.length])

  const promo = promos[index]

  if (isLoading || !promo || !isVisible) return null

  const bg = promo.backgroundColor || "var(--color-brand-primary)"
  const fg = promo.textColor || "#ffffff"
  const isInternal = promo.link?.startsWith("/")
  const hasMultiple = promos.length > 1

  return (
    <div
      className={`relative w-full flex flex-col items-center justify-center min-h-[36px] md:min-h-[50px] pt-1 md:pt-1.5 ${
        hasMultiple ? "pb-2 md:pb-2.5" : "pb-1 md:pb-1.5"
      }`}
      style={{ backgroundColor: bg, color: fg }}
    >
      <p
        className={`text-center text-[11px] md:text-[13px] font-medium tracking-wide px-11 md:px-10 transition-opacity duration-250 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
        style={{ color: fg }}
      >
        {promo.title && <span className="font-semibold">{promo.title}</span>}
        {promo.title && promo.message && " — "}
        {promo.message && <span>{promo.message}</span>}
        {promo.link && promo.linkText && (
  <>
    {" "}
    {isInternal ? (
      <Link
        href={promo.link}
        className="group ml-1.5 md:ml-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 md:px-3.5 md:py-1 text-[10px] md:text-xs font-bold no-underline shadow-sm transition-all duration-200 hover:gap-1.5 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 animate-[pulse_2s_ease-in-out_1]"
        style={{ color: bg }}
      >
        {promo.linkText}
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    ) : (
      <a
        href={promo.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group ml-1.5 md:ml-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 md:px-3.5 md:py-1 text-[10px] md:text-xs font-bold no-underline shadow-sm transition-all duration-200 hover:gap-1.5 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0"
        style={{ color: bg }}
      >
        {promo.linkText}
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </a>
    )}
  </>
)}
      </p>

      {/* Progress dots — only shown when cycling between multiple promos */}
      {hasMultiple && (
        <div className="absolute bottom-0.5 md:bottom-1 flex gap-1">
          {promos.map((_, i) => (
            <span
              key={i}
              className="h-0.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? "14px" : "5px",
                background: fg,
                opacity: i === index ? 0.9 : 0.35,
              }}
            />
          ))}
        </div>
      )}

      {/* Dismiss button — visible icon stays small, but the tappable area is
          44x44 on mobile (accessibility min touch target) even though the
          shorter bar can't fit that visually; it's fine for the invisible
          hit area to extend slightly past the bar's edge. */}
      <button
        onClick={() => setIsVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 md:w-6 md:h-6 rounded-full transition-colors hover:bg-white/20"
        style={{ color: fg }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}