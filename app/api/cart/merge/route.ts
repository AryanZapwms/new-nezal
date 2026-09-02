// app/api/cart/merge/route.ts
//
// Called once, right after a guest with an existing cart logs in (see
// components/cart-hydrator.tsx). Folds the guest cart token's cart into the
// now-logged-in user's cart: duplicate items (same product + selected
// size/variant, matching the logic in lib/store/cart-store.ts's matchItem)
// have their quantities summed and capped at current stock; everything else
// is appended. The guest cart is retired ("merged") rather than deleted, and
// its cookie is cleared. Checkout-time stock validation remains the final
// authority — this cap is just to stop the merge itself producing an
// obviously impossible quantity.
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import {
  resolveCartIdentity,
  findActiveCart,
  getOrCreateActiveCart,
  serializeCartForClient,
  clearCartTokenCookie,
} from "@/lib/cart-server"

function sizeKey(selectedSize: any): string {
  if (!selectedSize) return ""
  return [selectedSize.size ?? "", selectedSize.unit ?? "", selectedSize.quantity ?? "", selectedSize.sku ?? ""].join(
    "|",
  )
}

function itemKey(item: any): string {
  const productId = (item.product?._id ?? item.product)?.toString?.() ?? String(item.product)
  return `${productId}::${sizeKey(item.selectedSize)}`
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const identity = await resolveCartIdentity(request)

    if (identity.kind !== "user") {
      return NextResponse.json({ error: "Login required to merge a cart" }, { status: 401 })
    }

    const guestIdentity = { kind: "guest" as const, guestToken: request.cookies.get("nezal-cart-token")?.value || null }
    const guestCart = guestIdentity.guestToken ? await findActiveCart(guestIdentity) : null

    const { cart: userCart } = await getOrCreateActiveCart(identity)

    // Nothing to merge — just hand back the user's own cart as-is.
    if (!guestCart || !(guestCart as any).items?.length) {
      const items = await serializeCartForClient(userCart._id)
      const res = NextResponse.json({ items })
      clearCartTokenCookie(res)
      return res
    }

    const guestItems = (guestCart as any).items as any[]
    const userItems = userCart.toObject().items as any[]

    // Resolve current stock for every product involved, so the merge can't
    // hand the user an obviously-impossible quantity.
    const productIds = Array.from(
      new Set([...guestItems, ...userItems].map((i) => (i.product?._id ?? i.product)?.toString())),
    ).filter(Boolean)
    const products = await Product.find({ _id: { $in: productIds } }).select("stock sizes").lean()
    const productById = new Map(products.map((p: any) => [p._id.toString(), p]))

    function resolveStock(item: any): number | null {
      const productId = (item.product?._id ?? item.product)?.toString()
      const product = productById.get(productId)
      if (!product) return null // product gone — drop the item rather than guess
      if (item.selectedSize?.size) {
        const variant = (product.sizes || []).find(
          (s: any) =>
            s.size === item.selectedSize.size &&
            (item.selectedSize.sku ? s.sku === item.selectedSize.sku : true),
        )
        return variant ? (variant.stock ?? 0) : null
      }
      return product.stock ?? 0
    }

    const merged = new Map<string, any>()
    for (const item of userItems) {
      merged.set(itemKey(item), { ...item })
    }
    for (const guestItem of guestItems) {
      const key = itemKey(guestItem)
      const existing = merged.get(key)
      if (existing) {
        merged.set(key, { ...existing, quantity: existing.quantity + guestItem.quantity })
      } else {
        merged.set(key, { ...guestItem })
      }
    }

    const finalItems = []
    for (const item of merged.values()) {
      const stock = resolveStock(item)
      if (stock === null) continue // product/variant no longer exists
      const cappedQuantity = Math.min(item.quantity, stock)
      if (cappedQuantity < 1) continue // out of stock — don't carry a 0-qty line
      finalItems.push({
        product: item.product?._id ?? item.product,
        quantity: cappedQuantity,
        selectedSize: item.selectedSize,
        flashSale: item.flashSale,
        ritual: item.ritual,
        addedAt: item.addedAt ?? new Date(),
      })
    }

    userCart.items = finalItems as any
    userCart.lastActivityAt = new Date()
    await userCart.save()

    await Cart.findByIdAndUpdate((guestCart as any)._id, { status: "merged" })

    const items = await serializeCartForClient(userCart._id)
    const res = NextResponse.json({ items })
    clearCartTokenCookie(res)
    return res
  } catch (error) {
    console.error("Error merging guest cart:", error)
    return NextResponse.json({ error: "Failed to merge cart" }, { status: 500 })
  }
}
