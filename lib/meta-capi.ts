// lib/meta-capi.ts
// Server-side Meta Conversions API — sends Purchase events directly to Meta,
// independent of the browser (ad blockers / Safari ITP can't stop this).
// Uses the same NEXT_PUBLIC_META_PIXEL_ID as the browser pixel, plus a
// server-only access token, so events land on the same pixel/dataset.
import crypto from "crypto"
import type { NextRequest } from "next/server"

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const API_VERSION = "v21.0"

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function normalizePhone(phone: string): string {
  // Meta expects digits only (with country code), no +/spaces/dashes
  return phone.replace(/[^\d]/g, "")
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

export interface CapiPurchaseParams {
  /** Must match the `eventID` passed to fbq('track', 'Purchase', ..., { eventID }) client-side for dedup */
  eventId: string
  value: number
  currency?: string
  contentIds?: string[]
  numItems?: number
  eventSourceUrl?: string
  user: CapiUserData
}

/** Pulls IP / user-agent / Meta browser cookies off an incoming request for match quality. */
export function getRequestMeta(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  const userAgent = request.headers.get("user-agent") || undefined
  const fbp = request.cookies.get("_fbp")?.value
  const fbc = request.cookies.get("_fbc")?.value
  const eventSourceUrl = request.headers.get("referer") || undefined
  return { clientIp, userAgent, fbp, fbc, eventSourceUrl }
}

export async function sendCapiPurchaseEvent(params: CapiPurchaseParams): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("[meta-capi] Skipping Purchase event — NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not configured")
    return
  }

  const { eventId, value, currency = "INR", contentIds, numItems, eventSourceUrl, user } = params

  const user_data: Record<string, any> = {}
  if (user.email) user_data.em = [sha256(user.email)]
  if (user.phone) user_data.ph = [sha256(normalizePhone(user.phone))]
  if (user.fullName) {
    const [firstName, ...rest] = user.fullName.trim().split(/\s+/)
    if (firstName) user_data.fn = [sha256(firstName)]
    if (rest.length) user_data.ln = [sha256(rest.join(" "))]
  }
  if (user.city) user_data.ct = [sha256(user.city)]
  if (user.state) user_data.st = [sha256(user.state)]
  if (user.zip) user_data.zp = [sha256(user.zip)]
  if (user.country) user_data.country = [sha256(user.country)]
  if (user.clientIp) user_data.client_ip_address = user.clientIp
  if (user.userAgent) user_data.client_user_agent = user.userAgent
  if (user.fbp) user_data.fbp = user.fbp
  if (user.fbc) user_data.fbc = user.fbc

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data,
        custom_data: {
          currency,
          value,
          content_type: "product",
          ...(contentIds && { content_ids: contentIds }),
          ...(numItems !== undefined && { num_items: numItems }),
        },
      },
    ],
    access_token: ACCESS_TOKEN,
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error("[meta-capi] Purchase event rejected:", res.status, await res.text())
    }
  } catch (err) {
    console.error("[meta-capi] Purchase event request failed:", err)
  }
}
