/**
 * nezal-seed/backfill-size-dimensions.js
 *
 * One-time migration: for every product that has size variants, copy the
 * base product's weight/length/breadth/height onto each size that doesn't
 * already have its own values set.
 *
 * This is a SAFE STARTING DEFAULT, not a correct value for multi-unit
 * bundles (e.g. "3-pack" or "3+1 Free") — those will still show the
 * single-unit weight/dimensions after this runs. Admins should go into
 * each bundle-style size in the admin panel and correct the weight/
 * dimensions to the actual packed measurement for that bundle.
 *
 * Run with: node nezal-seed/backfill-size-dimensions.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model("Product", productSchema, "products");

const isDryRun = process.argv.includes("--dry-run");

async function run() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("No MONGODB_URI / DATABASE_URL found in env.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to DB.");

  const products = await Product.find({ "sizes.0": { $exists: true } });
  console.log(`Found ${products.length} products with size variants.`);

  let productsUpdated = 0;
  let sizesUpdated = 0;
  let sizesSkipped = 0;

  for (const product of products) {
    let changed = false;

    const baseWeight = product.weight ?? 0.3;
    const baseLength = product.length ?? 10;
    const baseBreadth = product.breadth ?? 10;
    const baseHeight = product.height ?? 10;

    for (const size of product.sizes) {
      const hasAllDims =
        typeof size.weight === "number" &&
        typeof size.length === "number" &&
        typeof size.breadth === "number" &&
        typeof size.height === "number";

      if (hasAllDims) {
        sizesSkipped++;
        continue;
      }

      if (typeof size.weight !== "number") size.weight = baseWeight;
      if (typeof size.length !== "number") size.length = baseLength;
      if (typeof size.breadth !== "number") size.breadth = baseBreadth;
      if (typeof size.height !== "number") size.height = baseHeight;

      changed = true;
      sizesUpdated++;
    }

   if (changed) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would update: ${product.name} (${product._id})`);
      } else {
        product.markModified("sizes");
        await product.save();
        productsUpdated++;
        console.log(`Updated: ${product.name} (${product._id})`);
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Products updated: ${productsUpdated}`);
  console.log(`Size entries backfilled: ${sizesUpdated}`);
  console.log(`Size entries already had dimensions (skipped): ${sizesSkipped}`);
  console.log("\nIMPORTANT: bundle-style sizes (3-pack, 3+1 Free, etc.) now show");
  console.log("single-unit weight/dimensions as a placeholder. Go into the admin");
  console.log("panel and correct these to the actual packed weight for each bundle.");

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});