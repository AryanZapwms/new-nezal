// nezal-seed/apply-hsn.js
//
// Applies HSN codes by collectionSlug, using confirmed codes from CA.
// 5 products across 2 collections are NOT yet covered — see
// UNMAPPED_COLLECTIONS below — set those manually once confirmed.
//
// Usage:
//   node nezal-seed/apply-hsn.js            # dry run
//   node nezal-seed/apply-hsn.js --apply    # writes to the database

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const APPLY = process.argv.includes("--apply");

// ─── Confirmed HSN codes, by collectionSlug ─────────────────────────────
const COLLECTION_HSN_MAP = {
  "aissis-soap": "34011190",
  "bathing-bar": "34011190",
  "chip-soap": "34011190",
  "designer-soap": "34011190",
  "doobie-soap": "34011190",
  "premium-soap": "34011190",
  "rock-soap": "34011190",
  "round-soap": "34011190",
  "hand-wash": "34029099",
  "face-wash": "33049910",
  "foaming-face-wash": "33049910",
  "face-moisturizer": "33049930",
  "shampoo": "33051090",
  "conditioner": "33059090",
  "shower-gel": "34012000",
  "body-lotion": "33049990",
  "bath-salt": "33073090",
  "aloe-vera-gel": "30049011",
  "body-massage-oil": "30049099",
  "face-serum": "33049910",
  "hair-serum": "33059090",
  "intimate-wash": "34012000",
};

// Products with no collectionSlug — matched by _id instead
const NO_COLLECTION_HSN_MAP = {
  "6a3ba3bfdaa233713535089b": "33049990", // Apricot Body Scrub → Body Scrub
  "6a34e4bd2d10235bec79b3c2": "34029099", // Tulsi & Orange Hand Wash → Hand Wash
};

// Collections with no confirmed HSN yet — will be listed, not touched
const UNMAPPED_COLLECTIONS = [
  "face-scrub",  // Apricot Face Scrub — face vs body scrub distinction unconfirmed
  "gift-kits",   // 4 products — may need per-item breakdown instead of one HSN
];

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local or export it before running.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const Product = mongoose.connection.collection("products");

  const all = await Product.find({}, { projection: { name: 1, collectionSlug: 1 } }).toArray();

  const toUpdate = [];
  const skipped = [];

  for (const p of all) {
    if (NO_COLLECTION_HSN_MAP[p._id.toString()]) {
      toUpdate.push({ id: p._id, name: p.name, hsn: NO_COLLECTION_HSN_MAP[p._id.toString()] });
    } else if (p.collectionSlug && COLLECTION_HSN_MAP[p.collectionSlug]) {
      toUpdate.push({ id: p._id, name: p.name, hsn: COLLECTION_HSN_MAP[p.collectionSlug] });
    } else {
      skipped.push({ name: p.name, collection: p.collectionSlug || "(none)" });
    }
  }

  console.log(`${toUpdate.length} products will be updated. ${skipped.length} skipped (no confirmed HSN yet).\n`);

  if (!APPLY) {
    console.log("── DRY RUN ──");
    toUpdate.forEach((p) => console.log(`${p.name} → HSN ${p.hsn}`));
  } else {
    console.log("── APPLYING ──");
    let updated = 0;
    for (const p of toUpdate) {
      const res = await Product.updateOne({ _id: p.id }, { $set: { hsn: p.hsn } });
      if (res.matchedCount > 0) updated++;
    }
    console.log(`Done. Updated ${updated} of ${toUpdate.length} products.`);
  }

  console.log("\n── SKIPPED — no confirmed HSN, set manually via admin ──");
  skipped.forEach((p) => console.log(`${p.name} (collection: ${p.collection})`));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});