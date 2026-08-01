// nezal-seed/list-products.js
//
// Prints every product's _id, name, variantLabel, and collectionSlug —
// used to build an accurate name-mapping against Product_GST_List.xlsx
// before running apply-gst-from-excel.js, since some product names in
// the DB don't exactly match the names in the Excel sheet.
//
// Usage:
//   node nezal-seed/list-products.js                 # prints to console
//   node nezal-seed/list-products.js > products.txt   # save to a file to paste back

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env if .env.local isn't present

import mongoose from "mongoose";

const MONGODB_URI = "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local or export it before running.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const Product = mongoose.connection.collection("products");

  const products = await Product.find(
    {},
    {
      projection: {
        name: 1,
        variantLabel: 1,
        collectionSlug: 1,
        gstPercent: 1,
        isActive: 1,
      },
    }
  )
    .sort({ collectionSlug: 1, name: 1 })
    .toArray();

  console.log(`Total products: ${products.length}\n`);

  for (const p of products) {
    console.log(
      `${p._id} | collection: ${p.collectionSlug || "-"} | variant: ${p.variantLabel || "-"} | name: ${p.name} | gstPercent: ${
        p.gstPercent ?? "not set"
      } | active: ${p.isActive}`
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});