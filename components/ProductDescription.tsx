"use client"

/**
 * ProductDescription
 *
 * Renders the intro description block only (tagline + body paragraph).
 * All the structured sections (Why You'll Love It, Suitable For,
 * Ingredients, Key Ingredients, etc.) now live in ProductSections.tsx —
 * this component no longer parses or renders those.
 *
 * The description is expected to be stored with the tagline on its own
 * first line, separated by \n from the body paragraph, e.g.:
 *
 *   "Woody Richness, Smooth Skin & Classic Warmth
 *    Rustic Sandal gives the Doobie range a grounded and classic
 *    fragrance profile..."
 *
 * The tagline renders in a distinct style (italic, bold, gold).
 * The body renders as a normal paragraph below it.
 *
 * Backward compatible: if a product's description has no newline
 * (older products saved before the tagline convention), it just
 * renders the whole thing as a plain paragraph — no crash, no
 * mis-styled tagline guess.
 */

import React from "react"

interface Props {
  description: string
  className?: string
}

export default function ProductDescription({ description, className = "" }: Props) {
  if (!description?.trim()) return null

  const trimmed = description.trim()
  const newlineIdx = trimmed.indexOf("\n")

  const tagline = newlineIdx !== -1 ? trimmed.slice(0, newlineIdx).trim() : ""
  const body = newlineIdx !== -1 ? trimmed.slice(newlineIdx + 1).trim() : trimmed

  return (
    <div className={className}>
      {tagline && (
        <p className="italic font-bold mb-2 text-base" style={{ color: "#b8860b" }}>
          {tagline}
        </p>
      )}
      {body && (
        <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
          {body}
        </p>
      )}
    </div>
  )
}