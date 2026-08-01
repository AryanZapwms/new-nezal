"use client"
// components/HomeClient.tsx
// Handles ONLY the interactive parts of the home page:
//   - Product grid "View All" button + floating WA/Amazon/scroll buttons
// Everything else is server-rendered.

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import ProductCard from "@/components/product-card"
import { BRAND } from "@/lib/config"

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image: string
  company: { _id: string; name: string; slug: string }
  // Present when the product is currently part of an active flash sale —
  // see lib/flashSale.ts. Passed through to ProductCard for the ribbon.
  flashSale?: { saleId: string; saleName: string; discountPercent: number; endsAt: string } | null
}

interface Company {
  _id: string
  name: string
  slug: string
}

interface Props {
  products: Product[]
  showFloatingButtons?: boolean
  companies?: Company[]
}

export default function HomeClient({ products, showFloatingButtons = false, companies = [] }: Props) {
  const router = useRouter()
  const [showTopButton, setShowTopButton] = useState(false)
  const [waMenuOpen, setWaMenuOpen] = useState(false)
  const waMenuRef = useRef<HTMLDivElement>(null)
  const waButtonRef = useRef<HTMLButtonElement>(null)

  const PRIMARY_WA = BRAND.whatsapp.primary
  const SECONDARY_WA = BRAND.whatsapp.secondary

  useEffect(() => {
    if (!showFloatingButtons) return
    const onScroll = () => setShowTopButton(window.scrollY > 300)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [showFloatingButtons])

  useEffect(() => {
    if (!showFloatingButtons) return
    const onDocClick = (e: MouseEvent) => {
      if (waButtonRef.current?.contains(e.target as Node)) return
      if (!waMenuRef.current?.contains(e.target as Node)) setWaMenuOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [showFloatingButtons])

  // ── Product grid (shown in Flash Deal section) ────────────────────────────
  if (!showFloatingButtons) {
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No products available at the moment</p>
            </div>
          ) : (
            products.slice(0, 8).map((product) => (
              <ProductCard
                key={product._id}
                id={product._id}
                name={product.name}
                price={product.price}
                discountPrice={product.discountPrice}
                image={product.image}
                company={product.company}
                flashSale={product.flashSale}
                size="sm"
              />
            ))
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => router.push("/shop")}
              className="group inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] font-semibold text-sm hover:bg-[var(--color-brand-primary)] hover:text-white transition-all duration-200"
            >
              View All Products
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        )}
      </>
    )
  }

  // ── Floating buttons ──────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed left-4 bottom-6 z-50 flex flex-col gap-3">
        {/* Amazon */}
        <a
          href="https://www.amazon.in/stores/NEZAL/page/C2DBA1DC-D672-44B2-A08C-633F5CDBA91A"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Shop on Amazon"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-md border border-border hover:shadow-lg transition-all"
        >
          <img
            src="https://static.vecteezy.com/system/resources/thumbnails/050/816/837/small/amazon-shopping-transparent-icon-free-png.png"
            alt="Amazon"
            className="w-6 h-6 object-contain"
          />
        </a>

        {/* WhatsApp */}
        <div className="relative" ref={waMenuRef}>
          <button
            ref={waButtonRef}
            onClick={() => setWaMenuOpen((s) => !s)}
            aria-label="Chat on WhatsApp"
            className="flex items-center justify-center w-12 h-12 rounded-full text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
            style={{ background: "#25D366" }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
          </button>

          <div className={`absolute left-0 bottom-14 z-50 w-56 rounded-xl shadow-xl bg-card border border-border transition-all transform origin-bottom-left ${waMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="py-2">
              <button
                onClick={() => { window.open(`https://wa.me/${PRIMARY_WA}`, "_blank", "noopener,noreferrer"); setWaMenuOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "#25D366" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <div>
                  <p className="font-medium text-[13px] text-foreground">Chat with {BRAND.name}</p>
                  <p className="text-[11px] text-muted-foreground">{PRIMARY_WA}</p>
                </div>
              </button>
             
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
        className={`fixed right-6 bottom-6 z-50 flex items-center justify-center w-12 h-12 rounded-full text-primary-foreground shadow-lg transition-all duration-300 ${showTopButton ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"}`}
        style={{ background: "var(--color-brand-primary)" }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  )
}