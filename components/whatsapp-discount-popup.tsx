"use client"

// components/whatsapp-discount-popup.tsx
//
// Cart-page-only popup that captures phone + explicit WhatsApp consent from
// ANY visitor (guest or logged-in — unlike profile-completion-nudge.tsx,
// this is NOT gated on useSession status) in exchange for a one-time
// discount. This is what closes the "guest reach" gap for WhatsApp cart
// recovery: checkout-form.tsx's consent checkbox only ever sees logged-in
// traffic, since checkout is currently login-gated.
//
// Styled to match app/cart/page.tsx's own conventions (shadcn Card/Button,
// semantic tokens: bg-card, text-foreground, text-muted-foreground,
// border-border, bg-primary/text-primary-foreground) rather than
// checkout-form.tsx's hand-rolled --color-brand-primary style — this popup
// only lives on the cart page, so it should look like the cart page.
//
// Positioned bottom-4 LEFT-4 (not right-4, matching
// profile-completion-nudge.tsx) deliberately: that nudge is mounted
// globally in app/layout.tsx and can also be showing on this exact page for
// a logged-in, no-phone visitor. Opposite corners avoid the two stacking on
// top of each other.
import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store/cart-store"
import { Button } from "@/components/ui/button"
import { Gift, X, Check, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const DISMISS_KEY = "nezal-whatsapp-discount-dismissed"

function isValidPhone(value: string) {
  return /^\d{10}$/.test(value.replace(/\D/g, ""))
}

export function WhatsAppDiscountPopup() {
  const { items } = useCartStore()
  const { toast } = useToast()

  const [checkedServer, setCheckedServer] = useState(false)
  const [visible, setVisible] = useState(false)
  const [phone, setPhone] = useState("")
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [claim, setClaim] = useState<{ code: string; discountValue: number; alreadyClaimed: boolean } | null>(null)

  useEffect(() => {
    if (checkedServer) return
    if (items.length === 0) return
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) return

    setCheckedServer(true)

    // Server is the source of truth for whatsappConsent (not local state) —
    // a visitor who already consented on a previous visit, or via
    // checkout-form.tsx while logged in, shouldn't see this again.
    fetch("/api/cart")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.whatsappConsent) {
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [checkedServer, items.length])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, "1")
  }

  const handleClaim = async () => {
    if (!isValidPhone(phone) || !consent) return
    setSaving(true)
    try {
      const res = await fetch("/api/cart/claim-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, whatsappConsent: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to claim discount")

      setClaim({ code: data.code, discountValue: data.discountValue, alreadyClaimed: data.alreadyClaimed })
      sessionStorage.setItem(DISMISS_KEY, "1") // claimed — no need to keep offering it this session
    } catch (err) {
      toast({
        title: "Couldn't claim your discount",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const copyCode = async () => {
    if (!claim) return
    try {
      await navigator.clipboard.writeText(claim.code)
      toast({ title: "Code copied", description: claim.code })
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the code
      // is already visible on screen either way, so this is non-fatal.
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {claim ? (claim.alreadyClaimed ? "Welcome back!" : "You're all set!") : "Get 10% off"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {claim
                ? claim.alreadyClaimed
                  ? "You've already claimed this offer — here's your code again."
                  : "Use this code at checkout."
                : "Just drop your WhatsApp number to unlock a one-time discount."}
            </p>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        {claim ? (
          <button
            onClick={copyCode}
            className="mt-3 w-full flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-left"
          >
            <span className="font-mono text-sm font-bold text-primary">{claim.code}</span>
            <span className="flex items-center gap-1 text-xs text-primary shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copy
            </span>
          </button>
        ) : (
          <>
            <div className="mt-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit WhatsApp number"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <label className="flex items-start gap-2.5 mt-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Send me order updates and offers on WhatsApp
              </span>
            </label>

            <Button
              onClick={handleClaim}
              disabled={saving || !isValidPhone(phone) || !consent}
              className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" /> Claim my discount
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
