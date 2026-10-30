// Tests for whenPixelReady() in lib/facebook-pixel.ts — the server-rendered
// product page sends ViewContent from a mount effect, which can run before the
// afterInteractive pixel script has defined window.fbq. The event must wait
// for fbq instead of being dropped.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { whenPixelReady } from "@/lib/facebook-pixel"

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as any).window = {}
})

afterEach(() => {
  vi.useRealTimers()
  delete (globalThis as any).window
})

describe("whenPixelReady", () => {
  it("runs right away when the pixel is already loaded", () => {
    ;(globalThis as any).window.fbq = vi.fn()
    const callback = vi.fn()
    whenPixelReady(callback)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("waits for the pixel script, then runs once", async () => {
    const callback = vi.fn()
    whenPixelReady(callback)
    await vi.advanceTimersByTimeAsync(1000)
    expect(callback).not.toHaveBeenCalled()

    ;(globalThis as any).window.fbq = vi.fn()
    await vi.advanceTimersByTimeAsync(100)
    expect(callback).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("gives up when the pixel never loads", async () => {
    const callback = vi.fn()
    whenPixelReady(callback, 2000)
    await vi.advanceTimersByTimeAsync(2100)
    ;(globalThis as any).window.fbq = vi.fn()
    await vi.advanceTimersByTimeAsync(1000)
    expect(callback).not.toHaveBeenCalled()
  })

  it("can be cancelled (the page unmounted first)", async () => {
    const callback = vi.fn()
    const cancel = whenPixelReady(callback)
    cancel()
    ;(globalThis as any).window.fbq = vi.fn()
    await vi.advanceTimersByTimeAsync(1000)
    expect(callback).not.toHaveBeenCalled()
  })
})
