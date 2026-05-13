// components/promo-bar.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"

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

export function PromoBar() {
  const [promo, setPromo] = useState<Promo | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const res = await fetch("/api/promos?active=true")
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            setPromo(data[0])
          }
        }
      } catch (error) {
        console.error("Error fetching promo:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPromo()
  }, [])

  if (isLoading || !promo || !isVisible) return null

  // Use brand primary green as fallback if no bg color set in DB
  const bg = promo.backgroundColor || "var(--color-brand-primary)"
  const fg = promo.textColor || "#ffffff"

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{
        backgroundColor: bg,
        color: fg,
        minHeight: 36,
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      {/* Centered text */}
      <p className="text-center text-[13px] text-white font-medium tracking-wide px-10">
        {promo.title && (
          <span className="font-semibold">{promo.title}</span>
        )}
        {promo.title && promo.message && " — "}
        {promo.message && <span>{promo.message}</span>}
        {promo.link && promo.linkText && (
          <>
            {" "}
            <Link
              href={promo.link}
              className="underline underline-offset-2 hover:no-underline font-semibold"
              style={{ color: fg }}
            >
              {promo.linkText}
            </Link>
          </>
        )}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => setIsVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-white/20"
        style={{ color: fg }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}