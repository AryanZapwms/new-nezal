import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: string[]; // product IDs
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  setItems: (ids: string[]) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (productId) =>
        set((s) => ({
          items: s.items.includes(productId)
            ? s.items.filter((id) => id !== productId)
            : [...s.items, productId],
        })),
      has: (productId) => get().items.includes(productId),
      setItems: (ids) => set({ items: ids }),
    }),
    { name: "wishlist" }
  )
);