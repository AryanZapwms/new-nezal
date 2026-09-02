import { defineConfig, configDefaults } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 60000,
    // Vitest's defaults don't know about Next.js's .next/ build output, so a
    // stale `.next/standalone` copy (from a prior `next build`) gets picked
    // up as if it were source and re-runs every test a second time against
    // build artifacts. Pre-existing gap, unrelated to this feature.
    exclude: [...configDefaults.exclude, "**/.next/**"],
    // lib/db.ts throws at import time if this is unset. Tests that touch the
    // DB connect a real MongoMemoryServer directly (see tests/setup-db.ts)
    // and point connectDB()'s cache at that connection, so this value is
    // never actually dialed — it only needs to exist to pass that check.
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/unused-test-placeholder",
    },
  },
})
