// app/checkout/success/page.tsx
//
// Customer-facing redirect target after a Shiprocket Custom Checkout
// session completes — Shiprocket redirects here with ?oid=...&ost=SUCCESS
// per their Success Redirect docs. The real Order was already created by
// app/api/shiprocket/order-webhook/[secret]/route.ts BEFORE the customer
// even lands here; this page only looks it up and displays it.
//
// Server Component (not a client fetch like app/order-success/[id]/page.tsx)
// deliberately: `oid` is Shiprocket's platform_order_id/fastrr id, not our
// own Order._id, so this can't reuse the existing GET /api/orders/[id]
// route (which also requires a logged-in session — Shiprocket checkout
// customers are commonly guests). Doing the lookup directly here avoids
// standing up a new public, unauthenticated "look up any order by an
// external id" API route — the risk profile (knowing/guessing an id is
// enough to view that order's confirmation details) already matches how
// app/order-success/[id] behaves for guest orders today, so this isn't a
// new or lower bar, just the same one without an extra API surface.
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, XCircle, Clock3, Package, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"
import "@/lib/models/product"
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success"

async function findOrderByShiprocketId(oid: string) {
  await connectDB()

  const numericOid = Number(oid)
  const or: Record<string, any>[] = [{ shiprocketPlatformOrderId: oid }]
  if (Number.isFinite(numericOid)) or.push({ shiprocketOrderId: numericOid })

  return Order.findOne({ $or: or })
    .populate({ path: "items.product", select: "name image" })
    .lean() as Promise<any>
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ oid?: string; ost?: string }>
}) {
  const { oid, ost } = await searchParams
  const succeeded = ost === "SUCCESS"

  const order = succeeded && oid ? await findOrderByShiprocketId(oid) : null

  // ── Payment not successful (failed / cancelled / unknown status) ────────
  if (!succeeded) {
    return (
      <main className="min-h-screen py-10 lg:py-16 px-4" style={{ backgroundColor: "#f7faf7" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#fbe6e6" }}
          >
            <XCircle className="w-11 h-11" style={{ color: "#b91c1c" }} strokeWidth={2} />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
            Payment wasn't completed
          </h1>
          <p className="text-sm lg:text-base mb-8" style={{ color: "#6b7c70" }}>
            {ost
              ? `Your payment status came back as "${ost}". Your cart is still saved — you can try again.`
              : "We didn't receive a successful payment confirmation. Your cart is still saved — you can try again."}
          </p>
          <div className="space-y-3 max-w-xs mx-auto">
            <Link href="/cart" className="block">
              <Button className="w-full py-5 rounded-xl text-base font-semibold" style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}>
                Return to cart
              </Button>
            </Link>
            <Link href="/shop" className="block">
              <Button variant="outline" className="w-full py-5 rounded-xl text-base font-semibold" style={{ borderColor: "#1e3a28", color: "#1e3a28" }}>
                Continue shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ── Payment succeeded, but our order-webhook hasn't processed it yet ────
  // (brief race: Shiprocket's redirect can beat their own webhook delivery)
  if (!order) {
    const refreshHref = `/checkout/success?oid=${encodeURIComponent(oid ?? "")}&ost=${encodeURIComponent(ost ?? "")}`
    return (
      <main className="min-h-screen py-10 lg:py-16 px-4" style={{ backgroundColor: "#f7faf7" }}>
        {/* Purely server-rendered auto-retry — no client JS needed for this page */}
        <meta httpEquiv="refresh" content="5" />
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#e0f0e4" }}
          >
            <Clock3 className="w-11 h-11 animate-pulse" style={{ color: "#1e6636" }} strokeWidth={2} />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: "#1e3a28" }}>
            Confirming your order...
          </h1>
          <p className="text-sm lg:text-base mb-8" style={{ color: "#6b7c70" }}>
            Payment received — we're just finalizing your order. This usually takes a few seconds.
            This page will refresh automatically.
          </p>
          <div className="space-y-3 max-w-xs mx-auto">
            <a href={refreshHref} className="block">
              <Button className="w-full py-5 rounded-xl text-base font-semibold" style={{ backgroundColor: "#1e3a28", color: "#ffffff" }}>
                Refresh now
              </Button>
            </a>
            <Link href="/shop" className="block">
              <Button variant="outline" className="w-full py-5 rounded-xl text-base font-semibold" style={{ borderColor: "#1e3a28", color: "#1e3a28" }}>
                Continue shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ── Payment succeeded and the order is here ──────────────────────────────
  const items: any[] = order.items || []
  const itemCount = items.length
  const customerEmail = order.guestEmail || order.shippingAddress?.email

  return (
    <main className="min-h-screen py-10 lg:py-16 px-4" style={{ backgroundColor: "#f7faf7" }}>
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
            Thank you for shopping with us — your order has been confirmed.
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
                        {item.selectedSize ? ` · ${item.selectedSize.size}${item.selectedSize.unit}` : ""}
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
              <span className="text-sm font-medium" style={{ color: "#6b7c70" }}>Total paid</span>
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
          <Link href="/shop" className="block">
            <Button
              variant="outline"
              className="w-full py-5 rounded-xl text-base font-semibold"
              style={{ borderColor: "#1e3a28", color: "#1e3a28" }}
            >
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
