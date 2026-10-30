// Tests for lib/fetch-interceptor.ts — when the full-screen "Please wait..."
// overlay goes up. Third-party requests (the Shiprocket widget's tracking POST)
// must never show it, and our own requests only show it once they have been
// pending for OVERLAY_DELAY_MS.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest"
import { useLoadingStore } from "@/lib/store/loading-store"

const ORIGIN = "https://nezalherbocare.com"

// Each call returns a response after `delayMs` (set per test)
let delayMs = 0
const networkFetch = vi.fn(
  () => new Promise<Response>((resolve) => setTimeout(() => resolve(new Response("{}")), delayMs))
)

let OVERLAY_DELAY_MS: number

beforeAll(async () => {
  ;(globalThis as any).window = { location: { origin: ORIGIN }, fetch: networkFetch }
  const interceptor = await import("@/lib/fetch-interceptor")
  OVERLAY_DELAY_MS = interceptor.OVERLAY_DELAY_MS
  interceptor.installFetchInterceptor()
})

beforeEach(() => {
  vi.useFakeTimers()
  networkFetch.mockClear()
  useLoadingStore.setState({ count: 0, isLoading: false, message: "" })
})

afterEach(() => {
  vi.useRealTimers()
})

const windowFetch = (input: string, init?: RequestInit) => (globalThis as any).window.fetch(input, init)

describe("fetch interceptor overlay", () => {
  it("never shows the overlay for a cross-origin POST, however long it takes", async () => {
    delayMs = 5000
    const pending = windowFetch("https://events.pickrr.com/collect", { method: "POST" })

    await vi.advanceTimersByTimeAsync(4000)
    expect(useLoadingStore.getState().isLoading).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    await pending
    expect(useLoadingStore.getState().isLoading).toBe(false)
    expect(networkFetch).toHaveBeenCalledTimes(1)
  })

  it("does not flash the overlay for one of our requests that finishes quickly", async () => {
    delayMs = OVERLAY_DELAY_MS - 100
    const pending = windowFetch("/api/orders", { method: "POST" })

    await vi.advanceTimersByTimeAsync(OVERLAY_DELAY_MS + 500)
    await pending
    expect(useLoadingStore.getState().isLoading).toBe(false)
    expect(useLoadingStore.getState().count).toBe(0)
  })

  it("shows the overlay once one of our requests is still pending after the delay, and hides it when done", async () => {
    delayMs = 2000
    const pending = windowFetch("/api/orders", { method: "POST" })

    await vi.advanceTimersByTimeAsync(OVERLAY_DELAY_MS - 1)
    expect(useLoadingStore.getState().isLoading).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(useLoadingStore.getState()).toMatchObject({ isLoading: true, message: "Placing your order..." })

    await vi.advanceTimersByTimeAsync(2000)
    await pending
    expect(useLoadingStore.getState()).toMatchObject({ isLoading: false, count: 0 })
  })

  it("treats an absolute URL on our own origin like a relative one", async () => {
    delayMs = 2000
    const pending = windowFetch(`${ORIGIN}/api/orders`, { method: "POST" })

    await vi.advanceTimersByTimeAsync(OVERLAY_DELAY_MS)
    expect(useLoadingStore.getState().isLoading).toBe(true)

    await vi.advanceTimersByTimeAsync(2000)
    await pending
    expect(useLoadingStore.getState().isLoading).toBe(false)
  })

  it("keeps silent requests and plain GETs off the overlay", async () => {
    delayMs = 2000
    const requests = [
      windowFetch("/api/cart", { method: "PUT" }),
      // Their buttons show an inline spinner instead
      windowFetch("/api/products/abc/reviews", { method: "POST" }),
      windowFetch("/api/shiprocket/initiate-checkout", { method: "POST" }),
      // Optimistic, with a toast on failure
      windowFetch("/api/wishlist", { method: "POST" }),
      windowFetch("/api/products/abc"),
      windowFetch("/api/products?category=face"),
    ]

    await vi.advanceTimersByTimeAsync(1000)
    expect(useLoadingStore.getState().isLoading).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    await Promise.all(requests)
  })

  it("hides the overlay when a slow request fails", async () => {
    networkFetch.mockImplementationOnce(
      () => new Promise<Response>((_, reject) => setTimeout(() => reject(new TypeError("Failed to fetch")), 1000))
    )
    const pending = windowFetch("/api/orders", { method: "POST" }).catch((error: Error) => error)

    await vi.advanceTimersByTimeAsync(OVERLAY_DELAY_MS)
    expect(useLoadingStore.getState().isLoading).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)
    expect(await pending).toBeInstanceOf(TypeError)
    expect(useLoadingStore.getState()).toMatchObject({ isLoading: false, count: 0 })
  })
})
