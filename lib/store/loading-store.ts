import { create } from "zustand"

interface LoadingStore {
  count: number
  message: string
  startLoading: (message?: string) => void
  stopLoading: () => void
  isLoading: boolean
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  count: 0,
  message: "",
  isLoading: false,
  startLoading: (message = "Please wait...") =>
    set((state) => ({
      count: state.count + 1,
      isLoading: true,
      message,
    })),
  stopLoading: () =>
    set((state) => {
      const count = Math.max(0, state.count - 1)
      return { count, isLoading: count > 0, message: count > 0 ? state.message : "" }
    }),
}))