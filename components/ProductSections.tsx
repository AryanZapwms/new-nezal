"use client"

/**
 * ProductSections
 *
 * Renders the structured product detail sections below the product name.
 * Each section is optional — if the field is empty/missing it simply doesn't render.
 *
 * Fields:
 *   whyYoullLoveIt    — string[] (bullet points)
 *   suitableFor       — string[] (pill tags)
 *   fragranceExp      — string[] (pill tags, e.g. ["Cool", "Fresh", "Revitalizing"])
 *   whoIsItFor        — string   (short paragraph)
 *   skinHairConcern   — string   (short paragraph)
 *   expectedResults   — string   (short paragraph)
 *   keyIngredients    — { name: string; benefit: string }[]
 */

import React from "react"

export interface ProductSectionsData {
  whyYoullLoveIt?: string[]
  suitableFor?: string[]
  fragranceExp?: string[]
  whoIsItFor?: string
  skinHairConcern?: string
  expectedResults?: string
  ingredients?: string[]
  keyIngredients?: { name: string; benefit: string }[]
}

interface Props {
  data: ProductSectionsData
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold mb-2 underline underline-offset-4" style={{ color: "#1e3a28" }}>
      {children}
    </h4>
  )
}

function PillList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="px-3 py-1 rounded-full text-xs font-medium "
          style={{ borderColor: "#c8dac9", color: "#f0f7f0", backgroundColor: "#22783d" }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function CheckList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4a5e50" }}>
          <span className="font-bold mt-0.5 shrink-0" style={{ color: "#2a5c3a" }}>✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Paragraph({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: "#4a5e50" }}>
      {text}
    </p>
  )
}

export default function ProductSections({ data }: Props) {
  const sections: React.ReactNode[] = []

  if (data.whyYoullLoveIt?.length) {
    sections.push(
      <div key="why">
        <SectionHeading>Why You'll Love It</SectionHeading>
        <CheckList items={data.whyYoullLoveIt} />
      </div>
    )
  }

  if (data.suitableFor?.length) {
    sections.push(
      <div key="suitable">
        <SectionHeading>Suitable For</SectionHeading>
        <PillList items={data.suitableFor} />
      </div>
    )
  }

  if (data.fragranceExp?.length) {
    sections.push(
      <div key="fragrance">
        <SectionHeading>Fragrance Experience</SectionHeading>
        <PillList items={data.fragranceExp} />
      </div>
    )
  }

  if (data.whoIsItFor) {
    sections.push(
      <div key="who">
        <SectionHeading>Who Is This For?</SectionHeading>
        <Paragraph text={data.whoIsItFor} />
      </div>
    )
  }

  if (data.skinHairConcern) {
    sections.push(
      <div key="concern">
        <SectionHeading>Skin / Hair Concern It Addresses</SectionHeading>
        <Paragraph text={data.skinHairConcern} />
      </div>
    )
  }

  if (data.expectedResults) {
    sections.push(
      <div key="results">
        <SectionHeading>What Results To Expect</SectionHeading>
        <Paragraph text={data.expectedResults} />
      </div>
    )
  }

  if (data.ingredients?.length) {
    sections.push(
      <div key="ingredients-list">
        <SectionHeading>Ingredients</SectionHeading>
        <PillList items={data.ingredients} />
      </div>
    )
  }

  if (data.keyIngredients?.length) {
    sections.push(
      <div key="key-ingredients">
        <SectionHeading>How Key Ingredients Help</SectionHeading>
        <ul className="space-y-1.5">
          {data.keyIngredients.map((ing, i) => (
            <li key={i} className="text-sm" style={{ color: "#4a5e50" }}>
              <span className="font-semibold border rounded-lg px-2 " style={{ color: "#1e3a28" }}>{ing.name}</span>
              {" — "}
              {ing.benefit}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (!sections.length) return null

  return (
    <div className="space-y-5 pt-2">
      {/* Divider */}
      <div className="border-t" style={{ borderColor: "#dde8de" }} />
      {sections}
    </div>
  )
}