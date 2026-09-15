# Coupon Discount Fix — Summary

## Problem

Coupon discounts shown correctly on the checkout page were not being applied
to the amount actually charged. Most visibly: CCAvenue's hosted payment page
showed the full pre-discount total (e.g. ₹521.72 instead of the displayed
₹484.72 with coupon "THANKYOU" applied).

## Root cause

`app/api/orders/route.ts` (order creation, used by both COD and CCAvenue)
received `couponCode` in the request body but never read it — it wasn't even
destructured. The route recomputes the order total server-side from
DB-verified item prices (correct, anti-tampering behavior for prices), but
had no discount-subtraction step at all, so `order.totalAmount` was always
the full, undiscounted total. Every downstream consumer —
`/api/ccavenue/initiate`, `/api/ccavenue/response`, admin order records,
confirmation emails — reads `order.totalAmount` from the DB, so they all
faithfully inherited the one wrong number written at creation time.
`app/api/razorpay/verify-payment/route.ts` had the identical gap. Separately,
`/api/coupons/redeem` (meant to enforce `maxUses`) was never called by any
checkout flow — coupon usage limits were unenforced everywhere, for every
payment method, before this fix.

## Files changed

### New: `lib/coupon-server.ts`
Shared module extracted from the pre-existing `/api/coupons/validate` and
`/api/coupons/redeem` routes (logic unchanged, just centralized) so the
eligibility rules and the atomic redemption can't drift between the
"preview the discount" and "actually charge for it" code paths — that drift
is what caused this bug in the first place.
- `validateCouponServerSide(code, cartTotal)` — checks active/date-window/
  maxUses/minOrderValue, returns the computed discount. Read-only.
- `redeemCoupon(code)` — atomic `findOneAndUpdate` with a `$lt` guard,
  increments `usedCount` only if still under `maxUses`. Race-safe.

### Changed: `app/api/coupons/validate/route.ts`, `app/api/coupons/redeem/route.ts`
Rewritten as thin wrappers around the shared module. Request/response shapes
unchanged — no behavior change for existing callers.

### Changed: `app/api/orders/route.ts` (Stage 1)
- Now reads `couponCode` from the request body.
- Re-validates it server-side via `validateCouponServerSide`, against the
  server-verified item subtotal (`computedTotal`) — never trusts any
  discount number the client echoes back.
- If invalid (expired/inactive/maxUses hit/min-order not met since the cart
  changed): **rejects the order with HTTP 400**, before any DB write.
- Discount is subtracted from the item subtotal only, *before* shipping/COD
  surcharge are added — confirmed to match `app/checkout/page.tsx`'s own
  math, not guessed.
- For **COD only**: redeems the coupon (`redeemCoupon`) *before*
  `Order.create()`. If the atomic redeem loses a race, the request fails
  with 409 before any write happens — COD is treated as a confirmed
  purchase immediately, matching this route's existing cart-conversion
  behavior.
- Persists `couponCode`/`discountAmount` on the created `Order` (schema
  fields that already existed but were never populated).

### Changed: `app/api/razorpay/verify-payment/route.ts` (Stage 2)
Same re-validation as Stage 1, with one deliberate difference: this route
runs *after* Razorpay has already captured payment (the widget's `handler`
only fires on a successful charge), so a stale coupon can't be handled by
simply rejecting — the customer's money is already gone.
- **Coupon still valid:** discount applied normally; the existing
  amount-mismatch guard (comparing the expected total to what Razorpay
  actually captured) still runs unchanged.
- **Coupon fails re-validation post-capture ("Option 3"):** the request is
  *not* rejected. `couponCode`/`discountAmount` are left null/0 (not
  officially honored), `order.totalAmount` is set to whatever Razorpay
  actually captured (read server-to-server via `razorpay.orders.fetch`, not
  client-supplied), and a new `couponDiscrepancy` field is written with a
  human-readable explanation for manual review. The amount-mismatch guard is
  bypassed *only* for this specific cause — any other drift (e.g. item price
  changed) still rejects exactly as before.
- Redemption happens *after* order creation, once payment is confirmed. A
  lost race here just logs — the payment already happened and can't be
  undone by rejecting.

### Changed: `app/api/ccavenue/response/route.ts` (Stage 3)
Adds the deferred redemption step: on `order_status === "Success"`, redeems
`updatedOrder.couponCode` (already validated and priced correctly at
creation time in Stage 1 — no re-validation needed here). No Option-3-style
handling required: CCAvenue validates the coupon and creates the order
*before* any redirect to CCAvenue happens, so a stale coupon is already
caught before money moves. A lost race here logs only, same as Razorpay.

`app/api/ccavenue/initiate/route.ts` and `lib/ccavenue.ts` were
**deliberately not touched** — they already read `amount = order.totalAmount`
fresh from the DB, which is exactly correct once Stage 1 fixed what gets
written there.

### Changed: `lib/models/order.ts`
Added `couponDiscrepancy: { type: String, default: null }`, alongside the
pre-existing (previously-unused) `couponCode`/`discountAmount` fields.

### Changed: `app/admin/orders/page.tsx`
Added a Coupon line item and an amber `couponDiscrepancy` warning callout to
the existing order-details modal, so the new field is actually visible to an
admin rather than a silent DB-only flag (verified `shiprocketError` was a
real precedent for that silent-field failure mode before adding this).

### New tests: `tests/coupon-server.test.ts`, `tests/orders-coupon.test.ts`
See Testing section below.

## Coupon lifecycle by payment method (after this fix)

| | Validated | Discount applied | Redeemed (`usedCount++`) | Stale-coupon handling |
|---|---|---|---|---|
| **COD** | `/api/orders` | `/api/orders`, before order creation | `/api/orders`, before order creation | Reject with 400, zero writes |
| **CCAvenue** | `/api/orders` | `/api/orders`, before redirect | `/api/ccavenue/response`, on confirmed success | Reject with 400 at creation — no money has moved yet |
| **Razorpay** | `/api/razorpay/verify-payment` | same route, after capture | same route, after order creation | NOT rejected (money already captured) — order honored at the actually-captured amount, flagged via `couponDiscrepancy` for manual review |

`maxUses` enforcement is exact for COD (redeem-before-create closes the race
completely) and best-effort/bounded for Razorpay/CCAvenue (redeem happens
after money has already moved, so a very narrow concurrent-race window can
soft-oversell a coupon by a small amount under load). This was an explicit,
accepted tradeoff — still a major improvement over the pre-fix state, where
`maxUses` was unenforced for every payment method, always.

## Testing

Run with `npm test` (Vitest + `mongodb-memory-server`, real in-memory Mongo,
no mocking of the DB layer itself).

- **`tests/coupon-server.test.ts`** — discount math parity (percentage
  rounding incl. a half-paisa boundary, flat-discount clamping) checked
  against an independently-written reference implementation of the client's
  formula from `app/checkout/page.tsx`; all existing eligibility rules
  (expired/inactive/limit/min-order); `redeemCoupon` atomicity under 5-way
  and 10-way concurrent races against a near-exhausted coupon — asserts
  `usedCount` never overshoots `maxUses` regardless of how many callers race.
- **`tests/orders-coupon.test.ts`** — `/api/orders`'s stale-coupon 400 path
  leaves zero writes (`Order`, `Cart`, `Coupon.usedCount`, `Product.stock`
  all asserted unchanged); a valid coupon correctly discounts `totalAmount`
  and is persisted on the order; two concurrent COD orders racing for a
  coupon's last remaining use — exactly one succeeds, the loser leaves
  nothing behind.

All 89 existing tests continue to pass (no regressions).

## Known follow-ups (explicitly out of scope for this fix)

- **GST breakdown not coupon-aware**: `totalTaxableValue`/`totalGstAmount`
  are computed per-item before the discount is applied and don't reflect it,
  so they won't sum to `totalAmount` on a discounted order.
- **Unreachable `existingOrder` branch** in
  `app/api/razorpay/verify-payment/route.ts` (matches a pre-existing
  `pending` Razorpay order, which — per a repo-wide check across every route,
  webhook, and cron job — nothing in this codebase currently creates).
  Left untouched; would need the same coupon-field handling as the rest of
  Stage 2 if it's ever found to actually fire.
