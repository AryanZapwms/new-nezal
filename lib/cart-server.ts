// lib/cart-server.ts
//
// Shared server-side helpers for the Cart mirror: who a cart belongs to,
// finding/creating the active cart for that identity, and marking a cart
// converted once a purchase is actually confirmed. Used by app/api/cart/*
// and by the three payment-confirmation routes (COD in app/api/orders,
// CCAvenue's response callback, Razorpay's verify-payment route).
import crypto from "crypto"
import mongoose from "mongoose"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { User } from "@/lib/models/user"

export const CART_TOKEN_COOKIE = "nezal-cart-token"
const CART_TOKEN_MAX_AGE_SECONDS = 180 * 24 * 60 * 60 // ~180 days

// Admin "abandoned" is a derived label (status === "active" AND idle this
// long), not a stored state — see app/api/admin/carts/route.ts. Kept here,
// not on the model, so both routes read one constant.
export const CART_ABANDONED_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

export type CartIdentity =
  | { kind: "user"; userId: string }
  | { kind: "guest"; guestToken: string | null }

/**
 * Resolves who the current request's cart belongs to. Deliberately does NOT
 * trust session.user.id/role from the bare getServerSession() call — every
 * other route in this codebase (app/api/orders, app/api/admin/orders, ...)
 * re-derives identity from a User.findOne({email}) lookup instead of relying
 * on those JWT-sourced fields, and for good reason: they aren't reliably
 * populated by getServerSession() when called without authOptions. Trusting
 * session.user.id here originally caused logged-in customers' carts to be
 * silently written under a guest identity instead. Otherwise falls back to
 * the guest cart-token cookie, which may not exist yet.
 */
export async function resolveCartIdentity(request: NextRequest): Promise<CartIdentity> {
  const session = await getServerSession()
  if (session?.user?.email) {
    await connectDB()
    const user = await User.findOne({ email: session.user.email }).select("_id")
    if (user) {
      return { kind: "user", userId: user._id.toString() }
    }
  }

  const guestToken = request.cookies.get(CART_TOKEN_COOKIE)?.value || null
  return { kind: "guest", guestToken }
}

/** Read-only lookup — never creates a cart or a guest token. Lean: callers
 *  needing a savable document use getOrCreateActiveCart instead. */
export async function findActiveCart(identity: CartIdentity) {
  await connectDB()
  if (identity.kind === "user") {
    return Cart.findOne({ user: identity.userId, status: "active" }).lean()
  }
  if (!identity.guestToken) return null
  return Cart.findOne({ guestToken: identity.guestToken, status: "active" }).lean()
}

async function createActiveCartSafely(fields: Record<string, unknown>) {
  try {
    return await Cart.create({ ...fields, status: "active", items: [], lastActivityAt: new Date() })
  } catch (err: any) {
    // Duplicate key on the partial unique index — another request for the
    // same identity won the race and created it first. Use theirs.
    if (err?.code === 11000) {
      const existing = await Cart.findOne({ ...fields, status: "active" })
      if (existing) return existing
    }
    throw err
  }
}

/**
 * Finds the identity's active cart, creating one if it doesn't exist yet
 * (a guest token is minted here if the caller didn't already have one —
 * the caller is responsible for setting it on the response via
 * setCartTokenCookie when newGuestToken is non-null). If a cart exists but
 * has already converted/merged/abandoned, a fresh active cart is started
 * rather than reopening it, so historical carts stay immutable.
 */
export async function getOrCreateActiveCart(identity: CartIdentity) {
  await connectDB()

  if (identity.kind === "user") {
    const cart =
      (await Cart.findOne({ user: identity.userId, status: "active" })) ||
      (await createActiveCartSafely({ user: identity.userId }))
    return { cart, newGuestToken: null as string | null }
  }

  const token = identity.guestToken || crypto.randomUUID()
  const newGuestToken = identity.guestToken ? null : token

  const cart =
    (await Cart.findOne({ guestToken: token, status: "active" })) ||
    (await createActiveCartSafely({ guestToken: token }))

  return { cart, newGuestToken }
}

export async function markCartConverted(
  cartId: mongoose.Types.ObjectId | string | null | undefined,
  orderId: mongoose.Types.ObjectId | string,
) {
  if (!cartId) return
  await connectDB()
  await Cart.findOneAndUpdate(
    { _id: cartId, status: "active" }, // no-op if it already converted/isn't active
    { status: "converted", convertedOrderId: orderId, convertedAt: new Date() },
  )
}

export function setCartTokenCookie(res: NextResponse, token: string) {
  res.cookies.set(CART_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  })
}

export function clearCartTokenCookie(res: NextResponse) {
  res.cookies.set(CART_TOKEN_COOKIE, "", { path: "/", maxAge: 0 })
}

// ─── Item validation (lightweight — see app/api/cart/route.ts) ────────────
// Real stock/price/availability checks stay in the checkout/order APIs;
// this only guards against structurally invalid data landing in the mirror.

const VALID_UNITS = ["ml", "l", "g", "kg"]
const MAX_QUANTITY = 999
const MAX_ITEMS = 200

export interface SanitizedCartItem {
  product: string
  quantity: number
  selectedSize?: {
    size?: string
    unit?: string
    quantity?: number
    price?: number
    discountPrice?: number
    stock?: number
    sku?: string
  }
  flashSale?: {
    saleId?: string
    saleName?: string
    discountPercent?: number
    endsAt?: string
  }
  ritual?: { slug?: string; name?: string }
}

function toFiniteNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function sanitizeCartItems(rawItems: unknown): SanitizedCartItem[] {
  if (!Array.isArray(rawItems)) return []

  const sanitized: SanitizedCartItem[] = []

  for (const raw of rawItems.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue

    const productId = (raw as any).product ?? (raw as any).productId
    if (typeof productId !== "string" || !mongoose.Types.ObjectId.isValid(productId)) continue

    const quantity = toFiniteNumber((raw as any).quantity)
    if (quantity === undefined || quantity < 1) continue

    const item: SanitizedCartItem = {
      product: productId,
      quantity: Math.min(Math.floor(quantity), MAX_QUANTITY),
    }

    const s = (raw as any).selectedSize
    if (s && typeof s === "object") {
      item.selectedSize = {
        size: typeof s.size === "string" ? s.size : undefined,
        unit: VALID_UNITS.includes(s.unit) ? s.unit : undefined,
        quantity: toFiniteNumber(s.quantity),
        price: toFiniteNumber(s.price),
        discountPrice: toFiniteNumber(s.discountPrice),
        stock: toFiniteNumber(s.stock),
        sku: typeof s.sku === "string" ? s.sku : undefined,
      }
    }

    const fs = (raw as any).flashSale
    if (fs && typeof fs === "object" && fs.saleId) {
      item.flashSale = {
        saleId: String(fs.saleId),
        saleName: typeof fs.saleName === "string" ? fs.saleName : undefined,
        discountPercent: toFiniteNumber(fs.discountPercent),
        endsAt: typeof fs.endsAt === "string" ? fs.endsAt : undefined,
      }
    }

    const ritual = (raw as any).ritual
    if (ritual && typeof ritual === "object" && ritual.slug) {
      item.ritual = {
        slug: String(ritual.slug),
        name: typeof ritual.name === "string" ? ritual.name : undefined,
      }
    }

    sanitized.push(item)
  }

  return sanitized
}

/**
 * Shapes cart items back into the client CartItem[] shape (lib/store/
 * cart-store.ts) for hydration/merge responses. Populates product display
 * fields fresh rather than trusting anything the client last synced, and
 * drops items whose product was deleted since. Always queries `.lean()` so
 * nested subdocuments (selectedSize/flashSale/ritual) come back as plain
 * objects that are safe to spread/serialize.
 */
function shapeLeanCartItems(items: any[]) {
  return items
    .filter((item) => !!item.product)
    .map((item) => {
      const product = item.product
      const price = item.selectedSize?.price ?? product.price
      const discountPrice = item.selectedSize?.discountPrice ?? product.discountPrice ?? undefined

      return {
        productId: product._id.toString(),
        name: product.name,
        price,
        discountPrice,
        image: product.image,
        quantity: item.quantity,
        selectedSize: item.selectedSize ?? undefined,
        flashSale: item.flashSale ?? undefined,
        ritual: item.ritual ?? undefined,
      }
    })
}

const CART_ITEM_PRODUCT_POPULATE = { path: "items.product", select: "name image price discountPrice" }

/** Read-only, serialized cart for a resolved identity — used by GET /api/cart. */
export async function getSerializedCartForIdentity(identity: CartIdentity) {
  await connectDB()
  const filter =
    identity.kind === "user"
      ? { user: identity.userId, status: "active" }
      : identity.guestToken
        ? { guestToken: identity.guestToken, status: "active" }
        : null
  if (!filter) return []

  const cart = await Cart.findOne(filter).populate(CART_ITEM_PRODUCT_POPULATE).lean()
  if (!cart) return []
  return shapeLeanCartItems((cart as any).items)
}

/** Read-only, serialized cart by id — used after PUT /api/cart/merge saves. */
export async function serializeCartForClient(cartId: mongoose.Types.ObjectId | string) {
  await connectDB()
  const cart = await Cart.findById(cartId).populate(CART_ITEM_PRODUCT_POPULATE).lean()
  if (!cart) return []
  return shapeLeanCartItems((cart as any).items)
}
