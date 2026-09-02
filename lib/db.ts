import mongoose from "mongoose"

// Register all models once — prevents MissingSchemaError across all routes
import "@/lib/models/product";
import "@/lib/models/category";
import "@/lib/models/company";
import "@/lib/models/order";
import "@/lib/models/cart";
// add any other models here


const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

let cached = global.mongoose 
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      maxPoolSize: 10,        // allow up to 10 simultaneous DB operations
      minPoolSize: 2,         // keep 2 connections warm at all times
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
    })
  }
  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }
  return cached.conn
}