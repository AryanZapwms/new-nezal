// components/checkout-form.tsx
"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCheckoutStore } from "@/lib/store/checkout-store"
import Link from "next/link"

interface CheckoutFormProps {
  totalAmount: number
  onSubmit: (address: any, paymentMethod: string) => Promise<void>
  onZipCodeChange?: (zip: string) => void
  onPaymentMethodChange?: (method: string) => void 
  availablePaymentMethods: string[]
  initialData?: {
    name?: string
    email?: string
    phone?: string
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  isSubmitting?: boolean
}

const CheckIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const MapPinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

const TruckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) mb-1.5">
      {children}
    </label>
  )
}

function StyledInput({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) pointer-events-none">
          {icon}
        </span>
      )}
      <Input
        {...props}
        className={[
          "h-11 rounded-xl border border-(--color-border) bg-white",
          "text-sm text-(--color-text-heading) placeholder:text-(--color-text-muted)",
          "focus-visible:ring-2 focus-visible:ring-(--color-brand-primary)/20",
          "focus-visible:border-(--color-brand-primary) transition-all duration-200",
          icon ? "pl-9" : "pl-3.5",
          props.disabled ? "bg-(--color-bg-cream) text-(--color-text-muted) cursor-not-allowed opacity-70" : "",
        ].join(" ")}
      />
    </div>
  )
}

function PaymentOption({
  label,
  description,
  icon,
  selected,
  onSelect,
}: {
  label: string
  description: string
  icon: React.ReactNode
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
        selected
          ? "border-(--color-brand-primary) bg-(--color-brand-primary)/5 shadow-md"
          : "border-(--color-border) bg-white hover:border-(--color-brand-primary)/40 hover:bg-(--color-bg-cream)",
      ].join(" ")}
    >
      <div className={[
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
        selected ? "border-(--color-brand-primary) bg-(--color-brand-primary) text-white" : "border-(--color-border)",
      ].join(" ")}>
        {selected && <CheckIcon />}
      </div>
      <div className={[
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg transition-all duration-200",
        selected ? "bg-(--color-brand-primary)/10 text-(--color-brand-primary)" : "bg-(--color-bg-cream) text-(--color-text-muted)",
      ].join(" ")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={[
          "text-sm font-semibold transition-colors duration-200",
          selected ? "text-(--color-brand-primary)" : "text-(--color-text-heading)",
        ].join(" ")}>
          {label}
        </p>
        <p className="text-xs text-(--color-text-muted) mt-0.5 leading-relaxed">{description}</p>
      </div>
    </button>
  )
}

type AddressData = {
  name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

type AddressSuggestion = {
  display_name: string
  address: {
    house_number?: string
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
  }
}

export function CheckoutForm({
  totalAmount,
  onSubmit,
  onZipCodeChange,
  onPaymentMethodChange,
  availablePaymentMethods,
  initialData,
  isSubmitting = false,
}: CheckoutFormProps) {
  const {
    address: savedAddress,
    paymentMethod: savedPaymentMethod,
    setAddress: persistAddress,
    setPaymentMethod: persistPaymentMethod,
  } = useCheckoutStore()

  // Prefer whatever the user last typed (persisted in localStorage) over
  // the profile fallback — this is what survives a failed/cancelled payment redirect.
  const buildInitial = (): AddressData => ({
    name: savedAddress?.name || initialData?.name || "",
    email: savedAddress?.email || initialData?.email || "",
    phone: savedAddress?.phone || initialData?.phone || "",
    street: savedAddress?.street || initialData?.street || "",
    city: savedAddress?.city || initialData?.city || "",
    state: savedAddress?.state || initialData?.state || "",
    zipCode: savedAddress?.zipCode || initialData?.zipCode || "",
    country: savedAddress?.country || initialData?.country || "India",
  })

  const [formData, setFormData] = useState<AddressData>(buildInitial)

  const hasSavedAddress = Boolean(
    savedAddress?.street && savedAddress?.city && savedAddress?.zipCode && savedAddress?.phone,
  )
  const [isEditing, setIsEditing] = useState(!hasSavedAddress)

  const [paymentMethod, setPaymentMethod] = useState(
    savedPaymentMethod && availablePaymentMethods.includes(savedPaymentMethod)
      ? savedPaymentMethod
      : availablePaymentMethods[0] || "ccavenue",
  )

  useEffect(() => {
  onPaymentMethodChange?.(paymentMethod)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  // ---- Address autocomplete state ----
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const suggestionBoxRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortController = useRef<AbortController | null>(null)

  // Close the suggestions dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced address search (uses OpenStreetMap's free Nominatim API — no key required)
  const searchAddress = (query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (query.trim().length < 4) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceTimer.current = setTimeout(async () => {
      abortController.current?.abort()
      abortController.current = new AbortController()
      setIsSearchingAddress(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(
            query,
          )}`,
          { signal: abortController.current.signal, headers: { Accept: "application/json" } },
        )
        const data: AddressSuggestion[] = await res.json()
        setAddressSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAddressSuggestions([])
        }
      } finally {
        setIsSearchingAddress(false)
      }
    }, 400)
  }

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address
    const streetLine =
      [addr.house_number, addr.road].filter(Boolean).join(" ") ||
      addr.suburb ||
      addr.neighbourhood ||
      suggestion.display_name.split(",")[0]
    const city = addr.city || addr.town || addr.village || addr.suburb || ""
    const zip = addr.postcode || ""

    setFormData((prev) => ({
      ...prev,
      street: streetLine,
      city,
      state: addr.state || prev.state,
      zipCode: zip || prev.zipCode,
      country: "India",
    }))

    if (/^\d{6}$/.test(zip)) {
      onZipCodeChange?.(zip)
    }

    setAddressSuggestions([])
    setShowSuggestions(false)
  }

  useEffect(() => {
  if (/^\d{6}$/.test(formData.zipCode)) {
    onZipCodeChange?.(formData.zipCode)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "zipCode" && /^\d{6}$/.test(value)) {
      onZipCodeChange?.(value)
    }
    if (name === "street") {
      searchAddress(value)
    }
  }

const handleSelectPayment = (method: string) => {
  setPaymentMethod(method)
  persistPaymentMethod(method)
  onPaymentMethodChange?.(method)   // ← add
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Save before submitting — this is what makes the address survive
    // a failed/cancelled payment redirect back to this page.
    persistAddress(formData)
    persistPaymentMethod(paymentMethod)
    await onSubmit(formData, paymentMethod)
  }

  const handleUseSavedAddress = () => {
  if (savedAddress) {
    setFormData(savedAddress as AddressData)
    if (/^\d{6}$/.test(savedAddress.zipCode)) {
      onZipCodeChange?.(savedAddress.zipCode)
    }
  }
  setIsEditing(false)
}

  const steps = ["Cart", "Delivery", "Confirm"]

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">

       {/* Back to cart */}
       {!isSubmitting && (
    <Link
      href="/cart"
      className="inline-flex items-center gap-1.5 text-sm font-medium border p-2 rounded-xl mb-5 bg-[#aeb4b0] hover:bg-[#9b8282] text-white hover: transition-colors mb-1"
    >
      <ArrowLeftIcon />
      Back to Cart
    </Link>
    )}


      {/* Progress stepper */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {steps.map((step, i) => {
          const state = i === 0 ? "done" : i === 1 ? "active" : "idle"
          return (
            <div key={step} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <div className={[
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0",
                  state === "done" ? "bg-(--color-brand-primary) text-white" : "",
                  state === "active" ? "bg-(--color-text-heading) text-white" : "",
                  state === "idle" ? "bg-(--color-border) text-(--color-text-muted)" : "",
                ].join(" ")}>
                  {state === "done" ? <CheckIcon /> : i + 1}
                </div>
                <span className={[
                  "text-xs font-medium hidden sm:block",
                  state === "done" ? "text-(--color-brand-primary)" : "",
                  state === "active" ? "text-(--color-text-heading)" : "",
                  state === "idle" ? "text-(--color-text-muted)" : "",
                ].join(" ")}>
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-(--color-border)" />}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border border-(--color-border) rounded-2xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 pt-5 px-6 flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-(--color-brand-primary)/10 flex items-center justify-center text-(--color-brand-primary) flex-shrink-0">
                <MapPinIcon />
              </div>
              <CardTitle className="text-base font-semibold text-(--color-text-heading)">
                Shipping Address
              </CardTitle>
            </div>
            {hasSavedAddress && !isEditing && (
              <span className="inline-flex items-center gap-1  text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                <CheckIcon /> Saved
              </span>
            )}
          </CardHeader>

          <CardContent className="px-6 pt-5 pb-6 space-y-4">
            {hasSavedAddress && !isEditing ? (
              /* ===== Saved address summary ===== */
              <div className="rounded-xl border border-(--color-border) bg-(--color-bg-cream) px-4 py-4 flex items-start justify-between gap-4">
                <div className="text-sm min-w-0">
                  <p className="font-semibold text-(--color-text-heading)">{formData.name}</p>
                  <p className="text-(--color-text-body) mt-0.5 leading-relaxed">
                    {formData.street}, {formData.city}, {formData.state} {formData.zipCode}
                  </p>
                  <p className="text-(--color-text-muted) mt-1">{formData.phone} · {formData.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs border rounded-xl bg-[#4e733b] hover:bg-[#226003] text-white  p-2 font-semibold text-(--color-brand-primary)  flex-shrink-0 mt-0.5"
                >
                  <PencilIcon /> Change
                </button>
              </div>
            ) : (
              /* ===== Editable form ===== */
              <>
                {hasSavedAddress && (
                  <button
                    type="button"
                    onClick={handleUseSavedAddress}
                    className="text-xs font-semibold text-(--color-brand-primary) hover:underline mb-1"
                  >
                    ← Use saved address instead
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <StyledInput
                      name="name" value={formData.name} onChange={handleChange}
                      placeholder="Rohan Mehta" required
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <StyledInput
                      name="phone" value={formData.phone} onChange={handleChange}
                      placeholder="+91 98765 43210" required
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8 19.79 19.79 0 01.22 4.22 2 2 0 012.2 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.27a16 16 0 006.72 6.72l1.34-1.34a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <StyledInput
                    name="email" type="email" value={formData.email} onChange={handleChange}
                    placeholder="you@example.com" required
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                  />
                </div>

                <div className="relative" ref={suggestionBoxRef}>
                  <FieldLabel>Street Address</FieldLabel>
                  <StyledInput
                    name="street" value={formData.street} onChange={handleChange}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder="123 Brigade Road, Apt 4B" required
                    autoComplete="off"
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
                  />
                  {isSearchingAddress && (
                    <p className="text-[11px] text-(--color-text-muted) mt-1.5">Searching addresses…</p>
                  )}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-(--color-border) rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                      {addressSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full flex items-start gap-2.5 text-left px-3.5 py-2.5 hover:bg-(--color-bg-cream) transition-colors border-b border-(--color-border) last:border-b-0"
                        >
                          <span className="text-(--color-text-muted) mt-0.5 flex-shrink-0">
                            <MapPinIcon />
                          </span>
                          <span className="text-xs text-(--color-text-body) leading-relaxed">
                            {s.display_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <StyledInput
                      name="city" value={formData.city} onChange={handleChange}
                      placeholder="Mumbai" required
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /><line x1="12" y1="12" x2="12" y2="17" /><line x1="9.5" y1="14.5" x2="14.5" y2="14.5" /></svg>}
                    />
                  </div>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <StyledInput
                      name="state" value={formData.state} onChange={handleChange}
                      placeholder="Maharashtra" required
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Pin Code</FieldLabel>
                    <StyledInput
                      name="zipCode" value={formData.zipCode} onChange={handleChange}
                      placeholder="400001" required
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>}
                    />
                  </div>
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <StyledInput
                      name="country" value={formData.country} disabled
                      icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Payment */}
            <div className="border-t border-(--color-border) pt-5 mt-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) mb-3">
                Payment Method
              </p>
              <div className="space-y-2.5">
                {availablePaymentMethods.includes("ccavenue") && (
                  <PaymentOption
                    label="Pay Online"
                    description="Credit card, debit card, UPI, net banking & more"
                    icon="💳"
                    selected={paymentMethod === "ccavenue"}
                    onSelect={() => handleSelectPayment("ccavenue")}
                  />
                )}
                {availablePaymentMethods.includes("razorpay") && (
                  <PaymentOption
                    label="Razorpay"
                    description="Credit card, debit card, UPI, net banking & more"
                    icon="⚡"
                    selected={paymentMethod === "razorpay"}
                    onSelect={() => handleSelectPayment("razorpay")}
                  />
                )}
                {availablePaymentMethods.includes("cod") && (
                  <PaymentOption
                    label="Cash on Delivery"
                    description="Pay in cash when your order arrives at your door"
                    icon="💵"
                    selected={paymentMethod === "cod"}
                    onSelect={() => handleSelectPayment("cod")}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="space-y-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-(--color-brand-primary) hover:bg-(--color-brand-primary-dark) text-white font-semibold text-[15px] transition-all duration-200 active:scale-[0.99] shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                <span>Processing your order…</span>
              </>
            ) : (
              <>
                <span>Proceed to Pay</span>
                <span className="font-bold opacity-60">·</span>
                <span className="font-bold">₹{totalAmount.toLocaleString("en-IN")}</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-5 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
              <ShieldIcon />Secure checkout
            </span>
            <span className="w-px h-3 bg-(--color-border)" />
            <span className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
              <LockIcon />256-bit SSL
            </span>
            <span className="w-px h-3 bg-(--color-border)" />
            <span className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted)">
              <TruckIcon />Free returns
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}