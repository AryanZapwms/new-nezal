// tests/setup-db.ts
//
// Shared helper for integration tests that exercise code paths calling
// lib/db.ts's connectDB(). Connects a real in-memory MongoDB directly (same
// approach as tests/sale.integration.test.ts) and then points connectDB()'s
// module-level connection cache at that same connection, so any internal
// `await connectDB()` call (lib/cart-server.ts, the API routes) reuses it
// instead of trying to dial the placeholder MONGODB_URI from vitest.config.ts.
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"

let mongod: MongoMemoryServer

export async function connectTestDb() {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())

  const cached = (global as any).mongoose
  if (cached) {
    cached.conn = mongoose.connection
    cached.promise = Promise.resolve(mongoose.connection)
  } else {
    ;(global as any).mongoose = { conn: mongoose.connection, promise: Promise.resolve(mongoose.connection) }
  }
}

export async function disconnectTestDb() {
  await mongoose.disconnect()
  await mongod.stop()
}
