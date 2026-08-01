"use client"

import { Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Size } from "./size-form"

interface SizeCardProps {
  size: Size
  onEdit?: () => void
  onRemove: () => void
}

export default function SizeCard({ size, onEdit, onRemove }: SizeCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2">
          <p className="font-medium text-sm text-gray-900">{size.size}</p>
          {size.weight != null ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">Custom shipping</span>
          ) : (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100 shrink-0">Default shipping</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
          <span>{size.quantity} {size.unit}</span>
          <span>₹{size.price}{size.discountPrice ? ` → ₹${size.discountPrice}` : ""}</span>
          <span>Stock: {size.stock}</span>
          {size.sku && <span>SKU: {size.sku}</span>}
          {size.weight != null && <span>{size.weight}kg · {size.length}×{size.breadth}×{size.height}cm</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {onEdit && (
          <Button type="button" variant="outline" className="flex-1 md:flex-none border-gray-200" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" />Edit
          </Button>
        )}
        <Button type="button" variant="destructive" className="flex-1 md:flex-none bg-red-600 hover:bg-red-700" onClick={onRemove}>
          <X className="w-4 h-4 mr-1" />Remove
        </Button>
      </div>
    </div>
  )
}