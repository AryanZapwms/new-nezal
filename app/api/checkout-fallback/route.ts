// app/api/checkout-fallback/route.ts
//
// Receives the report hooks/use-shiprocket-checkout.ts sends (with
// navigator.sendBeacon) whenever a checkout falls back from the Shiprocket
// widget to our own /checkout page, and writes it to the server log as one
// line: grep "[checkout-fallback]" in the PM2 error log. Nothing is stored in
// the database.
//
// sendBeacon posts the JSON as text/plain, so the body is read as text. Only
// the expected fields are logged, each capped in size, so junk requests
// can't flood the log.

import { type NextRequest, NextResponse } from "next/server"

const MAX_BODY_CHARS = 8000
const MAX_STRING_CHARS = 500
const MAX_ITEMS = 20

const str = (value: unknown) => (typeof value === "string" ? value.slice(0, MAX_STRING_CHARS) : null)
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null)

export async function POST(request: NextRequest) {
  const text = await request.text().catch(() => "")
  if (!text || text.length > MAX_BODY_CHARS) {
    return new NextResponse(null, { status: 400 })
  }

  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const connection = body?.connection && typeof body.connection === "object" ? body.connection : null

  console.warn(
    "[checkout-fallback]",
    JSON.stringify({
      at: new Date().toISOString(),
      reason: str(body?.reason),
      status: num(body?.status),
      message: str(body?.message),
      items: Array.isArray(body?.items)
        ? body.items.slice(0, MAX_ITEMS).map((item: any) => ({
            productId: str(item?.productId),
            quantity: num(item?.quantity),
            size: str(item?.selectedSize?.size),
            sku: str(item?.selectedSize?.sku),
          }))
        : null,
      pageUrl: str(body?.pageUrl),
      msSinceLoad: num(body?.msSinceLoad),
      waitedMs: num(body?.waitedMs),
      scriptTagPresent: typeof body?.scriptTagPresent === "boolean" ? body.scriptTagPresent : null,
      userAgent: str(body?.userAgent),
      connection: connection
        ? {
            effectiveType: str(connection.effectiveType),
            downlink: num(connection.downlink),
            rtt: num(connection.rtt),
            saveData: connection.saveData === true,
          }
        : null,
    })
  )

  return new NextResponse(null, { status: 204 })
}
