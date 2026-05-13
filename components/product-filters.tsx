// components/product-filters.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductFiltersProps {
  companies: Array<{ _id: string; name: string; slug: string }>
  onFilterChange: (filters: { company?: string; priceRange?: [number, number] }) => void
}

export function ProductFilters({ companies, onFilterChange }: ProductFiltersProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])

  const handleCompanyChange = (slug: string) => {
    setSelectedCompany(slug)
    onFilterChange({ company: slug, priceRange })
  }

  const handlePriceChange = (newRange: [number, number]) => {
    setPriceRange(newRange)
    onFilterChange({ company: selectedCompany, priceRange: newRange })
  }

  return (
    <Card className="border border-[--color-border] rounded-2xl shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-[--color-text-heading]">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand filter */}
        <div>
          <h3 className="font-semibold text-sm text-[--color-text-heading] mb-3">Brands</h3>
          <div className="space-y-2">
            <Button
              variant={selectedCompany === "" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleCompanyChange("")}
              style={
                selectedCompany === ""
                  ? { backgroundColor: "var(--color-brand-primary)", color: "white", borderColor: "var(--color-brand-primary)" }
                  : { borderColor: "var(--color-border)", color: "var(--color-text-heading)" }
              }
            >
              All Brands
            </Button>
            {companies.map((company) => (
              <Button
                key={company._id}
                variant={selectedCompany === company.slug ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleCompanyChange(company.slug)}
                style={
                  selectedCompany === company.slug
                    ? { backgroundColor: "var(--color-brand-primary)", color: "white", borderColor: "var(--color-brand-primary)" }
                    : { borderColor: "var(--color-border)", color: "var(--color-text-heading)" }
                }
              >
                {company.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Price filter */}
        <div>
          <h3 className="font-semibold text-sm text-[--color-text-heading] mb-3">Price Range</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={priceRange[0]}
                onChange={(e) => handlePriceChange([Number.parseInt(e.target.value), priceRange[1]])}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg text-sm text-[--color-text-heading] focus:outline-none focus:border-[--color-brand-primary]"
                placeholder="Min"
              />
              <input
                type="number"
                max="10000"
                value={priceRange[1]}
                onChange={(e) => handlePriceChange([priceRange[0], Number.parseInt(e.target.value)])}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg text-sm text-[--color-text-heading] focus:outline-none focus:border-[--color-brand-primary]"
                placeholder="Max"
              />
            </div>
            <p className="text-xs text-[--color-text-muted]">
              ₹{priceRange[0]} - ₹{priceRange[1]}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}