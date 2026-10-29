// Pins the indexes Mongoose builds for Product, Review and User (autoIndex
// runs them on app start against whatever MONGODB_URI points at — see the
// index commits' note about taking an Atlas snapshot first).
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Product } from "@/lib/models/product"
import { Review } from "@/lib/models/review"
import { User } from "@/lib/models/user"
import { connectTestDb, disconnectTestDb } from "./setup-db"

const keysOf = async (model: any) => {
  await model.init() // waits for autoIndex to finish building
  const indexes = await model.collection.indexes()
  return indexes.map((i: any) => JSON.stringify(i.key))
}

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

describe("model indexes", () => {
  it("Product has the listing indexes", async () => {
    const keys = await keysOf(Product)
    expect(keys).toContain(JSON.stringify({ isActive: 1, company: 1, sortOrder: 1, createdAt: -1 }))
    expect(keys).toContain(JSON.stringify({ isActive: 1, category: 1, sortOrder: 1, createdAt: -1 }))
  })

  it("Review has the testimonials and product-reviews indexes", async () => {
    const keys = await keysOf(Review)
    expect(keys).toContain(JSON.stringify({ status: 1, rating: -1, createdAt: -1 }))
    expect(keys).toContain(JSON.stringify({ product: 1, status: 1, createdAt: -1 }))
  })

  it("User has the source and (non-unique) phone indexes", async () => {
    await User.init()
    const indexes = await User.collection.indexes()
    const byKey = (key: object) => indexes.find((i: any) => JSON.stringify(i.key) === JSON.stringify(key))
    expect(byKey({ source: 1 })).toBeTruthy()
    expect(byKey({ phone: 1 })).toBeTruthy()
    expect(byKey({ phone: 1 })?.unique).toBeFalsy()
  })
})
