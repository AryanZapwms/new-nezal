/**
 * ============================================================
 *  NEZAL HERBOCARE — Fix Subcategory Script
 *  Run: node nezal-seed/fix-subcategories.js
 *
 *  Non-destructive — only updates the subCategory field on
 *  3 existing Collection documents. Does not delete or insert.
 * ============================================================
 */

const mongoose = require("mongoose")

const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority"

const collectionSchema = new mongoose.Schema(
  {
    navCategory: String,
    subCategory: {
      type: String,
      enum: ["face-care", "soaps", "body-care", "hair-care", "gift-kits", "bath-shower", "massage-oil"],
    },
  },
  { strict: false } // don't touch any other fields
)
delete mongoose.models.Collection
const Collection = mongoose.model("Collection", collectionSchema)

const fixes = [
  { slug: "shower-gel",        subCategory: "bath-shower" },
  { slug: "bath-salt",         subCategory: "bath-shower" },
  { slug: "body-massage-oil",  subCategory: "massage-oil" },
]

async function run() {
  console.log("\n🌱  Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("✅  Connected\n")

  for (const fix of fixes) {
    const existing = await Collection.findOne({ slug: fix.slug })
    if (!existing) {
      console.log(`   ⚠️  No collection found with slug "${fix.slug}" — skipping (may need to be created, not just fixed)`)
      continue
    }
    console.log(`   • Found "${existing.name}" (slug: ${fix.slug}) — current subCategory: "${existing.subCategory}"`)
    const result = await Collection.updateOne(
      { slug: fix.slug },
      { $set: { subCategory: fix.subCategory } }
    )
    console.log(`     ✓ Updated subCategory → "${fix.subCategory}" (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`)
  }

  console.log("\n✅  Done.\n")
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error("\n❌  Fix failed:", err.message)
  process.exit(1)
})