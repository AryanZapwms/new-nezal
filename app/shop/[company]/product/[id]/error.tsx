// app/shop/[company]/product/[id]/error.tsx
//
// Shown when the product page can't load its data (database unreachable and
// the like), with the message and "Try again" the page used to show when its
// browser fetch failed. A product that doesn't exist is a 404 instead
// (app/not-found.tsx).

"use client"

import { useEffect } from "react"

export default function ProductError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Product page failed to load:", error)
  }, [error])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-2xl font-semibold text-gray-700">Product unavailable</p>
        <p className="text-gray-500">This product may have moved or is temporarily unavailable.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1e3a28" }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
