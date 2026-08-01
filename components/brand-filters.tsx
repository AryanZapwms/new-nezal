"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import Link from "next/link"

interface SubCategory {
  _id: string
  name: string
  slug: string
}
interface Category {
  _id: string
  name: string
  slug: string
  subCategories?: SubCategory[]
}
interface BrandFiltersProps {
  companySlug: string
  onCategoryChange: (slug: string) => void
  selectedCategory: string
}

export function BrandFilters({ companySlug, onCategoryChange, selectedCategory }: BrandFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`/api/categories?company=${companySlug}`)
        const data = await res.json()
        setCategories(data)
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [companySlug])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-4 rounded animate-pulse mb-2" style={{ background: "#eef3ee", width: "60%" }} />
            <div className="space-y-1.5 pl-3">
              <div className="h-3 rounded animate-pulse" style={{ background: "#eef3ee", width: "75%" }} />
              <div className="h-3 rounded animate-pulse" style={{ background: "#eef3ee", width: "55%" }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {categories.map((mainCategory) => {
        const isMainSelected = selectedCategory === mainCategory.slug
        return (
          <div key={mainCategory._id} className="py-1.5">
            <button
              onClick={() => onCategoryChange(mainCategory.slug)}
              className="w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                color: isMainSelected ? "#2d6a4f" : "#1a2e1a",
                background: isMainSelected ? "#e8f4ec" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isMainSelected) e.currentTarget.style.background = "#f7faf7"
              }}
              onMouseLeave={(e) => {
                if (!isMainSelected) e.currentTarget.style.background = "transparent"
              }}
            >
              {mainCategory.name}
            </button>

            {mainCategory.subCategories && mainCategory.subCategories.length > 0 && (
              <div className="mt-0.5 ml-2 pl-3 space-y-0.5" style={{ borderLeft: "1.5px solid #eef3ee" }}>
                {mainCategory.subCategories.map((subCategory) => {
                  const isSubSelected = selectedCategory === subCategory.slug
                  return (
                    <Link
                      key={subCategory._id}
                      href={`/shop/${companySlug}/${subCategory.slug}`}
                      onClick={() => onCategoryChange(subCategory.slug)}
                      className="block px-2.5 py-1.5 rounded-lg text-[13px] transition-colors"
                      style={{
                        color: isSubSelected ? "#2d6a4f" : "#6b7c6b",
                        background: isSubSelected ? "#e8f4ec" : "transparent",
                        fontWeight: isSubSelected ? 600 : 500,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubSelected) e.currentTarget.style.background = "#f7faf7"
                      }}
                      onMouseLeave={(e) => {
                        if (!isSubSelected) e.currentTarget.style.background = "transparent"
                      }}
                    >
                      {subCategory.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {categories.length === 0 && (
        <p className="text-xs px-2.5 py-2" style={{ color: "#9aaa9a" }}>
          No categories available yet.
        </p>
      )}
    </div>
  )
}