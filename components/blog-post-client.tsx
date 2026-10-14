"use client"

// components/blog-post-client.tsx
//
// The interactive bits of the server-rendered blog post
// (app/blog/[slug]/page.tsx): the Share button and the featured image, which
// hides itself if it fails to load.

import { useState } from "react"
import { Share2 } from "lucide-react"

export function BlogShareButton({ title, excerpt }: { title: string; excerpt?: string }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: excerpt, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full transition-colors hover:opacity-80"
      style={{ background: "#fff", color: "#1a3a2a", border: "1px solid #d4e8d0" }}
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </button>
  )
}

export function BlogFeaturedImage({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false)

  if (imageError) return null

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10" style={{ background: "#e8f2e4" }}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        // The image is in the server HTML now, so it can fail before React
        // hydrates and attaches onError — catch that case on mount.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setImageError(true)
        }}
      />
    </div>
  )
}
