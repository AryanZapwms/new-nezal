// Tests for the server-rendered product page (app/shop/[company]/product/[id]/page.tsx):
// its SEO tags (the canonical URL must be the link the Meta catalog feed uses,
// whatever brand slug the visited URL has), 404s for bad or unknown ids, and
// the props it hands the client component.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import mongoose from "mongoose"
import { Company } from "@/lib/models/company"
import { Product } from "@/lib/models/product"
import { Review } from "@/lib/models/review"
import { BRAND } from "@/lib/config"
import { buildMetaFeedRow } from "@/lib/meta-catalog"
import { connectTestDb, disconnectTestDb } from "./setup-db"

// The UI itself isn't under test here
vi.mock("@/app/shop/[company]/product/[id]/product-detail-client", () => ({ default: () => null }))

let product: any
let orphan: any

beforeAll(async () => {
  await connectTestDb()
  const nh = await Company.create({ name: "nh", slug: "nh" })
  product = await Product.create({
    name: "Kumkumadi Face Oil, ",
    slug: "kumkumadi",
    sku: "K1",
    price: 1000,
    company: nh._id,
    image: "https://nezal-cdn.b-cdn.net/k-main.jpg",
    images: ["https://nezal-cdn.b-cdn.net/k-1.jpg"],
    description:
      '"Radiance in a drop\nA saffron and sandalwood face oil that evens skin tone, fades dark spots and brings back a natural glow when used every night for a few weeks."',
    stock: 3,
  })
  orphan = await Product.create({
    name: "Orphan Soap",
    slug: "orphan",
    sku: "O1",
    price: 150,
    company: new mongoose.Types.ObjectId(),
    images: ["/uploads/orphan.jpg"],
  })
  await Review.create({
    product: product._id,
    company: nh._id,
    user: new mongoose.Types.ObjectId(),
    rating: 5,
    comment: "Lovely",
    userName: "Asha",
    userEmail: "asha@example.com",
    status: "approved",
  })
})

afterAll(async () => {
  await disconnectTestDb()
})

const page = () => import("@/app/shop/[company]/product/[id]/page")
const params = (company: string, id: string) => ({ params: Promise.resolve({ company, id }) })

describe("product page metadata", () => {
  it("canonical is the feed's link for the product, even under another brand slug", async () => {
    const { generateMetadata } = await page()
    const id = product._id.toString()
    const metadata: any = await generateMetadata(params("nezal", id))

    const feedProduct = await Product.findById(id).populate("company", "slug isActive").lean<any>()
    const feedLink = buildMetaFeedRow(feedProduct, new Map())?.link

    expect(metadata.alternates.canonical).toBe(`${BRAND.domain}/shop/nh/product/${id}`)
    expect(metadata.alternates.canonical).toBe(feedLink)
    expect(metadata.openGraph.url).toBe(feedLink)
  })

  it("title, description and a product image without a made-up size", async () => {
    const { generateMetadata } = await page()
    const metadata: any = await generateMetadata(params("nh", product._id.toString()))

    expect(metadata.title).toBe(`Kumkumadi Face Oil | ${BRAND.name}`)
    expect(metadata.description.startsWith("Radiance in a drop. A saffron and sandalwood face oil")).toBe(true)
    expect(metadata.description.length).toBeLessThanOrEqual(160)
    expect(metadata.description.endsWith("…")).toBe(true)
    expect(metadata.openGraph.images).toEqual([{ url: "https://nezal-cdn.b-cdn.net/k-main.jpg", alt: "Kumkumadi Face Oil" }])
    expect(metadata.twitter.images).toEqual(["https://nezal-cdn.b-cdn.net/k-main.jpg"])
  })

  it("a product whose brand was deleted keeps the URL's slug and falls back to the gallery image", async () => {
    const { generateMetadata } = await page()
    const id = orphan._id.toString()
    const metadata: any = await generateMetadata(params("nezal", id))
    expect(metadata.alternates.canonical).toBe(`${BRAND.domain}/shop/nezal/product/${id}`)
    expect(metadata.openGraph.images[0].url).toBe(`${BRAND.domain}/uploads/orphan.jpg`)
  })

  it("404s for an unknown product", async () => {
    const { generateMetadata } = await page()
    await expect(generateMetadata(params("nh", new mongoose.Types.ObjectId().toString()))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    })
  })
})

describe("product page", () => {
  it("passes the product and its reviews to the client component", async () => {
    const { default: ProductPage } = await page()
    const id = product._id.toString()
    const element: any = await ProductPage(params("anything", id))

    expect(element.key).toBe(id)
    expect(element.props.product).toMatchObject({ _id: id, name: "Kumkumadi Face Oil, ", company: { slug: "nh" } })
    expect(element.props.initialReviews.summary).toMatchObject({ total: 1, averageRating: 5 })
    expect(element.props.initialReviews.reviews[0]).toMatchObject({ userName: "Asha", comment: "Lovely" })
  })

  it("404s for an invalid id or an unknown product", async () => {
    const { default: ProductPage } = await page()
    await expect(ProductPage(params("nh", "not-a-product"))).rejects.toMatchObject({ digest: expect.stringContaining("404") })
    await expect(ProductPage(params("nh", new mongoose.Types.ObjectId().toString()))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    })
  })
})
