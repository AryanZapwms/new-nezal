# Nezal Herbocare — Project Handoff Summary

Project: Next.js e-commerce site for Nezal Herbocare (herbal skincare brand).
This doc summarizes everything worked on in the prior conversation so a new chat can pick up seamlessly.

---

## ✅ COMPLETED WORK

### 1. Footer redesign (`components/footer.tsx`)
- Replaced old "Site Map" description block with real links: The Nezal Story, Our Philosophy, Our Commitment, Why customer trust us, Reviews, Blogs — linking to `/about-us#story`, `#philosophy`, `#commitment`, `#trust` anchors, plus `/reviews` and `/blog`.
- Added anchor `id`s to the corresponding sections in `app/about-us/page.tsx`.
- Added new "Product" column mirroring the mega menu: Shop By Category (`/shop`), Shop By Concern (`/concerns`), Shop By Ingredient (`/ingredients`), Nezal Rituals (`/rituals`), Gift Kits (`/collections/gift-kits`).
- Removed the old redundant "Site" column (About Us/Blog/Review — now folded into Site Map).
- **Open flag:** `/concerns` and `/ingredients` as general index routes were a guess — confirm these exist or adjust hrefs.

### 2. Shop by Category component redesign (`components/shop-by-category.tsx`)
- Rebuilt from static grid → continuously auto-scrolling circular "coverflow" carousel based on a Canva mockup.
- Implemented via `requestAnimationFrame` loop (not CSS animation) so it can support:
  - Auto-scroll (continuous, seamless loop via duplicated item array)
  - Live coverflow scaling (whichever circle is nearest center grows, neighbors shrink, computed every frame via `getBoundingClientRect`)
  - Manual dragging (pointer events own the position; momentum decay on release; auto-scroll resumes smoothly)
- Fixed an earlier visual tearing bug by switching from `width` to `flex-basis` sizing.
- **Status: done and confirmed working well by user.** Optional未-done ideas (declined for now): snap-to-center on drag release, mobile-responsive circle sizing.

### 3. Collections category routing bug (multi-file fix)
**Root cause:** `subCategory` enum in `lib/models/collection.ts` didn't include `bath-shower` / `massage-oil`, and `/api/collections` only filtered by `navCategory`, never `subCategory` — so mega-menu links to Bath & Shower, Massage Oil, etc. 404'd with "No collections found."

**Fixed:**
- `lib/models/collection.ts` — expanded `subCategory` enum to include `bath-shower`, `massage-oil`.
- `app/api/collections/route.ts` — query now matches `$or: [{navCategory}, {subCategory}]`; added `subCategory` to the projection (was missing).
- `app/collections/page.tsx` — extended `SUBCATEGORY_LABELS`, `SUBCATEGORY_DESCRIPTIONS`, `CATEGORY_LABELS`, `CATEGORY_DESCRIPTIONS`, `BODY_CARE_SUB_ORDER` to include the new subcategories; fixed tab-highlighting fallback logic for subcategory-only views.
- **Discovered the actual data already existed** — `seed-full.js` had created Shower Gel / Bath Salt / Body Massage Oil collections, just mis-tagged with `subCategory: "body-care"` (because the enum didn't allow the correct value at seed time).
- Wrote and ran `nezal-seed/fix-subcategories.js` — non-destructive script, only updates `subCategory` on those 3 existing documents. **Confirmed run successfully by user.**
- Accidentally duplicated content into `components/new-arrivals.tsx` during this work — user is removing the stray constants from that file (unrelated dead code cleanup, not a functional bug).

### 4. Guest Checkout + Google OAuth + Session length fix (major multi-file change)
**Goal:** Let users add to cart, buy, and check out (COD or Razorpay) without forced registration/OTP. Add Google sign-in as a faster alternative to email/OTP. Fix inconsistent session length.

**Audited and confirmed the real auth gate map** (contradicted the stale `AuthFlow.md`/`CheckoutFlow.md` docs — these are NOT reliable, real code was traced instead):
- Cart (view/add/update) — never gated.
- "Shop Now" button — was gated (client redirect).
- `/checkout` page — was gated (client redirect).
- `POST /api/orders` (COD) — was gated (hard 401).
- `POST /api/razorpay/verify-payment` — was gated (hard 401).
- `GET /api/orders` (order history) — gated, **stays gated intentionally** (guests have no account to list against).
- `razorpay/create-order` — was never gated.

**Root cause of "stays logged in for days" complaint:** `session.maxAge` (24h) and `jwt.maxAge` (1h) in `[...nextauth]/route.ts` contradicted each other, with misleading comments. Fixed by setting both consistently to 30 days (deliberate "remember me" behavior for e-commerce, not a bug to eliminate).

**Files changed (all confirmed pasted to user, implementation given in full):**
1. `lib/models/user.ts` — `password` now optional; added `provider: "credentials" | "google"`.
2. `lib/models/order.ts` — `user` ref now optional; added `guestEmail`, `guestName`, `guestPhone`.
3. `app/api/auth/[...nextauth]/route.ts` — added `GoogleProvider`; added `signIn` callback to find-or-create `User` on Google login (auto `isVerified: true`); fixed `jwt`/`session` callbacks to resolve real Mongo `_id`/role for Google users; unified `session.maxAge`/`jwt.maxAge` to 30 days.
4. `app/checkout/page.tsx` — removed the `unauthenticated → redirect` effect and the `if (status === "unauthenticated") return null` block; added `email` to `initialData` prefill; Razorpay `prefill.email` now falls back to form email for guests.
5. `components/checkout-form.tsx` — added required email field to the form.
6. `app/api/orders/route.ts` (POST) — branches on session presence; guest path requires `shippingAddress.email`, creates order with `guestEmail`/`guestName`/`guestPhone` instead of `user`; emails use guest contact info when no `user`. GET unchanged (still session-gated).
7. `app/api/razorpay/verify-payment/route.ts` — identical guest-path branching applied (mirrors orders/route.ts).
8. `app/shop/[company]/product/[id]/page.tsx` — removed the `!session?.user` redirect block from `handleShopNow`.
9. `components/cart-icon.tsx` — removed `!!session?.user` from `showBadge` condition (cart badge now shows regardless of login state — this was making cart additions *look* broken while logged out, even though they technically worked).
10. `components/auth/login-form.tsx` — added "Continue with Google" button (`signIn("google", { callbackUrl: redirectTo })`).
11. `components/auth/register-form.tsx` — added "Continue with Google" button **above** the manual form (since it skips the OTP step entirely — placement matters so users see the easier option first).

**Build errors encountered + fixed during implementation (both were copy-paste duplication issues, not logic bugs):**
- `lib/models/user.ts` had two full schema blocks pasted back-to-back → fixed by keeping only the new one.
- `register-form.tsx` had `useSession` imported twice (once alone, once combined with `signIn`) → fixed by removing the duplicate import line.

**Required manual setup (user's responsibility, not code):**
- Create Google OAuth credentials in Google Cloud Console (Web application type).
- Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to `.env.local`.
- Authorized redirect URI: `{domain}/api/auth/callback/google`.
- Restart dev server after editing `.env.local`.

**Status:** All code given to user, build errors found and fixed. User has not yet reported back on end-to-end testing of guest COD, guest Razorpay, logged-in regression, or Google sign-in/sign-up — **this should be verified in the new conversation if not already done.**

---

## 🚧 IN PROGRESS — Shiprocket Integration

### Goal
Manually triggerable (v1) shipment creation in Shiprocket from the admin orders page, to eventually flip to fully automatic once trusted.

### Decisions locked in
- **Auth method:** Shiprocket's real order/shipment API uses **email + password → bearer token** (`POST https://apiv2.shiprocket.in/v1/external/auth/login`), NOT a key+secret pair. The key+secret the user was originally given is for a *different* purpose (webhook/courier-partner config under `Settings → API → Configure`) — save it for later, for webhook setup, not for the main integration.
- User created a dedicated **API User**: `api@nezalherbocare.com`, regenerated its password, confirmed credentials obtained. **User should have already added these to `.env.local` as `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` and restarted the dev server — confirm this happened.**
- **Trigger point:** Manual for v1 — a "Ship via Shiprocket" button in `app/admin/orders/page.tsx`, clicked per-order. Will switch to automatic (triggered from `app/api/orders/route.ts` and `app/api/razorpay/verify-payment/route.ts` right after order creation) once proven reliable.
- **Pickup address:** User has two addresses registered in Shiprocket — "Nezal Mumbai" (current real office, was toggled OFF, marked PRIMARY) and "Nezal HO" (old/incorrect, was toggled ON). **User needs to flip Nezal Mumbai to active and Nezal HO to inactive in the Shiprocket dashboard** (Settings → Pickup Addresses) — unclear if this was completed yet. Once done, `pickup_location: "Nezal Mumbai"` is the exact string to use in API calls (must match nickname exactly).
- **Package weight:** `Product` model has no weight field. Decision: add `weight: { type: Number, default: 0.3 }` (kg) to the schema properly, expose it in both admin product forms, rather than hardcoding a default at order-creation time. User is providing real per-product weight data to backfill via a migration script.

### Work completed so far (schema + admin UI + API — NOT yet the Shiprocket API wrapper itself)
Given to user as exact diffs, user confirmed implementing:
1. `lib/models/product.ts` — add `weight: { type: Number, default: 0.3 }`.
2. `app/admin/products/add/page.tsx` — add Weight (kg) input field, wire into `formData` and `bodyData`.
3. `app/admin/products/edit/[id]/page.tsx` — same, plus load existing `weight` value on fetch.
4. `app/api/products/route.ts` (POST) — accept and save `weight`.
5. `app/api/products/[id]/route.ts` (PUT) — accept and save `weight`.

**User confirmed: "i have done this much"** — i.e., items 1–5 above are implemented. Not yet confirmed: whether it builds/runs cleanly (worth a quick check in the new conversation, given the pattern of copy-paste duplication errors earlier in this project).

### NOT yet done — pick up here next
1. **Confirm pickup address toggle** is correctly set in Shiprocket dashboard (Nezal Mumbai ON, Nezal HO OFF).
2. **Migration script** `nezal-seed/backfill-product-weights.js` — not yet written. Waiting on user to supply real weight data in `slug: weight(kg)` format, e.g.:
   ```
   "black-pepper-cucumber-dandruff-shampoo-250ml": 0.35,
   "cucumber-black-pepper-scalp-soothing-dandruff-shampoo-500ml": 0.6,
   ```
   Script should follow the same safe pattern as the earlier `fix-subcategories.js` (non-destructive, `updateOne` per slug, logs any slugs not found).
3. **`lib/shiprocket.ts`** — not yet written. Needs:
   - Token fetch via `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD` → bearer token.
   - Token caching (Shiprocket tokens are valid ~240 hours/10 days — avoid re-authenticating every request).
   - Order-create wrapper function — needs pickup location name, order items (with weight), shipping address, COD/prepaid flag, totals.
   - Possibly a tracking/status wrapper later.
4. **`Order` schema additions** — agreed but not yet written: `shiprocketOrderId`, `shiprocketShipmentId`, `awbCode`, `courierName`, `trackingUrl` on `lib/models/order.ts`.
5. **Admin UI** — "Ship via Shiprocket" button in `app/admin/orders/page.tsx` (not yet seen this file in the conversation — will need it from user) calling a new API route (e.g. `app/api/admin/orders/[id]/ship/route.ts`) that uses `lib/shiprocket.ts` to create the shipment and save the returned IDs/AWB back onto the `Order` document.
6. **Eventually (explicitly deferred):** webhook setup using the original key+secret pair, for automatic status sync (shipped/delivered/RTO) back into `orderStatus`.

### Files Claude will need from the user to continue
- `app/admin/orders/page.tsx` (for the manual "Ship" button placement)
- Confirmation that `.env.local` has `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD` set and dev server restarted
- Confirmation pickup address toggle is fixed in Shiprocket dashboard
- The product weight data (`slug: weight` list) whenever ready

---

## General notes for continuing Claude
- **Do not trust `AuthFlow.md` / `CheckoutFlow.md`** in this repo — both are demonstrably stale/aspirational, not reflective of actual code. Always verify against real files.
- This user has hit the same **copy-paste duplication bug pattern** twice already (pasting a new code block below an old one instead of replacing it, causing "defined multiple times" build errors). Worth proactively reminding them to fully replace file contents rather than append when handing over file-level edits.
- User is on Windows (PowerShell), running `pnpm`/`npm` scripts directly via `node nezal-seed/scriptname.js` for one-off DB scripts — this pattern works well and should be continued for any future migration scripts.
- MongoDB Atlas connection string is hardcoded directly into each seed/migration script (visible in plaintext in `nezal-seed/*.js` files) — not following env-var best practice, but consistent with existing project convention; not worth changing unless asked.