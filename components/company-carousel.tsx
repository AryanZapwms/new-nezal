// components/company-carousel.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselImage {
  _id: string;
  url: string;
  title?: string;
  description?: string;
}

interface CompanyCarouselProps {
  images: CarouselImage[];
}

const DEFAULT_AUTO_ADVANCE_MS = 5000;
const IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw";

export function CompanyCarousel({ images }: CompanyCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (!autoPlay || images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, DEFAULT_AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [autoPlay, images.length]);

  if (!images || images.length === 0) return null;

  const goToPrevious = () => {
    setAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-8 shadow-lg border border-[--color-border] bg-[--color-bg-hero]"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goToPrevious();
        if (e.key === "ArrowRight") goToNext();
      }}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio: "1000 / 384",
          maxHeight: "420px",
        }}
      >
        {currentImage && (
          <Image
            src={currentImage.url}
            alt={currentImage.title || "Carousel slide"}
            fill
            className="object-contain sm:object-cover transition-transform duration-500 group-hover:scale-105"
            priority
            quality={90}
            sizes={IMAGE_SIZES}
            unoptimized={currentImage.url.startsWith('/') || currentImage.url.startsWith('/public')}
          />
        )}

        {/* Overlay text with brand green tint */}
        {(currentImage.title || currentImage.description) && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end pointer-events-none">
            <div className="w-full p-4 sm:p-6 text-white">
              {currentImage.title && (
                <h3 className="font-display text-lg sm:text-2xl font-bold mb-2">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.description && (
                <p className="text-sm sm:text-base text-white/85">
                  {currentImage.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subtle green vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[--color-brand-primary]/5" />
      </div>

      {/* Navigation arrows – white circles with brand hover */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            aria-label="Previous slide"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 text-[--color-text-heading] flex items-center justify-center shadow-md hover:bg-[--color-brand-primary] hover:text-white transition-all duration-200 backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 text-[--color-text-heading] flex items-center justify-center shadow-md hover:bg-[--color-brand-primary] hover:text-white transition-all duration-200 backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Dots – brand green active */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAutoPlay(false);
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-8 h-2.5 bg-[--color-brand-primary] shadow-sm"
                    : "w-2.5 h-2.5 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>

          {/* Counter pill */}
          <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}