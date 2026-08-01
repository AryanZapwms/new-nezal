import { useLoadingStore } from "@/lib/store/loading-store"

export function useLoading() {
  const { startLoading, stopLoading } = useLoadingStore()

  async function withLoading<T>(
    fn: () => Promise<T>,
    message = "Please wait..."
  ): Promise<T> {
    startLoading(message)
    try {
      return await fn()
    } finally {
      stopLoading()
    }
  }

  return { startLoading, stopLoading, withLoading }
}