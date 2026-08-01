"use client"

import { useLoadingStore } from "@/lib/store/loading-store"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"

export function GlobalLoader() {
  const { isLoading, message } = useLoadingStore()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          {/* Pulsing logo */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-[var(--color-brand-primary)]"
          >
            <Image
              src="/nezallogo.jpg"
              alt="Nezal"
              fill
              className="object-contain"
              priority
            />
          </motion.div>

          {/* Bouncing dots */}
          <div className="flex items-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-primary)]"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-sm font-medium text-[var(--color-text-muted)]"
          >
            {message}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}