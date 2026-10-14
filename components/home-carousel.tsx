// components/home-carousel.tsx
"use client"

import { useState, useEffect } from "react"
import { getImageProps } from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CarouselImage {
  _id: string
  url: string
  mobileUrl?: string
  title?: string
  description?: string
  link?: string
}

interface HomeCarouselProps {
  images?: CarouselImage[]
}

// Fallback only — used if no banners exist in the DB yet
const staticImages: CarouselImage[] = [
  { _id: "8", url: "/14.jpeg" },
  { _id: "2", url: "https://nezal-cdn.b-cdn.net/homebanners/6a4e249b830824100f86a156/image9_a1avzr.png" },
  { _id: "3", url: "https://nezal-cdn.b-cdn.net/homebanners/6a4e249b830824100f86a157/image7_wfgoej.png" },
  { _id: "1", url: "https://nezal-cdn.b-cdn.net/homebanners/6a4e249b830824100f86a158/image8_cqm0fb.png" },
  { _id: "7", url: "/13.jpeg" },
  { _id: "4", url: "https://nezal-cdn.b-cdn.net/misc/carousel-fallback/image10_escelc.png" },
  { _id: "6", url: "/12.jpeg" },
  { _id: "5", url: "/11.jpeg" },
]

export function HomeCarousel({ images }: HomeCarouselProps) {
  const carouselImages = images && images.length > 0 ? images : staticImages
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!autoPlay || carouselImages.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [autoPlay, carouselImages.length])

  if (!carouselImages || carouselImages.length === 0) return null

  const goToPrevious = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)
  }

  const goToNext = () => {
    setAutoPlay(false)
    setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
  }

  // ── Click routing — now driven by admin-configured `link` ──────────
  const handleImageClick = () => {
    const link = carouselImages[currentIndex]?.link
    if (link) router.push(link)
  }

  const currentImage = carouselImages[currentIndex]
  const isClickable = Boolean(currentImage?.link)
  const alt = currentImage?.title || "Carousel image"

  // Mobile falls back to the desktop image when no mobile-specific image has been
  // set for this slide in the admin panel. The dedicated mobile image is purpose-shot
  // for the portrait frame so it can safely be cropped (object-cover); the desktop
  // fallback was designed for a landscape frame, so it must be shown in full
  // (object-contain, letterboxed) rather than center-cropped — cropping a wide banner
  // into a portrait/short box cuts off headings and product shots.
  const hasMobileImage = Boolean(currentImage?.mobileUrl)
  const mobileSrc = currentImage?.mobileUrl || currentImage?.url
  const mobileAspectClass = hasMobileImage ? "aspect-[4/5]" : "aspect-[1000/384]"
  const mobileObjectFitClass = hasMobileImage ? "object-cover" : "object-contain"

  // One <picture> rather than a desktop <Image> and a mobile <Image> with one
  // hidden by CSS — both were priority-loaded, so every device downloaded two
  // hero banners. The browser now fetches only the source matching its width.
  // (data: URLs come back as-is; local /public files skip the loader.)
  const bannerProps = (src: string) =>
    getImageProps({
      src,
      alt,
      fill: true,
      sizes: "100vw",
      loading: "eager",
      fetchPriority: "high",
      unoptimized: src.startsWith("/"),
    }).props
  const desktopBanner = currentImage ? bannerProps(currentImage.url) : null
  const mobileBanner = mobileSrc ? bannerProps(mobileSrc) : null

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: "var(--color-bg-hero)",
        // Keeps this in sync with StickyHeaderStack's live-measured height
        // (promo bar + header) so an anchor/programmatic scroll to the hero
        // never lands it hidden underneath the sticky stack.
        scrollMarginTop: "var(--sticky-header-stack-height)",
      }}
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goToPrevious()
        if (e.key === "ArrowRight") goToNext()
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products carousel"
    >
      <div className="relative w-full">
        {currentImage && desktopBanner && mobileBanner && (
          // Mobile frame: mobileUrl if set in admin (square/portrait), else the desktop
          // image letterboxed. From md up: the landscape banner, cropped to fill.
          <div
            className={`relative w-full ${mobileAspectClass} md:aspect-[1000/384] ${isClickable ? "cursor-pointer" : ""}`}
            style={{ minHeight: 200 }}
            onClick={handleImageClick}
          >
            <picture>
              <source
                media="(min-width: 768px)"
                srcSet={desktopBanner.srcSet ?? desktopBanner.src}
                sizes={desktopBanner.sizes}
              />
              <img
                {...mobileBanner}
                alt={alt}
                className={`object-center transition-opacity duration-500 ${mobileObjectFitClass} md:object-cover`}
              />
            </picture>

            {(currentImage.title || currentImage.description) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end pointer-events-none">
                <div className="p-5 md:p-10 text-white">
                  {currentImage.title && (
                    <h2
                      className="font-display text-xl md:text-4xl font-bold mb-1.5 md:mb-2 leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {currentImage.title}
                    </h2>
                  )}
                  {currentImage.description && (
                    <p className="text-xs md:text-base text-white/85 max-w-xs md:max-w-lg">
                      {currentImage.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {carouselImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md transition-all hover:bg-white hover:scale-110"
              style={{ color: "var(--color-text-heading)" }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToNext}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md transition-all hover:bg-white hover:scale-110"
              style={{ color: "var(--color-text-heading)" }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {carouselImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setAutoPlay(false); setCurrentIndex(idx) }}
                aria-label={`Go to slide ${idx + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === currentIndex ? 28 : 8,
                  height: 8,
                  background: idx === currentIndex ? "var(--color-brand-primary)" : "rgba(255,255,255,0.7)",
                }}
              />
            ))}
          </div>
        )}

        {carouselImages.length > 1 && (
          <div
            className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full text-white text-xs font-medium"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          >
            {currentIndex + 1} / {carouselImages.length}
          </div>
        )}
      </div>
    </div>
  )
}