// lib/meta-capi.ts
// Server-side Meta Conversions API — sends events directly to Meta,
// independent of the browser (ad blockers / Safari ITP can't stop this).
// Uses the same NEXT_PUBLIC_META_PIXEL_ID as the browser pixel, plus a
// server-only access token, so events land on the same pixel/dataset.
//
// Every event carries an event_id that the browser pixel sends too, as
// fbq(..., { eventID }), so Meta keeps one of the two and drops the other.
import crypto from "crypto"
import type { NextRequest } from "next/server"

const API_VERSION = "v21.0"

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

// ── Normalisation ─────────────────────────────────────────────────────────
// Meta only matches hashed customer data normalised exactly as described in
// its customer information parameters docs, so each field is normalised
// before hashing.

/** Digits only, no leading zeros, with a country code: 10-digit Indian numbers get 91. */
export function normalizePhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "")
  if (digits.length === 10) return `91${digits}`
  return digits.length > 10 ? digits : undefined
}

/** Lowercase two-letter ISO 3166-1 code, e.g. "India" or "IN" become "in". */
export function normalizeCountry(country: string): string | undefined {
  const value = country.trim().toLowerCase()
  if (/^[a-z]{2}$/.test(value)) return value
  return value === "india" || value === "bharat" ? "in" : undefined
}

/** City and state: lowercase with no spaces, punctuation or special characters. */
export function normalizePlace(place: string): string | undefined {
  return place.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") || undefined
}

function normalizeText(value: string): string | undefined {
  return value.trim().toLowerCase() || undefined
}

export interface CapiUserData {
  email?: string
  phone?: string
  fullName?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
}

/** Meta's user_data: hashed, normalised customer fields plus the unhashed browser identifiers. */
export function buildCapiUserData(user: CapiUserData): Record<string, any> {
  const hashed = (value: string | undefined) => (value ? [sha256(value)] : undefined)
  const [firstName, ...rest] = user.fullName?.trim().split(/\s+/) ?? []

  const userData: Record<string, any> = {
    em: hashed(user.email && normalizeText(user.email)),
    ph: hashed(user.phone && normalizePhone(user.phone)),
    fn: hashed(firstName && normalizeText(firstName)),
    ln: hashed(rest.length ? normalizeText(rest.join(" ")) : undefined),
    ct: hashed(user.city && normalizePlace(user.city)),
    st: hashed(user.state && normalizePlace(user.state)),
    zp: hashed(user.zip && user.zip.replace(/\s/g, "").toLowerCase()),
    country: hashed(user.country && normalizeCountry(user.country)),
    client_ip_address: user.clientIp,
    client_user_agent: user.userAgent,
    fbp: user.fbp,
    fbc: user.fbc,
  }
  for (const key of Object.keys(userData)) if (userData[key] === undefined) delete userData[key]
  return userData
}

// ── Request context ───────────────────────────────────────────────────────

export interface RequestMeta {
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  eventSourceUrl?: string
}

interface HeaderReader {
  get(name: string): string | null
}
interface CookieReader {
  get(name: string): { value: string } | undefined
}

/**
 * IP, user agent and Meta's browser cookies from the customer's request. Takes
 * a route handler's request.headers/request.cookies, or a Server Component's
 * headers()/cookies().
 */
export function getRequestMetaFrom(headers: HeaderReader, cookies: CookieReader): RequestMeta {
  const clientIp =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  return {
    clientIp,
    userAgent: headers.get("user-agent") || undefined,
    fbp: cookies.get("_fbp")?.value,
    fbc: cookies.get("_fbc")?.value,
    eventSourceUrl: headers.get("referer") || undefined,
  }
}

/** Pulls IP / user-agent / Meta browser cookies off an incoming request for match quality. */
export function getRequestMeta(request: NextRequest): RequestMeta {
  return getRequestMetaFrom(request.headers, request.cookies)
}

// ── Events ────────────────────────────────────────────────────────────────

/** One line of an event's contents; `id` is the product's Mongo _id, as in the catalog feed. */
export interface CapiContent {
  id: string
  quantity: number
  item_price: number
}

const toValue = (amount: number) => Math.round(amount * 100) / 100

/** custom_data fields describing the products in an event. */
function contentsData(contents: CapiContent[]) {
  return {
    content_type: "product",
    content_ids: [...new Set(contents.map((item) => item.id))],
    contents: contents.map((item) => ({ ...item, item_price: toValue(item.item_price) })),
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
  }
}

export interface CapiEventParams {
  eventName: string
  /** Must match the `eventID` the browser pixel sends for the same event, for dedup */
  eventId: string
  eventSourceUrl?: string
  user: CapiUserData
  customData: Record<string, unknown>
}

/** Sends one website event. Never throws: failures are logged. */
export async function sendCapiEvent(params: CapiEventParams): Promise<void> {
  const { eventName, eventId, eventSourceUrl, user, customData } = params
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  // Set temporarily to the code shown in Events Manager → Test Events: server
  // events only appear there when they carry it. Remove it after testing.
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE

  if (!pixelId || !accessToken) {
    console.error(
      `[meta-capi] Skipping ${eventName} event ${eventId} — missing ` +
      `${!pixelId ? "NEXT_PUBLIC_META_PIXEL_ID" : "META_CAPI_ACCESS_TOKEN"}`
    )
    return
  }

  try {
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: buildCapiUserData(user),
          custom_data: customData,
        },
      ],
      ...(testEventCode && { test_event_code: testEventCode }),
      access_token: accessToken,
    }

    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const responseBody = await res.text()

    if (!res.ok) {
      console.error(
        `[meta-capi] ${eventName} event REJECTED for ${eventId} — pixel ${pixelId}, status ${res.status}:`,
        responseBody
      )
    } else {
      console.log(
        `[meta-capi] ${eventName} event sent for ${eventId} — pixel ${pixelId}, value ${customData.value} ${customData.currency}:`,
        responseBody
      )
    }
  } catch (err) {
    console.error(`[meta-capi] ${eventName} event request FAILED for ${eventId}:`, err)
  }
}

export interface CapiPurchaseParams {
  /** Must match the `eventID` passed to fbq('track', 'Purchase', ..., { eventID }) client-side for dedup */
  eventId: string
  value: number
  currency?: string
  contents: CapiContent[]
  eventSourceUrl?: string
  user: CapiUserData
}

export function sendCapiPurchaseEvent(params: CapiPurchaseParams): Promise<void> {
  const { eventId, value, currency = "INR", contents, eventSourceUrl, user } = params
  return sendCapiEvent({
    eventName: "Purchase",
    eventId,
    eventSourceUrl,
    user,
    customData: { currency, value: toValue(value), ...contentsData(contents) },
  })
}

export interface CapiInitiateCheckoutParams {
  /** Must match the `eventID` passed to fbq('track', 'InitiateCheckout', ..., { eventID }) */
  eventId: string
  value: number
  contents: CapiContent[]
  eventSourceUrl?: string
  user: CapiUserData
}

export function sendCapiInitiateCheckoutEvent(params: CapiInitiateCheckoutParams): Promise<void> {
  const { eventId, value, contents, eventSourceUrl, user } = params
  return sendCapiEvent({
    eventName: "InitiateCheckout",
    eventId,
    eventSourceUrl,
    user,
    customData: { currency: "INR", value: toValue(value), ...contentsData(contents) },
  })
}
