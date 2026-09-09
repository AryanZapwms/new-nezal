// app/api/webhooks/whatsapp/route.ts
//
// Register this URL once via ScaleChat's webhook API:
//   POST https://scalechat.in/api/v1/webhooks
//   { "url": "https://nezalherbocare.com/api/webhooks/whatsapp",
//     "events": ["message.received", "message.status", "contact.created"],
//     "headers": { "x-webhook-secret": "<WHATSAPP_WEBHOOK_SECRET value>" } }
//
// Auth: ScaleChat's docs don't document a request-signing scheme for webhook
// deliveries (I couldn't find one — worth double-checking their dashboard
// directly, since I can't browse it from here). Rather than invent a new
// mechanism, this reuses the exact shared-secret-header pattern already used
// for Shiprocket's webhook (app/api/webhooks/shipment-updates/route.ts):
// a custom header checked against an env var. This only works if ScaleChat's
// webhook config actually lets you attach a custom header to their outgoing
// calls — confirm that when registering. If it can't, this needs to move to
// a secret path segment or query param instead, and swap for real
// signature/HMAC verification if ScaleChat ever adds one.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { WhatsAppOptOut } from "@/lib/models/whatsapp-opt-out"

export async function POST(request: NextRequest) {
  const incomingSecret = request.headers.get("x-webhook-secret")
  if (incomingSecret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    console.warn("WhatsApp webhook: invalid or missing secret")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ScaleChat's docs don't show the exact envelope shape for webhook
  // deliveries — log the first few real payloads to confirm field names,
  // then tighten this switch accordingly.
  const eventType = payload.event ?? payload.type

  await connectDB()

  switch (eventType) {
    case "message.status": {
      // e.g. { event: "message.status", data: { phone, status: "delivered" | "read" | "failed", ... } }
      // Useful to track WhatsApp reminder delivery/read rate per cart if you
      // store a reference id when sending (consider adding a `reference_id`
      // param if ScaleChat supports it, or match by phone + recent timestamp).
      break
    }
    case "message.received": {
      // Inbound reply — e.g. customer replies "STOP" to opt out. Opt-out is
      // keyed purely by phone (lib/models/whatsapp-opt-out.ts), not by Cart
      // or User, so it survives a cart converting and a new one starting.
      const phone = payload.data?.phone
      const text = (payload.data?.message ?? "").trim().toLowerCase()
      if (phone && ["stop", "unsubscribe"].includes(text)) {
        // Incoming numbers arrive however ScaleChat/WhatsApp formats them
        // (typically with country code); everywhere else in the app stores
        // a bare 10-digit number (see sanitizePhone in app/api/orders/route.ts
        // and sanitizeGuestPhone in lib/cart-server.ts), so normalize to the
        // last 10 digits to match that same canonical form.
        const last10 = String(phone).replace(/\D/g, "").slice(-10)
        if (last10.length === 10) {
          await WhatsAppOptOut.updateOne(
            { phone: last10 },
            { $set: { phone: last10, optedOutAt: new Date() } },
            { upsert: true },
          )
        }
      }
      break
    }
    case "contact.created":
      break
  }

  return NextResponse.json({ received: true })
}
