// lib/store/checkout-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CheckoutAddress {
  name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface PendingOrder {
  orderId: string
  createdAt: number
}

interface CheckoutStore {
  address: CheckoutAddress | null
  paymentMethod: string | null
  pendingOrder: PendingOrder | null
  setAddress: (address: CheckoutAddress) => void
  setPaymentMethod: (method: string) => void
  clearAddress: () => void
  setPendingOrder: (order: PendingOrder) => void
  clearPendingOrder: () => void
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      address: null,
      paymentMethod: null,
      pendingOrder: null,
      setAddress: (address) => set({ address }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      clearAddress: () => set({ address: null }),
      setPendingOrder: (order) => set({ pendingOrder: order }),
      clearPendingOrder: () => set({ pendingOrder: null }),
    }),
    {
      name: "nezal-checkout-storage",
    },
  ),
)