// app/admin/settings/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CreditCard, Banknote, Landmark, Wallet, Info, CheckCircle2, AlertCircle, Loader2, Truck,
} from "lucide-react"

interface PaymentSettings {
  _id?: string
  enableCOD: boolean
  enableRazorpay: boolean
  enableCCAvenue: boolean
  minCODAmount: number
  maxCODAmount: number
  freeShippingEnabled: boolean
  freeShippingThreshold: number
  codFeeEnabled: boolean
  codFeeType: "flat" | "percentage"
  codFeeValue: number
  codFeeMin: number
  useRealTimeCodCharge: boolean 
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [settings, setSettings] = useState<PaymentSettings>({
  enableCOD: true,
  enableRazorpay: false,
  enableCCAvenue: true,
  minCODAmount: 0,
  maxCODAmount: 100000,
  freeShippingEnabled: false,
  freeShippingThreshold: 0,
  codFeeEnabled: false,
  codFeeType: "flat",
  codFeeValue: 0,
  codFeeMin: 0,
  useRealTimeCodCharge: false, 
})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    if ((session.user as any)?.role !== "admin") {
      router.push("/")
      return
    }

    fetchSettings()
  }, [session, router])

  const fetchSettings = async () => {
  setLoading(true)
  try {
    const res = await fetch("/api/admin/payment-settings")
    if (res.ok) {
      const data = await res.json()
      setSettings((prev) => ({ ...prev, ...data }))   // ← merge, don't replace
    }
  } catch (error) {
    console.error("Error fetching settings:", error)
    setMessage("error:Error loading settings")
  } finally {
    setLoading(false)
  }
}

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        setMessage("success:Settings saved successfully!")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("error:Error saving settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setMessage("error:Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  const isSuccess = message.startsWith("success:")
  const isError = message.startsWith("error:")
  const displayMessage = message.replace(/^(success|error):/, "")

  const noMethodEnabled = !settings.enableCOD && !settings.enableRazorpay && !settings.enableCCAvenue

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Choose which payment methods customers can use at checkout.</p>
          </div>
        </div>

        {/* ── Payment methods card ─────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">Payment methods</h2>
            <p className="text-xs text-gray-500 mt-0.5">Toggle a method on to make it available at checkout.</p>
          </div>

          <div className="p-6 space-y-3">

            {/* CCAvenue */}
            <div className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
              settings.enableCCAvenue ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50"
            }`}>
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <Label htmlFor="ccavenue" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  CCAvenue (Pay Online)
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Credit card, debit card, UPI, net banking &amp; more via CCAvenue
                </p>
              </div>
              <Switch
                id="ccavenue"
                checked={settings.enableCCAvenue}
                onCheckedChange={(checked) => handleChange("enableCCAvenue", checked)}
              />
            </div>

            {/* Razorpay */}
            <div className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
              settings.enableRazorpay ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50"
            }`}>
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <Label htmlFor="razorpay" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  Razorpay
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Online payment gateway for credit/debit cards and UPI
                </p>
              </div>
              <Switch
                id="razorpay"
                checked={settings.enableRazorpay}
                onCheckedChange={(checked) => handleChange("enableRazorpay", checked)}
              />
            </div>

            {/* COD */}
            <div className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
              settings.enableCOD ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50"
            }`}>
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <Label htmlFor="cod" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  Cash on Delivery (COD)
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allow customers to pay when they receive their order
                </p>
              </div>
              <Switch
                id="cod"
                checked={settings.enableCOD}
                onCheckedChange={(checked) => handleChange("enableCOD", checked)}
              />
            </div>

{settings.enableCOD && (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-1">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <Banknote className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          COD handling charge
        </span>
      </div>
      <Switch
        id="codFee"
        checked={settings.codFeeEnabled}
        onCheckedChange={(checked) => handleChange("codFeeEnabled", checked)}
      />
    </div>
    <p className="text-xs text-gray-400 mb-3">
      Passed on to the customer at checkout to cover courier COD collection costs.
    </p>

    {settings.codFeeEnabled && (
      <div className="space-y-4">

        {/* Real-time vs static toggle */}
        <div className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
          settings.useRealTimeCodCharge ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-white"
        }`}>
          <div className="flex-1 min-w-0">
            <Label htmlFor="realTimeCod" className="text-xs font-semibold text-gray-900 cursor-pointer">
              Use real-time Shiprocket COD charge
            </Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Charges the exact COD fee Shiprocket quotes per shipment (based on weight &amp; distance) instead of a fixed amount below.
            </p>
          </div>
          <Switch
            id="realTimeCod"
            checked={settings.useRealTimeCodCharge}
            onCheckedChange={(checked) => handleChange("useRealTimeCodCharge", checked)}
          />
        </div>

        {settings.useRealTimeCodCharge ? (
          <p className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
            The fixed amount/percentage fields below are disabled while real-time charging is on — each COD order will be charged whatever Shiprocket quotes for that specific shipment.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange("codFeeType", "flat")}
                className={`flex-1 text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
                  settings.codFeeType === "flat"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                Flat amount (₹)
              </button>
              <button
                type="button"
                onClick={() => handleChange("codFeeType", "percentage")}
                className={`flex-1 text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
                  settings.codFeeType === "percentage"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                Percentage of order
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  {settings.codFeeType === "flat" ? "Fee amount (₹)" : "Fee percentage (%)"}
                </label>
                <Input
                  type="number"
                  value={settings.codFeeValue}
                  onChange={(e) => handleChange("codFeeValue", Number(e.target.value))}
                  min={0}
                  step={settings.codFeeType === "percentage" ? 0.1 : 1}
                  className="bg-white"
                />
              </div>
              {settings.codFeeType === "percentage" && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Minimum fee (₹)</label>
                  <Input
                    type="number"
                    value={settings.codFeeMin}
                    onChange={(e) => handleChange("codFeeMin", Number(e.target.value))}
                    min={0}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Fee never drops below this, even on small orders.</p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {settings.codFeeType === "flat"
                ? `Every COD order is charged ₹${settings.codFeeValue || 0} extra.`
                : `Every COD order is charged ${settings.codFeeValue || 0}% of the order value, minimum ₹${settings.codFeeMin || 0}.`}
            </p>
          </>
        )}
      </div>
    )}
  </div>
)}

            {noMethodEnabled && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> At least one payment method needs to be enabled.
              </p>
            )}
          </div>

          {/* Footer: message + save */}
          <div className="px-6 pb-6 space-y-4">
            {message && (
              <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm ${
                isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {displayMessage}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 flex-wrap border-t border-gray-100 pt-5">
              <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3.5 py-2.5 max-w-md">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>At least one payment method must be enabled for customers to make purchases.</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-700 hover:bg-emerald-800 min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Free shipping card ───────────────────────────── */}
<div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
    <h2 className="font-semibold text-gray-900">Free shipping</h2>
    <p className="text-xs text-gray-500 mt-0.5">
      Waive shipping charges once a customer's order crosses a set amount.
    </p>
  </div>

  <div className="p-6 space-y-4">
    <div className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
      settings.freeShippingEnabled ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50"
    }`}>
      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
        <Truck className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <Label htmlFor="freeShipping" className="text-sm font-semibold text-gray-900 cursor-pointer">
          Enable free shipping
        </Label>
        <p className="text-xs text-gray-500 mt-0.5">
          Shipping is waived once the order subtotal (after coupon) meets the threshold below
        </p>
      </div>
      <Switch
        id="freeShipping"
        checked={settings.freeShippingEnabled}
        onCheckedChange={(checked) => handleChange("freeShippingEnabled", checked)}
      />
    </div>

    {settings.freeShippingEnabled && (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
          Free shipping threshold (₹)
        </label>
        <Input
          type="number"
          value={settings.freeShippingThreshold}
          onChange={(e) => handleChange("freeShippingThreshold", Number(e.target.value))}
          min={0}
          className="bg-white max-w-xs"
        />
        <p className="text-xs text-gray-400 mt-1">
          Orders of ₹{settings.freeShippingThreshold || 0} or more get free shipping.
        </p>
      </div>
    )}
  </div>
</div>
      </div>
    </main>
  )
}