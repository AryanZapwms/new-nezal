const mongoose = require("mongoose")
const fs = require("fs")

const URI = "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority"

async function restore() {
  const raw = fs.readFileSync("products_backup.json", "utf8")
  const lines = raw.split("\n").filter(Boolean)
  const backup = lines.map((l) => JSON.parse(l))

  await mongoose.connect(URI)
  console.log("✅ Connected")

  const db = mongoose.connection.db
  let updated = 0

  for (const old of backup) {
    if (!old.image && !(old.images && old.images.length)) continue
    const result = await db.collection("products").updateOne(
      { slug: old.slug },
      { $set: { image: old.image, images: old.images } }
    )
    if (result.modifiedCount) {
      updated++
      console.log(`  ✓ ${old.slug}`)
    }
  }

  console.log(`\n✅ Images restored for ${updated} products`)
  await mongoose.disconnect()
  process.exit(0)
}

restore().catch((err) => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})