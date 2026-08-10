"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
  weight?: number
  length?: number
  breadth?: number
  height?: number
}

export const emptySize = (): Size => ({
  size: "", unit: "ml", quantity: 0, price: 0, discountPrice: 0, stock: 0, sku: "",
  weight: undefined, length: undefined, breadth: undefined, height: undefined,
})

const inputCls = "bg-white border-gray-200 focus-visible:ring-emerald-500"
const labelCls = "text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block"
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

interface SizeFormProps {
  value: Size
  onChange: (size: Size) => void
  onSubmit: () => void
  onCancel?: () => void
  isEditing?: boolean
}

export default function SizeForm({ value, onChange, onSubmit, onCancel, isEditing }: SizeFormProps) {
  // Tracks whether the admin has hand-edited the Size Name field.
  // While false, the name auto-fills from Amount + Unit — this is what
  // prevents "Amount: 4, Unit: g" silently drifting from a name like
  // "3-pack (210g)" ever happening again.
  const [nameManuallyEdited, setNameManuallyEdited] = useState(!!isEditing)
  const [showShipping, setShowShipping] = useState(
    value.weight != null || value.length != null || value.breadth != null || value.height != null
  )

  const autoName = value.quantity ? `${value.quantity}${value.unit}` : ""

  useEffect(() => {
    if (!nameManuallyEdited && autoName) {
      onChange({ ...value, size: autoName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.quantity, value.unit])

  const set = (patch: Partial<Size>) => onChange({ ...value, ...patch })

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">

      {/* Step 1 — how much is in this size */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">How much is in this size?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Amount *</label>
            <Input
              type="number" placeholder="50"
              value={value.quantity || ""}
              onChange={(e) => set({ quantity: Number(e.target.value) })}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Total packed amount — for a 3-pack of 70g bars, enter <strong>210</strong>, not 3.
            </p>
          </div>
          <div>
            <label className={labelCls}>Unit *</label>
            <select
              value={value.unit}
              onChange={(e) => set({ unit: e.target.value as Size["unit"] })}
              className={selectCls}
            >
              <option value="ml">ml</option><option value="l">l</option><option value="g">g</option><option value="kg">kg</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + " mb-0"}>Customer-facing name *</label>
            {nameManuallyEdited && autoName && value.size !== autoName && (
              <button
                type="button"
                onClick={() => { setNameManuallyEdited(false); set({ size: autoName }) }}
                className="text-xs text-emerald-700 hover:underline"
              >
                Reset to "{autoName}"
              </button>
            )}
          </div>
          <Input
            type="text" placeholder="e.g., 50ml or 3-pack (210g)"
            value={value.size}
            onChange={(e) => { setNameManuallyEdited(true); set({ size: e.target.value }) }}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            {nameManuallyEdited
              ? "Custom name — won't auto-update. Good for bundles like \"3-pack (210g)\"."
              : "Auto-filled from Amount + Unit. Edit it directly for bundles."}
          </p>
        </div>
      </div>

      {/* Step 2 — pricing */}
      <div className="border-t border-gray-100 p-4 bg-gray-50/60 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pricing</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Price (₹) *</label><Input type="number" placeholder="0" value={value.price || ""} onChange={(e) => set({ price: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className={labelCls}>Discount Price (₹)</label><Input type="number" placeholder="0" value={value.discountPrice || ""} onChange={(e) => set({ discountPrice: Number(e.target.value) || 0 })} className={inputCls} /></div>
        </div>
      </div>

      {/* Step 3 — inventory */}
      <div className="border-t border-gray-100 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Inventory</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Stock *</label><Input type="number" placeholder="0" value={value.stock ?? ""} onChange={(e) => set({ stock: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className={labelCls}>Size SKU (optional)</label><Input type="text" placeholder="SKU-50ML" value={value.sku || ""} onChange={(e) => set({ sku: e.target.value })} className={inputCls} /></div>
        </div>
      </div>

      {/* Step 4 — shipping override, opt-in */}
      <div className="border-t border-gray-100 p-4 bg-gray-50/60 space-y-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showShipping}
            onChange={(e) => {
              setShowShipping(e.target.checked)
              if (!e.target.checked) set({ weight: undefined, length: undefined, breadth: undefined, height: undefined })
            }}
            className="w-4 h-4 mt-0.5 accent-emerald-700"
          />
          <span>
            <span className="text-sm font-medium text-gray-900">This size ships differently than the product default</span>
            <span className="block text-xs text-gray-400">Only check this for bundles — the packed box weighs more than a single unit.</span>
          </span>
        </label>

        {showShipping && (
          <div className="pt-1 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                <Input type="number" step="0.01" placeholder="e.g. 0.85" value={value.weight ?? ""} onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })} className={`${inputCls} text-sm`} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Length (cm)</label>
                <Input type="number" step="0.1" placeholder="e.g. 18" value={value.length ?? ""} onChange={(e) => set({ length: e.target.value ? Number(e.target.value) : undefined })} className={`${inputCls} text-sm`} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Breadth (cm)</label>
                <Input type="number" step="0.1" placeholder="e.g. 12" value={value.breadth ?? ""} onChange={(e) => set({ breadth: e.target.value ? Number(e.target.value) : undefined })} className={`${inputCls} text-sm`} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Height (cm)</label>
                <Input type="number" step="0.1" placeholder="e.g. 8" value={value.height ?? ""} onChange={(e) => set({ height: e.target.value ? Number(e.target.value) : undefined })} className={`${inputCls} text-sm`} />
              </div>
            </div>
            <p className="text-xs text-amber-600">
              Enter the actual weighed/measured box for the full bundle — not the single-unit value.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button type="button" onClick={onSubmit} variant="outline" className="w-full border-gray-200">{isEditing ? "Update size" : "Add size"}</Button>
        {isEditing && onCancel && <Button type="button" onClick={onCancel} variant="secondary" className="w-full">Cancel</Button>}
      </div>
    </div>
  )
}