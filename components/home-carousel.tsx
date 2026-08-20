// components/home-carousel.tsx
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CarouselImage {
  _id: string
  url: string
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
  const isDataUrl = currentImage?.url?.startsWith("data:")
  const isClickable = Boolean(currentImage?.link)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: "var(--color-bg-hero)" }}
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
      <div className="relative w-full" style={{ aspectRatio: "1000 / 384", minHeight: 200 }}>
        {currentImage && (
          <div
            className={`relative w-full h-full ${isClickable ? "cursor-pointer" : ""}`}
            onClick={handleImageClick}
          >
            {isDataUrl ? (
              <img
                src={currentImage.url}
                alt={currentImage.title || "Carousel image"}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <Image
  src={currentImage.url}
  alt={currentImage.title || "Carousel image"}
  fill
  className="object-cover object-center transition-opacity duration-500"
  sizes="100vw"
  priority
  unoptimized={
    currentImage.url.startsWith("/") || currentImage.url.startsWith("/public")
  }
/>
            )}

            {(currentImage.title || currentImage.description) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end pointer-events-none">
                <div className="p-6 sm:p-10 text-white">
                  {currentImage.title && (
                    <h2
                      className="font-display text-2xl sm:text-4xl font-bold mb-2 leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {currentImage.title}
                    </h2>
                  )}
                  {currentImage.description && (
                    <p className="text-sm sm:text-base text-white/85 max-w-lg">
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