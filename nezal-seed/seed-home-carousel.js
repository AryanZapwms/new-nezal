// nezal-seed/seed-home-carousel.js
// Migrates the hardcoded staticImages array from components/home-carousel.tsx
// into the HomeBanner collection, preserving the original click-routing
// (image[0] -> /shop/nezal, image[1] -> /shop/dermaflay).

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

const MONGODB_URI = "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority" // ← change this if your env var has a different name

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Check your .env.local file.")
  process.exit(1)
}

const homeBannerSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    linkType: {
      type: String,
      enum: ["product", "collection", "custom", "none"],
      default: "none",
    },
    link: { type: String, default: "" },
    linkLabel: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const HomeBanner =
  mongoose.models.HomeBanner || mongoose.model("HomeBanner", homeBannerSchema)

// Same order as the old staticImages array in components/home-carousel.tsx
const bannersToSeed = [
  {
    url: "/14.jpeg",
    linkType: "custom",
    link: "/shop/nezal",
    linkLabel: "Shop Nezal",
  },
  {
    url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990599/image9_a1avzr.png",
    linkType: "custom",
    link: "/shop/dermaflay",
    linkLabel: "Shop Dermaflay",
  },
  {
    url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990599/image7_wfgoej.png",
    linkType: "none",
  },
  {
    url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990598/image8_cqm0fb.png",
    linkType: "none",
  },
  {
    url: "/13.jpeg",
    linkType: "none",
  },
  {
    url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990692/image10_escelc.png",
    linkType: "none",
  },
  {
    url: "/12.jpeg",
    linkType: "none",
  },
  {
    url: "/11.jpeg",
    linkType: "none",
  },
]

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log("Connected to MongoDB")

  const existingCount = await HomeBanner.countDocuments()
  if (existingCount > 0) {
    console.log(`HomeBanner collection already has ${existingCount} document(s).`)
    console.log("Skipping seed to avoid duplicates. Delete existing banners first if you want to re-seed.")
    await mongoose.disconnect()
    return
  }

  const docs = bannersToSeed.map((banner, index) => ({
    ...banner,
    order: index,
    isActive: true,
  }))

  const inserted = await HomeBanner.insertMany(docs)
  console.log(`Inserted ${inserted.length} banners into HomeBanner collection.`)

  await mongoose.disconnect()
  console.log("Done.")
}

run().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})