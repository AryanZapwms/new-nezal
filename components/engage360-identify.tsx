"use client"

// components/engage360-identify.tsx
//
// Tells Engage 360 who a signed-in customer is: once per customer per browser
// session, as soon as the session is known. Watching the session (rather than
// the login form) covers password and Google sign-ins alike, and customers
// who come back already signed in. Also keeps the signed-in first name that
// addtocart sends (lib/engage360.ts) in step with the session. Mounted once
// in app/layout.tsx; renders nothing.
//
// Sends email and name. The phone goes only with the customer's WhatsApp
// consent: the cart's whatsappConsent flag, and the number given with it
// (Cart.guestPhone, captured by components/whatsapp-discount-popup.tsx or
// components/checkout-form.tsx) — the same consent the WhatsApp reminders
// require. User.marketingConsent isn't used: nothing sets it to true.

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { engageIdentify, isEngageEnabled, setEngageSignedInName } from "@/lib/engage360"

function storageKey(customerKey: string) {
  return `engage360_identified_${customerKey}`
}

function alreadyIdentified(customerKey: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(customerKey)) !== null
  } catch {
    return false
  }
}

function markIdentified(customerKey: string) {
  try {
    sessionStorage.setItem(storageKey(customerKey), "1")
  } catch {}
}

async function fetchConsentedPhone(): Promise<string | null> {
  try {
    const res = await fetch("/api/cart")
    if (!res.ok) return null
    const cart = await res.json()
    return cart?.whatsappConsent === true && typeof cart.guestPhone === "string" ? cart.guestPhone : null
  } catch {
    return null
  }
}

export function Engage360Identify() {
  const { data: session, status } = useSession()
  const email = session?.user?.email
  const name = session?.user?.name
  // id is set by the session callback (app/api/auth/[...nextauth]/route.ts) but missing from NextAuth's type
  const customerKey = (session?.user as { id?: string } | undefined)?.id || email
  // Customer already being identified in this tab; also stops Strict Mode's
  // second effect run from fetching and sending twice
  const startedForRef = useRef<string | null>(null)

  // Signed in: addtocart carries the first name. Loading or signed out: none.
  useEffect(() => {
    setEngageSignedInName(status === "authenticated" ? name : null)
  }, [status, name])

  useEffect(() => {
    if (status !== "authenticated" || !customerKey || !isEngageEnabled()) return
    if (startedForRef.current === customerKey || alreadyIdentified(customerKey)) return
    startedForRef.current = customerKey

    fetchConsentedPhone().then((phone) => {
      engageIdentify({ email, fullName: name, phone })
      markIdentified(customerKey)
    })
  }, [status, customerKey, email, name])

  return null
}
