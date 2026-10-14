import { useLoadingStore } from "@/lib/store/loading-store"

const MUTATION_METHODS = ["POST", "PUT", "DELETE", "PATCH"]

// Routes you want to show loader on even for GET
// (/api/users/profile is deliberately not here: components/profile-completion-nudge.tsx
// and the checkout page fetch it in the background on page load)
const WATCHED_GET_ROUTES: string[] = [
  "/api/orders/",         // loading a specific order
]

// Background requests that must never put up the full-screen overlay — they're
// silent by design or already show their own inline loading state. Placing
// orders, payments and form submits aren't listed here, so they keep the overlay.
// Matched against the exact path so e.g. /api/cart/claim-discount still shows it.
const SILENT_REQUESTS: { method: string; path: RegExp }[] = [
  { method: "PUT",  path: /^\/api\/cart$/ },                             // cart mirror sync (lib/store/cart-sync.ts)
  { method: "POST", path: /^\/api\/cart\/merge$/ },                      // cart reconcile on load (components/cart-hydrator.tsx)
  { method: "POST", path: /^\/api\/orders\/[^/]+\/check-abandonment$/ }, // checkout background check
  { method: "POST", path: /^\/api\/shipping-rate$/ },                    // checkout shows an inline spinner
  { method: "POST", path: /^\/api\/coupons\/validate$/ },                // Apply button shows its own state
]

function isSilentRequest(url: string, method: string): boolean {
  let pathname: string
  try {
    pathname = new URL(url, window.location.origin).pathname
  } catch {
    return false
  }
  return SILENT_REQUESTS.some((r) => r.method === method && r.path.test(pathname))
}

// Routes to always skip (background/analytics/silent)
const IGNORED_ROUTES: string[] = [
  "/api/auth/",           // nextauth internal
  "/api/razorpay/",       // razorpay handled by checkout page
  "/api/companies",       // background cache fetches
  "/api/search",          // search as you type
  "/api/products?",       // shop page product listing (has skeleton)
  "/api/collections/",    // collections page (has skeleton)
  "/api/blogs",           // blog page (has skeleton)
  "/api/admin/",          // admin routes
  "/_next/",              // next internals
  "/api/facebook-pixel",  // analytics
]

function shouldShowLoader(url: string, method: string): boolean {
  const upperMethod = method.toUpperCase()

  // Always skip ignored routes
  if (IGNORED_ROUTES.some((route) => url.includes(route))) return false
  if (isSilentRequest(url, upperMethod)) return false

  // Show for all mutations
  if (MUTATION_METHODS.includes(upperMethod)) return true

  // Show for specific watched GETs
  if (upperMethod === "GET") {
    return WATCHED_GET_ROUTES.some((route) => url.includes(route))
  }

  return false
}

export function getLoaderMessage(url: string, method: string): string {
  const upperMethod = method.toUpperCase()

  if (url.includes("/api/wishlist"))         return "Updating wishlist..."
  if (url.includes("/api/orders") && upperMethod === "POST") return "Placing your order..."
  if (url.includes("/api/orders"))           return "Loading order..."
  if (url.includes("/api/users/profile") && upperMethod === "PUT") return "Saving profile..."
  if (url.includes("/api/users/profile"))    return "Loading profile..."
  if (url.includes("/api/auth/verify-otp")) return "Verifying code..."
  if (url.includes("/api/auth/resend-otp")) return "Resending code..."
  if (url.includes("/api/auth/register"))   return "Creating account..."
  if (url.includes("/api/products") && url.includes("/reviews")) return "Submitting review..."
  if (url.includes("/api/coupons"))          return "Applying coupon..."

  return "Please wait..."
}

let interceptorInstalled = false

export function installFetchInterceptor() {
  if (interceptorInstalled || typeof window === "undefined") return
  interceptorInstalled = true

  const originalFetch = window.fetch

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url
    const method = init?.method ?? (input instanceof Request ? input.method : "GET")

    const show = shouldShowLoader(url, method)
    const { startLoading, stopLoading } = useLoadingStore.getState()

    if (show) startLoading(getLoaderMessage(url, method))

    try {
      return await originalFetch(input, init)
    } finally {
      if (show) stopLoading()
    }
  }
}