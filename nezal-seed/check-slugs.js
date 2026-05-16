/**
 * NEZAL — List all product slugs in DB
 * Run: node nezal-seed/check-slugs.js
 */

const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

const productSchema = new mongoose.Schema({}, { strict: false });
delete mongoose.models.Product;
const Product = mongoose.model("Product", productSchema);

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  const products = await Product.find({}, { slug: 1, name: 1, _id: 0 }).lean();

  if (products.length === 0) {
    console.log("❌ No products found. Run seed.js first.");
  } else {
    console.log(`Found ${products.length} products:\n`);
    products.forEach((p) => console.log(`  slug: "${p.slug}"  →  name: "${p.name}"`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

check().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});