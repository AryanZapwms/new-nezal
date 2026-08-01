//  lib/store/cart-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
  weight?: number     // ← new
  length?: number      // ← new
  breadth?: number     // ← new
  height?: number       // ← new
}

export interface CartItem {
  productId: string
  name: string
  price: number
  discountPrice?: number
  image: string
  quantity: number
  company?: { name: string; slug: string }
  selectedSize?: Size
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
  ritual?: { slug: string; name: string } | null
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, selectedSize?: Size) => void
  removeRitual: (ritualSlug: string) => void
  updateQuantity: (productId: string, quantity: number, selectedSize?: Size) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const isSameSize = (a?: Size, b?: Size) => {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.size === b.size &&
    a.unit === b.unit &&
    a.quantity === b.quantity &&
    (a.sku ? a.sku === b.sku : true)
  )
}

const cloneSize = (size?: Size) => {
  if (!size) return undefined
  const { size: label, unit, quantity, price, discountPrice, stock, sku } = size
  return { size: label, unit, quantity, price, discountPrice, stock, sku }
}

const matchItem = (item: CartItem, productId: string, selectedSize?: Size) => {
  if (item.productId !== productId) return false
  return isSameSize(item.selectedSize, selectedSize)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

     addItem: (item: CartItem) => {
  set((state) => {
    const existingItem = state.items.find((i) => matchItem(i, item.productId, item.selectedSize))

    if (existingItem) {
      return {
        items: state.items.map((i) =>
          matchItem(i, item.productId, item.selectedSize)
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                price: item.price,
                discountPrice: item.discountPrice,
                flashSale: item.flashSale,
                ritual: item.ritual !== undefined ? item.ritual : i.ritual,
              }
            : i,
        ),
      }
    }

    return { items: [...state.items, { ...item, selectedSize: cloneSize(item.selectedSize) }] }
  })
},

      removeItem: (productId: string, selectedSize?: Size) => {
        set((state) => ({
          items: state.items.filter((i) => !matchItem(i, productId, selectedSize)),
        }))
      },

      removeRitual: (ritualSlug: string) => {
  set((state) => ({
    items: state.items.filter((i) => i.ritual?.slug !== ritualSlug),
  }))
},

      updateQuantity: (productId: string, quantity: number, selectedSize?: Size) => {
        set((state) => ({
          items: state.items.map((i) =>
            matchItem(i, productId, selectedSize) ? { ...i, quantity } : i,
          ),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.discountPrice || item.price
          return total + price * item.quantity
        }, 0)
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: "cart-storage",
    },
  ),
)
