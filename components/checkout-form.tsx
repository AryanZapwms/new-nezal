// components/checkout-form.tsx
"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface CheckoutFormProps {
  totalAmount: number
  onSubmit: (address: any, paymentMethod: string) => Promise<void>
  availablePaymentMethods: string[]
  initialData?: {
    name?: string
    phone?: string
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  isSubmitting?: boolean
}

export function CheckoutForm({ totalAmount, onSubmit, availablePaymentMethods, initialData, isSubmitting = false }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    street: initialData?.street || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.zipCode || "",
    country: initialData?.country || "India",
  })
  const [paymentMethod, setPaymentMethod] = useState(availablePaymentMethods[0] || "razorpay")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData, paymentMethod)
  }

  return (
    <Card className="border border-[--color-border] rounded-2xl shadow-sm bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-[--color-text-heading]">Shipping Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">Full Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">Phone Number</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                required
                className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--color-text-heading]">Street Address</label>
            <Input
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="123 Main St"
              required
              className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">City</label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                required
                className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">State</label>
              <Input
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                required
                className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">ZIP Code</label>
              <Input
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="ZIP Code"
                required
                className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--color-text-heading]">Country</label>
              <Input
                name="country"
                value={formData.country}
                disabled
                className="bg-[--color-bg-cream] text-[--color-text-muted] rounded-lg h-10"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="border-t border-[--color-border] pt-5">
            <label className="text-sm font-semibold text-[--color-text-heading] block mb-3">
              Payment Method
            </label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                {availablePaymentMethods.includes("razorpay") && (
                  <div className="flex items-center space-x-3 border border-[--color-border] rounded-xl p-4 cursor-pointer hover:border-[--color-brand-primary] transition-colors bg-white">
                    <RadioGroupItem value="razorpay" id="razorpay" className="text-[--color-brand-primary]" />
                    <Label htmlFor="razorpay" className="cursor-pointer flex-1">
                      <span className="font-medium text-[--color-text-heading]">Razorpay</span>
                      <p className="text-xs text-[--color-text-muted] mt-0.5">
                        Pay securely using credit card, debit card, or UPI
                      </p>
                    </Label>
                  </div>
                )}
                {availablePaymentMethods.includes("cod") && (
                  <div className="flex items-center space-x-3 border border-[--color-border] rounded-xl p-4 cursor-pointer hover:border-[--color-brand-primary] transition-colors bg-white">
                    <RadioGroupItem value="cod" id="cod" className="text-[--color-brand-primary]" />
                    <Label htmlFor="cod" className="cursor-pointer flex-1">
                      <span className="font-medium text-[--color-text-heading]">Cash on Delivery (COD)</span>
                      <p className="text-xs text-[--color-text-muted] mt-0.5">
                        Pay when you receive your order
                      </p>
                    </Label>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-semibold py-5 rounded-xl text-base"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Proceed – ₹${totalAmount.toLocaleString()}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}