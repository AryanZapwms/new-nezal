// components/coming-soon.tsx
"use client"

import { Star } from "lucide-react"

interface ComingSoonProps {
  companyName?: string
}

export function ComingSoon({ companyName }: ComingSoonProps) {
  return (
    <div className="min-h-screen bg-[--color-bg-cream] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Stars – gold accent */}
        <div className="flex justify-center gap-8 mb-8">
          <Star className="w-6 h-6 text-[--color-brand-accent] fill-[--color-brand-accent] animate-pulse" />
          <Star className="w-8 h-8 text-[--color-brand-accent] fill-[--color-brand-accent] animate-pulse delay-100" />
          <Star className="w-6 h-6 text-[--color-brand-accent] fill-[--color-brand-accent] animate-pulse delay-200" />
        </div>

        {/* Main heading – Playfair Display */}
        <div className="space-y-4">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-[--color-text-heading] tracking-normal">
            Coming Soon
          </h1>
          <p className="text-lg md:text-xl text-[--color-text-body] font-medium">
            {companyName ? `${companyName} is` : "We are"} preparing something special for you
          </p>
        </div>

        {/* Description card */}
        <div className="bg-white border border-[--color-border] rounded-2xl p-6 md:p-8 space-y-3 shadow-sm">
          <p className="text-[--color-text-body] text-base md:text-lg leading-relaxed">
            ✨ Our team is working hard to bring you an amazing collection of premium natural skincare products.
          </p>
          <p className="text-[--color-text-muted] text-sm md:text-base">
            Stay tuned for exclusive launches, special offers, and products curated just for you.
          </p>
        </div>

        {/* Stay Tuned badge – green pill */}
        <div className="space-y-4">
          <div className="inline-block">
            <div className="bg-[--color-brand-primary] text-white px-8 py-4 rounded-full font-semibold text-lg tracking-wide shadow-lg">
              🌟 Stay Tuned 🌟
            </div>
          </div>
        </div>

        {/* Bottom decoration dots */}
        <div className="pt-8 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[--color-brand-primary]" />
          <div className="w-2 h-2 rounded-full bg-[--color-brand-accent]" />
          <div className="w-2 h-2 rounded-full bg-[--color-text-muted]" />
          <div className="w-2 h-2 rounded-full bg-[--color-brand-accent]" />
          <div className="w-2 h-2 rounded-full bg-[--color-brand-primary]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
    </div>
  )
}