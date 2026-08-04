// Integration tests against a real (in-memory) MongoDB, exercising the
// bulk-write / collection-membership paths that computeEffectiveSale()
// alone can't cover: applying a collection sale to every product in it,
// clearing it, and the add/remove-from-collection hooks.
//
// Note on "multi-collection membership" (mentioned in the original feature
// request): Product.collectionSlug is a single string field, not an array —
// a product can only belong to one collection today, so that scenario
// can't actually occur and isn't tested here. See lib/models/product.ts.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { Product } from "@/lib/models/product"
import { Collection } from "@/lib/models/collection"
import { FlashSale } from "@/lib/models/flashsale"
import {
  setDirectSale,
  clearDirectSale,
  applyCollectionSale,
  clearCollectionSale,
  inheritCollectionSaleOnAdd,
  removeCollectionSaleOnRemove,
} from "@/lib/sale"
import { getActiveFlashSaleMap, applyFlashSale } from "@/lib/flashSale"

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await Promise.all([
    Product.deleteMany({}),
    Collection.deleteMany({}),
    FlashSale.deleteMany({}),
  ])
})

async function makeCollection(overrides: Partial<any> = {}) {
  return Collection.create({
    name: "Summer Essentials",
    slug: "summer-essentials",
    navCategory: "face-care",
    subCategory: "face-care",
    ...overrides,
  })
}

async function makeProduct(overrides: Partial<any> = {}) {
  return Product.create({
    name: "Aloe Gel",
    slug: "aloe-gel",
    price: 1000,
    company: new mongoose.Types.ObjectId(),
    sku: "SKU-1",
    ...overrides,
  })
}

describe("applyCollectionSale", () => {
  it("applies the sale to every current product in the collection", async () => {
    const collection = await makeCollection()
    const p1 = await makeProduct({ name: "A", slug: "a", collectionSlug: collection.slug })
    const p2 = await makeProduct({ name: "B", slug: "b", collectionSlug: collection.slug })
    const other = await makeProduct({ name: "Other", slug: "other" }) // not in the collection

    const { affectedCount } = await applyCollectionSale(collection.slug, 20)
    expect(affectedCount).toBe(2)

    const updated1 = await Product.findById(p1._id)
    const updated2 = await Product.findById(p2._id)
    const updatedOther = await Product.findById(other._id)

    expect(updated1!.saleSource).toBe("collection")
    expect(updated1!.salePercentage).toBe(20)
    expect(updated1!.discountPrice).toBe(800)
    expect(updated2!.saleSource).toBe("collection")
    expect(updatedOther!.saleSource).toBe("none")
  })
})

describe("direct vs collection priority ('last write wins')", () => {
  it("a collection sale set after a direct sale overrides it", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await setDirectSale(product._id.toString(), 10)
    let current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("direct")
    expect(current!.discountPrice).toBe(900)

    await applyCollectionSale(collection.slug, 30)
    current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("collection")
    expect(current!.discountPrice).toBe(700)
    // the direct sale record itself must survive, shadowed but not deleted,
    // so clearing the collection sale can fall back to it
    expect(current!.directSalePercentage).toBe(10)
  })

  it("a direct sale set after a collection sale overrides it", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await applyCollectionSale(collection.slug, 30)
    let current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("collection")

    await setDirectSale(product._id.toString(), 10)
    current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("direct")
    expect(current!.discountPrice).toBe(900)
    // the collection sale record survives, shadowed
    expect(current!.collectionSalePercentage).toBe(30)
  })

  it("resubmitting the same direct sale percentage does not bump its priority", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await setDirectSale(product._id.toString(), 10) // direct wins, older
    await applyCollectionSale(collection.slug, 30) // collection wins, newer
    await setDirectSale(product._id.toString(), 10) // same %, no-op resubmit — must NOT steal priority

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("collection")
  })
})

describe("clearing a collection sale", () => {
  it("reverts affected products to their direct sale if one still exists", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await setDirectSale(product._id.toString(), 10)
    await applyCollectionSale(collection.slug, 30) // collection now wins

    await clearCollectionSale(collection.slug)

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("direct")
    expect(current!.salePercentage).toBe(10)
    expect(current!.discountPrice).toBe(900)
  })

  it("removes the sale entirely if there is no direct sale to fall back to", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await applyCollectionSale(collection.slug, 30)
    await clearCollectionSale(collection.slug)

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("none")
    expect(current!.discountPrice).toBeNull()
  })
})

describe("collection membership hooks", () => {
  it("a product added to a collection with an active sale inherits it immediately", async () => {
    const collection = await makeCollection({ salePercentage: 25, saleAppliedAt: new Date() })
    const product = await makeProduct({ price: 1000 }) // not in the collection yet

    await inheritCollectionSaleOnAdd(product._id.toString(), collection.slug)

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("collection")
    expect(current!.salePercentage).toBe(25)
    expect(current!.discountPrice).toBe(750)
  })

  it("removing a product from its collection clears a collection-sourced sale", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })
    await applyCollectionSale(collection.slug, 30)

    await removeCollectionSaleOnRemove(product._id.toString(), collection._id)

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("none")
  })

  it("removing a product from its collection falls back to a direct sale if one exists", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })
    await setDirectSale(product._id.toString(), 10)
    await applyCollectionSale(collection.slug, 30)

    await removeCollectionSaleOnRemove(product._id.toString(), collection._id)

    const current = await Product.findById(product._id)
    expect(current!.saleSource).toBe("direct")
    expect(current!.salePercentage).toBe(10)
  })
})

describe("flash sale overrides both direct and collection sale for display", () => {
  it("applyFlashSale overrides the effective discountPrice while a flash sale is active", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await setDirectSale(product._id.toString(), 10)
    await applyCollectionSale(collection.slug, 30) // collection is the "most recent" underlying record

    await FlashSale.create({
      name: "Flash Friday",
      discountPercent: 50,
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 3600_000),
      products: [product._id],
      isActive: true,
    })

    const stored = (await Product.findById(product._id).lean()) as any
    expect(stored.saleSource).toBe("collection") // underlying record unaffected by flash sale
    expect(stored.discountPrice).toBe(700) // pre-flash effective price, kept up to date

    const flashSaleMap = await getActiveFlashSaleMap()
    const displayed = applyFlashSale(stored, flashSaleMap)
    expect(displayed.discountPrice).toBe(500) // flash sale wins for display: 1000 - 50%
    expect(displayed.flashSale?.discountPercent).toBe(50)
  })

  it("falls back to the most-recently-set of direct/collection once the flash sale ends", async () => {
    const collection = await makeCollection()
    const product = await makeProduct({ collectionSlug: collection.slug, price: 1000 })

    await applyCollectionSale(collection.slug, 30)
    await setDirectSale(product._id.toString(), 10) // direct is now most recent

    await FlashSale.create({
      name: "Expired Flash",
      discountPercent: 50,
      startsAt: new Date(Date.now() - 7200_000),
      endsAt: new Date(Date.now() - 3600_000), // already ended
      products: [product._id],
      isActive: true,
    })

    const stored = (await Product.findById(product._id).lean()) as any
    const flashSaleMap = await getActiveFlashSaleMap() // empty — the sale above has ended
    expect(flashSaleMap.size).toBe(0)

    const displayed = applyFlashSale(stored, flashSaleMap)
    expect(displayed.discountPrice).toBe(900) // direct sale (10%), not collection
  })
})
