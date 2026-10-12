// Integration tests for app/api/cart/recover/route.ts — the link in the
// WhatsApp "Complete order" reply.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { Cart } from "@/lib/models/cart"
import { CART_TOKEN_COOKIE } from "@/lib/cart-server"
import { connectTestDb, disconnectTestDb } from "./setup-db"

let GET: typeof import("@/app/api/cart/recover/route").GET

const TOKEN = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b"
const OTHER_TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const item = () => ({ product: new mongoose.Types.ObjectId(), quantity: 1 })

beforeAll(async () => {
  await connectTestDb()
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.test"
  ;({ GET } = await import("@/app/api/cart/recover/route"))
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Cart.deleteMany({})
})

async function open(token: string | null, cookieToken?: string) {
  const url = `http://localhost/api/cart/recover${token === null ? "" : `?token=${token}`}`
  const res = await GET(
    new NextRequest(url, { headers: cookieToken ? { cookie: `${CART_TOKEN_COOKIE}=${cookieToken}` } : {} }),
  )
  return { location: res.headers.get("location"), cookie: res.cookies.get(CART_TOKEN_COOKIE)?.value }
}

describe("GET /api/cart/recover", () => {
  it("hands a fresh browser the cart's cookie and lands on the cart page", async () => {
    await Cart.create({ guestToken: TOKEN, items: [item()] })

    expect(await open(TOKEN)).toEqual({ location: "https://shop.test/cart", cookie: TOKEN })
  })

  it("changes nothing in the database", async () => {
    const cart = await Cart.create({ guestToken: TOKEN, items: [item()], lastActivityAt: new Date(0) })
    await open(TOKEN)

    const after = await Cart.findById(cart._id).lean()
    expect((after as any).lastActivityAt).toEqual(new Date(0))
    expect(await Cart.countDocuments()).toBe(1)
  })

  it("only redirects for a missing, malformed or unknown token", async () => {
    for (const token of [null, "", "not-a-token", "' OR 1=1", TOKEN]) {
      expect(await open(token)).toEqual({ location: "https://shop.test/cart", cookie: undefined })
    }
  })

  it("only redirects once the cart has been ordered or merged", async () => {
    await Cart.create({ guestToken: TOKEN, items: [item()], status: "converted" })
    expect((await open(TOKEN)).cookie).toBeUndefined()
  })

  it("leaves a browser that already has its own cart alone", async () => {
    await Cart.create({ guestToken: TOKEN, items: [item()] })
    await Cart.create({ guestToken: OTHER_TOKEN, items: [item()] })

    expect((await open(TOKEN, OTHER_TOKEN)).cookie).toBeUndefined()
  })

  it("replaces a cookie whose cart is empty or gone", async () => {
    await Cart.create({ guestToken: TOKEN, items: [item()] })
    await Cart.create({ guestToken: OTHER_TOKEN, items: [] })

    expect((await open(TOKEN, OTHER_TOKEN)).cookie).toBe(TOKEN)
    expect((await open(TOKEN, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).cookie).toBe(TOKEN)
  })
})
