/**
 * ============================================================
 *  MIGRATE: existing discountPrice (₹) -> directSalePercentage (%)
 * ------------------------------------------------------------
 *  Backfills the new collection-sale feature's data model. Any product that
 *  already has a discountPrice < price is treated as having had a direct
 *  sale applied — we compute the equivalent percentage and stamp it as the
 *  "most recently set" sale record (directSaleAppliedAt = now), then let
 *  the normal effective-sale computation fill in saleSource/salePercentage/
 *  saleAppliedAt so the site's displayed price doesn't change.
 *
 *  Products with no discountPrice, or discountPrice >= price, are left
 *  alone (saleSource stays "none").
 *
 *  Usage:
 *    node scripts/migrate-direct-sale-percentage.js            # dry run (safe, default)
 *    node scripts/migrate-direct-sale-percentage.js --apply    # actually writes the change
 *
 *  Requires MONGODB_URI to be set in your environment, e.g.:
 *    $env:MONGODB_URI="mongodb+srv://..." ; node scripts/migrate-direct-sale-percentage.js
 * ============================================================
 */

import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const require = createRequire(import.meta.url);
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch {
  /* dotenv not installed — that's fine */
}

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const APPLY = process.argv.includes("--apply");

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Set it in your env or .env.local, then re-run.");
  process.exit(1);
}

const Product = mongoose.models.Product || mongoose.model(
  "Product",
  new mongoose.Schema({ name: String, price: Number, discountPrice: Number }, { strict: false })
);

async function main() {
  console.log(`\n🔌  Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log(`✅  Connected.\n`);

  const candidates = await Product.find({
    discountPrice: { $ne: null, $gt: 0 },
  }, { name: 1, price: 1, discountPrice: 1 }).lean();

  const now = new Date();
  const toMigrate = [];

  for (const p of candidates) {
    if (!(p.price > 0) || !(p.discountPrice < p.price)) continue;
    const percentage = Math.round(((p.price - p.discountPrice) / p.price) * 100);
    if (!(percentage > 0)) continue;
    toMigrate.push({ ...p, percentage });
  }

  if (toMigrate.length === 0) {
    console.log("✅  Nothing to migrate — no products have an active-looking discountPrice.");
    await mongoose.disconnect();
    return;
  }

  console.log(`📦  ${toMigrate.length} product(s) will get a direct sale record:\n`);
  for (const p of toMigrate) {
    console.log(`   - "${p.name}"  [${p._id}]  ₹${p.price} -> ₹${p.discountPrice}  (${p.percentage}% off)`);
  }

  if (!APPLY) {
    console.log(`\n👀  Dry run only — no changes written. Re-run with --apply to migrate the ${toMigrate.length} product(s) above.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`\n✍️   Applying migration...`);
  for (const p of toMigrate) {
    // discountPrice is recomputed from the percentage (round-trip) rather
    // than left as the old raw value, so it always agrees with salePercentage.
    const discountPrice = Math.round(p.price - (p.price * p.percentage) / 100);
    await Product.updateOne(
      { _id: p._id },
      {
        $set: {
          directSalePercentage: p.percentage,
          directSaleAppliedAt: now,
          saleSource: "direct",
          salePercentage: p.percentage,
          saleSourceId: null,
          saleAppliedAt: now,
          discountPrice,
        },
      }
    );
    console.log(`   ✅  Migrated "${p.name}"`);
  }

  console.log(`\n🎉  Done.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
