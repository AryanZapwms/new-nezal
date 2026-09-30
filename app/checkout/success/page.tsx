// app/checkout/success/page.tsx
//
// Customer-facing redirect target after a Shiprocket Custom Checkout
// session — Shiprocket redirects here with ?oid=...&ost=... per their
// Success Redirect docs.
//
// What's shown is decided ONLY by our server-side Order state, never by the
// ?ost= query param (anyone can type ost=SUCCESS). The order normally
// arrives via app/api/shiprocket/order-webhook/[secret]/route.ts; if it
// hasn't, this page pulls it from Shiprocket's Checkout API and upserts it
// through the same shared function (lib/shiprocket-checkout-order.ts), so a
// late webhook can't create a duplicate.
//
// Polling is a server-rendered <meta refresh> with an attempt counter in the
// URL, capped at MAX_ATTEMPTS — after that it stops and tells the customer
// we'll email them, rather than spinning forever.
//
// Server Component: `oid` is Shiprocket's id, not our Order._id, so this
// can't reuse GET /api/orders/[id] (which also needs a session — Shiprocket
// checkout customers are commonly guests). The exposure (knowing the id is
// enough to view the confirmation) matches app/order-success/[id] for
// guest orders.
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, XCircle, Clock3, Package, ArrowRight, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import "@/lib/models/product"
import { BRAND } from "@/lib/config"
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success"
import { isCheckoutOrderConfirmed, syncShiprocketCheckoutOrderFromApi } from "@/lib/shiprocket-checkout-order"
import { cookies } from "next/headers"
import { CART_TOKEN_COOKIE, convertCartForOffsiteOrder, resolveCartIdentityFromGuestToken } from "@/lib/cart-server"

export const dynamic = "force-dynamic"

const MAX_ATTEMPTS = 10
const REFRESH_SECONDS = 3

// Shiprocket's ids are hex/alphanumeric; anything else is junk that
// shouldn't reach the DB query or Shiprocket's API.
const OID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

async function findOrderByShiprocketId(oid: string) {
  await connectDB()

  const numericOid = Number(oid)
  const or: Record<string, any>[] = [{ shiprocketPlatformOrderId: oid }]
  if (Number.isFinite(numericOid)) or.push({ paymentMethod: "shiprocket_checkout", shiprocketOrderId: numericOid })

  return Order.findOne({ $or: or })
    .populate({ path: "items.product", select: "name image" })
    .lean() as Promise<any>
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ oid?: string; ost?: string; attempt?: string }>
}) {
  const { oid: rawOid, ost, attempt: rawAttempt } = await searchParams
  const oid = rawOid && OID_PATTERN.test(rawOid) ? rawOid : null
  const attempt = Math.min(Math.max(Number.parseInt(rawAttempt ?? "1", 10) || 1, 1), MAX_ATTEMPTS)

  if (!oid) return <PaymentNotCompleted ost={ost} />

  let order = await findOrderByShiprocketId(oid)

  // Not here yet, or here but not confirmed (e.g. prepaid still pending):
  // ask Shiprocket directly. Throttled per oid inside the helper.
  if (!isCheckoutOrderConfirmed(order) && order?.paymentStatus !== "failed") {
    const synced = await syncShiprocketCheckoutOrderFromApi(oid)
    if (synced) order = await findOrderByShiprocketId(oid)
  }

  if (isCheckoutOrderConfirmed(order)) {
    // Convert the server-side cart mirror BEFORE rendering: otherwise
    // components/cart-hydrator.tsx re-fetches the still-active server cart
    // right after ClearCartOnSuccess empties the local one, and adopts it
    // back (the "cart badge still shows 1" bug).
    try {
      const identity = await resolveCartIdentityFromGuestToken((await cookies()).get(CART_TOKEN_COOKIE)?.value || null)
      await convertCartForOffsiteOrder(identity, order._id, order.createdAt)
    } catch (err) {
      console.error("[checkout-success] Failed to convert server cart:", err)
    }
    return <OrderConfirmed order={order} />
  }

  if (order?.paymentStatus === "failed") return <PaymentNotCompleted ost="FAILED" />

  // No verified order yet. A non-success ost is trusted only in the
  // NEGATIVE direction — worst case the customer sees "try again" for an
  // order that later arrives and gets emailed to them.
  if (!order && ost !== "SUCCESS") return <PaymentNotCompleted ost={ost} />

  if (attempt >= MAX_ATTEMPTS) return <ConfirmationDelayed oid={oid} />

  const nextHref = `/checkout/success?oid=${encodeURIComponent(oid)}&ost=${encodeURIComponent(ost ?? "")}&attempt=${attempt + 1}`
  return <Confirming nextHref={nextHref} />
}

const PAGE_BG = { backgroundColor: "#f7faf7" }

function StatusIcon({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
      style={{ backgroundColor: tone === "ok" ? "#e0f0e4" : "#fbe6e6" }}
    >
      {children}
    </div>
  )
}

function ContinueShoppingButton() {
  return (
    <Link href="/shop" className="block">
      <Button variant="outline" className="w-full py-5 rounded-xl text-base font-semibold" style={{ borderColor: "#1e3a28", color: "#1e3a28" }}>
        Continue shopping
      </Button>
    </Link>
  )
}

// ── Payment not successful (failed / cancelled / unknown status) ─────────
function PaymentNotCompleted({ ost }: { ost?: string }) {
  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto text-center">
        <StatusIcon tone="bad">
          <XCircle className="w-11 h-11" style={{ color: "#b91c1c" }} strokeWidth={2} />
        </StatusIcon>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
          Payment wasn't completed
        </h1>
        <p className="text-sm lg:text-base mb-8" style={{ color: "#6b7c70" }}>
          {ost && ost !== "SUCCESS"
            ? `Your payment status came back as "${ost}". Your cart is still saved — you can try again.`
            : "We didn't receive a successful payment confirmation. Your cart is still saved — you can try again."}
        </p>
        <div className="space-y-3 max-w-xs mx-auto">
          <Link href="/cart" className="block">
            <Button className="w-full py-5 rounded-xl text-base font-semibold" style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}>
              Return to cart
            </Button>
          </Link>
          <ContinueShoppingButton />
        </div>
      </div>
    </main>
  )
}

// ── Waiting for the order (webhook or Shiprocket pull) ────────────────────
function Confirming({ nextHref }: { nextHref: string }) {
  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={PAGE_BG}>
      {/* Server-rendered auto-retry; the attempt counter in nextHref caps it */}
      <meta httpEquiv="refresh" content={`${REFRESH_SECONDS};url=${nextHref}`} />
      <div className="max-w-2xl mx-auto text-center">
        <StatusIcon tone="ok">
          <Clock3 className="w-11 h-11 animate-pulse" style={{ color: "#1e6636" }} strokeWidth={2} />
        </StatusIcon>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
          Confirming your order...
        </h1>
        <p className="text-sm lg:text-base mb-8" style={{ color: "#6b7c70" }}>
          We're confirming your order with our checkout partner. This usually takes a few seconds.
          This page will refresh automatically.
        </p>
        <div className="space-y-3 max-w-xs mx-auto">
          <a href={nextHref} className="block">
            <Button className="w-full py-5 rounded-xl text-base font-semibold" style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}>
              Refresh now
            </Button>
          </a>
          <ContinueShoppingButton />
        </div>
      </div>
    </main>
  )
}

// ── Polling exhausted — stop spinning, hand off to email/support ──────────
function ConfirmationDelayed({ oid }: { oid: string }) {
  const phoneDisplay = BRAND.phone.replace(/^\+91/, "+91 ")
  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={PAGE_BG}>
      <div className="max-w-2xl mx-auto text-center">
        <StatusIcon tone="ok">
          <Mail className="w-11 h-11" style={{ color: "#1e6636" }} strokeWidth={2} />
        </StatusIcon>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
          Payment received — we'll email your confirmation shortly
        </h1>
        <p className="text-sm lg:text-base mb-6" style={{ color: "#6b7c70" }}>
          Your order is taking a little longer than usual to confirm. You don't need to pay again —
          your confirmation email will arrive as soon as it's processed.
        </p>

        <div className="rounded-2xl border p-5 mb-6 text-left" style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#6b7c70" }}>Checkout reference (quote this if you contact us)</p>
          <p className="font-mono font-bold text-sm break-all mb-4" style={{ color: "#1e3a28" }}>{oid}</p>
          <p className="text-sm font-semibold mb-2" style={{ color: "#1e3a28" }}>Need help?</p>
          <a href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`Order confirmation — ${oid}`)}`} className="flex items-center gap-2 text-sm mb-2" style={{ color: "#1e6636" }}>
            <Mail className="w-4 h-4" /> {BRAND.supportEmail}
          </a>
          <a href={`tel:${BRAND.phone}`} className="flex items-center gap-2 text-sm" style={{ color: "#1e6636" }}>
            <Phone className="w-4 h-4" /> {phoneDisplay}
          </a>
        </div>

        <div className="max-w-xs mx-auto">
          <ContinueShoppingButton />
        </div>
      </div>
    </main>
  )
}

// ── Verified, confirmed order ─────────────────────────────────────────────
function OrderConfirmed({ order }: { order: any }) {
  const items: any[] = order.items || []
  const itemCount = items.length
  const customerEmail = order.guestEmail || order.shippingAddress?.email
  const isCod = order.shiprocketPaymentType === "cod" && order.paymentStatus !== "completed"

  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={PAGE_BG}>
      <ClearCartOnSuccess />
      <div className="max-w-2xl mx-auto">
        {/* ── Success header ─────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative"
            style={{ backgroundColor: "#e0f0e4" }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ backgroundColor: "#2a5c3a", animationDuration: "2s", animationIterationCount: "2" }}
            />
            <CheckCircle2 className="w-11 h-11 relative" style={{ color: "#1e6636" }} strokeWidth={2} />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
            Order placed successfully!
          </h1>
          <p className="text-sm lg:text-base" style={{ color: "#6b7c70" }}>
            {isCod
              ? "Thank you for shopping with us — your order is confirmed. Please keep the amount ready for payment on delivery."
              : "Thank you for shopping with us — your order has been confirmed."}
          </p>
        </div>

        {/* ── Order ID card ──────────────────────────────── */}
        <div
          className="rounded-2xl border p-5 mb-5"
          style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "#6b7c70" }}>Order ID</p>
          <p className="font-mono font-bold text-lg" style={{ color: "#1e3a28" }}>{order.orderNumber}</p>
        </div>

        {/* ── Order summary ──────────────────────────────── */}
        {itemCount > 0 && (
          <div
            className="rounded-2xl border p-5 mb-5"
            style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4" style={{ color: "#1e3a28" }} />
              <h2 className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
                Order summary · {itemCount} item{itemCount !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="space-y-3">
              {items.slice(0, 4).map((item, idx) => {
                const image = item.product?.image
                const name = item.product?.name || `Item ${idx + 1}`
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg overflow-hidden border shrink-0 relative bg-gray-50"
                      style={{ borderColor: "#dde8de" }}
                    >
                      {image ? (
                        <Image src={image} alt={name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1e3a28" }}>{name}</p>
                      <p className="text-xs" style={{ color: "#9cad9e" }}>
                        Qty {item.quantity || 1}
                        {item.selectedSize ? ` · ${item.selectedSize.size}${item.selectedSize.unit ?? ""}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold shrink-0" style={{ color: "#1e3a28" }}>
                      ₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                    </p>
                  </div>
                )
              })}
              {itemCount > 4 && (
                <p className="text-xs text-center pt-1" style={{ color: "#9cad9e" }}>
                  +{itemCount - 4} more item{itemCount - 4 !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: "#e8f0e9" }}>
              <span className="text-sm font-medium" style={{ color: "#6b7c70" }}>
                {isCod ? "To pay on delivery" : "Total paid"}
              </span>
              <span className="text-lg font-bold" style={{ color: "#1e3a28" }}>
                ₹{(order.totalAmount || 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* ── Confirmation email note ─────────────────────── */}
        <div
          className="rounded-2xl border p-4 mb-6 text-center"
          style={{ backgroundColor: "#ffffff", borderColor: "#dde8de" }}
        >
          <p className="text-xs font-semibold" style={{ color: "#1e3a28" }}>Confirmation email</p>
          <p className="text-xs mt-0.5" style={{ color: "#9cad9e" }}>
            {customerEmail ? `Sent to ${customerEmail}` : "On its way to your inbox"}
          </p>
        </div>

        {/* ── CTAs ────────────────────────────────────────── */}
        <div className="space-y-3">
          <Link href={`/profile/orders/${order._id}`} className="block">
            <Button
              className="w-full py-6 rounded-xl text-base font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}
            >
              View order details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <ContinueShoppingButton />
        </div>
      </div>
    </main>
  )
}
