"use client"

// components/profile-completion-nudge.tsx
//
// Google sign-in only ever gives us name + email — phone/address stay blank
// until either the customer fills them in manually or places an order
// (lib/syncUserContact.ts backfills them from the shipping address at that
// point). This nudges logged-in customers who haven't done either yet to
// add a phone number, so accounts don't sit permanently blank in
// /admin/users. Reuses the existing GET/PUT /api/users/profile endpoint —
// no new backend.
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Phone, X, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const DISMISS_KEY = "nezal-profile-nudge-dismissed"

interface ProfileData {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

function isValidPhone(value: string) {
  return /^\d{10}$/.test(value.replace(/\D/g, ""))
}

export function ProfileCompletionNudge() {
  const { status } = useSession()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [visible, setVisible] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (status !== "authenticated" || checked) return
    setChecked(true)

    // Dismissed for this browser session — don't nag again until they come
    // back later (sessionStorage clears when the tab/browser closes).
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) return

    fetch("/api/users/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error && !data.phone) {
          setProfile(data)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [status, checked])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, "1")
  }

  const handleSave = async () => {
    if (!profile) return
    const trimmed = phoneInput.trim()
    if (!isValidPhone(trimmed)) {
      toast({ title: "Enter a valid 10-digit phone number", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      // Send the whole profile back, not just phone — the PUT endpoint
      // replaces the address subdocument wholesale, so omitting existing
      // fields here would wipe out an address already saved from a
      // previous order.
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, phone: trimmed }),
      })
      if (!res.ok) throw new Error("Failed to save")

      toast({ title: "Phone number saved", description: "Thanks — we'll use this to reach you about your orders." })
      dismiss()
    } catch {
      toast({ title: "Couldn't save your number", description: "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!visible || !profile) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="bg-green-50 p-2 rounded-lg shrink-0">
            <Phone className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Add your phone number</p>
            <p className="text-xs text-gray-500 mt-0.5">So we can reach you about your orders and offers.</p>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSave()
              }
            }}
            placeholder="10-digit phone number"
            className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
