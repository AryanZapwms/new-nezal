// nezal-seed/apply-gst.js
//
// Applies GST% to products using a hand-verified mapping (built by
// cross-referencing Product_GST_List.xlsx against the actual product
// list from list-products.js — not fuzzy string matching).
//
// 83 of 88 products are covered below. The remaining 5 (SeaFresh Bath
// Salt + the 4 Gift Kits) aren't in the Excel sheet — set their GST%
// manually via the admin product edit page.
//
// Usage:
//   node nezal-seed/apply-gst.js            # dry run — prints what would change
//   node nezal-seed/apply-gst.js --apply    # writes to the database


import mongoose from "mongoose";

const MONGODB_URI = "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

const APPLY = process.argv.includes("--apply");

// ─── Hand-verified mapping: _id → gstPercent ────────────────────────────
const GST_MAP = {
  // 5% — Bathing Bars
  "6a0d9d9edf37fac29c20d5e2": 5, // Citrus Blast Bathing Bar
  "6a0d9d9edf37fac29c20d5e8": 5, // Fasli Gulab Bathing Bar
  "6a0d9d9edf37fac29c20d5ed": 5, // Morning Fresh Bathing Bar
  "6a0d9d9edf37fac29c20d5f2": 5, // Neem & Tulsi Bathing Bar
  "6a0d9d9edf37fac29c20d5f8": 5, // Passion Bathing Bar

  // 5% — Handwash
  "6a0d7e252f7e0d5d2c727cde": 5, // Tulsi & Green Apple Handwash
  "6a0d7e252f7e0d5d2c727ce3": 5, // Tulsi & Lime Handwash
  "6a34e4bd2d10235bec79b3c2": 5, // Tulsi & Orange Hand Wash
  "6a0d7e252f7e0d5d2c727ce8": 5, // Tulsi & Peach Handwash

  // 5% — Shampoo
  "6a0d7e252f7e0d5d2c727c93": 5, // Amla & Shikakai Shampoo
  "6a0d7e252f7e0d5d2c727c86": 5, // Black Pepper & Cucumber Shampoo
  "6a0d7e252f7e0d5d2c727c98": 5, // Neem & Tulsi Shampoo

  // 5% — Aissis Soap
  "6a0d7e252f7e0d5d2c727d5a": 5, // Green Apple Aissis Soap
  "6a0d7e252f7e0d5d2c727d37": 5, // Green Tea Scrub Aissis Soap
  "6a0d7e252f7e0d5d2c727d3b": 5, // Jasmine Aissis Soap
  "6a0d7e252f7e0d5d2c727d44": 5, // Orange Peel Aissis Soap
  "6a0d7e252f7e0d5d2c727d48": 5, // Peppermint & Cucumber Aissis Soap
  "6a0d7e252f7e0d5d2c727d40": 5, // Rose Aissis Soap
  "6a0d7e252f7e0d5d2c727d4d": 5, // Sandalwood & Almond Aissis Soap
  "6a0d7e252f7e0d5d2c727d52": 5, // Seafresh Aissis Soap
  "6a0d7e252f7e0d5d2c727d56": 5, // Tropical Aissis Soap

  // 5% — Chip Soap
  "6a34e5762d10235bec79b3d4": 5, // Jasmine Chip Soap
  "6a0d7e252f7e0d5d2c727d8d": 5, // Lemongrass Chip Soap
  "6a34e6052d10235bec79b3e6": 5, // Rose & Rosemary Chip Soap
  "6a34df6a0856964531528283": 5, // Saffron Chip Soap
  "6a0d7e252f7e0d5d2c727d87": 5, // Seafresh Chip Soap
  "6a0d7e252f7e0d5d2c727d82": 5, // Strawberry Chip Soap

  // 5% — Designer Soap
  "6a0d7e252f7e0d5d2c727cf6": 5, // Brightening Lemon Designer Soap
  "6a0d7e252f7e0d5d2c727cfb": 5, // Juicy Watermelon Designer Soap
  "6a34e11c37a4e3220bfbf3e2": 5, // Orange Designer Soap
  "6a0d9d9edf37fac29c20d5de": 5, // Pastry Designer Soap

  // 5% — Doobie Soap
  "6a0d7e252f7e0d5d2c727da1": 5, // Doobie Cincinnati White Bath Soap
  "6a34eb979221f622848d1168": 5, // Doobie French Rose Bath Soap
  "6a0d9d9edf37fac29c20d5fd": 5, // Doobie Neem & Tulsi Bath Soap
  "6a0d9d9edf37fac29c20d601": 5, // Doobie Rustic Sandal Bath Soap

  // 5% — Premium Soap
  "6a0d7e252f7e0d5d2c727d1a": 5, // Charcoal Lemon Premium Soap
  "6a0d7e252f7e0d5d2c727d32": 5, // Coconut Milk & Honey Premium Soap
  "6a0d7e252f7e0d5d2c727d2d": 5, // Lemongrass, Lemon, Peppermint & Thyme Leaf Premium Soap
  "6a0d7e252f7e0d5d2c727d05": 5, // Papaya Whitening Premium Soap
  "6a0d7e252f7e0d5d2c727d28": 5, // Pineapple Aqua Moisturizing Premium Soap
  "6a0d7e252f7e0d5d2c727d24": 5, // Black Grapes Premium Soap
  "6a0d7e252f7e0d5d2c727d0a": 5, // Chocolate Vanilla Premium Soap
  "6a0d7e252f7e0d5d2c727d1f": 5, // Rose Aqua Moisturising Premium Soap
  "6a0d7e252f7e0d5d2c727d0f": 5, // Saffron, Turmeric & Sandalwood Premium Soap
  "6a0d7e252f7e0d5d2c727d15": 5, // Strawberry with Mulberry Premium Soap

  // 5% — Rock Soap
  "6a0d7e252f7e0d5d2c727d5e": 5, // Jasmine Rock Soap
  "6a0d7e252f7e0d5d2c727d65": 5, // Lavender Rock Soap
  "6a0d7e252f7e0d5d2c727d71": 5, // Rose Rock Soap
  "6a0d7e252f7e0d5d2c727d6b": 5, // Peppermint & Cucumber Rock Soap
  "6a0d7e252f7e0d5d2c727d7c": 5, // Sandalwood Rock Soap
  "6a0d7e252f7e0d5d2c727d76": 5, // Strawberry Rock Soap

  // 5% — Round Soap
  "6a0d7e252f7e0d5d2c727d98": 5, // Apple Blossom Round Soap
  "6a34e839c26d15fc78ef4d39": 5, // Honey & Oatmeal Round Soap
  "6a34e7082d10235bec79b3f8": 5, // Lavender & Geranium Round Soap
  "6a0d7e252f7e0d5d2c727d93": 5, // Milk & Rose Round Soap
  "6a34e78b0be17def6de4399f": 5, // Multani Mitti Round Soap
  "6a34e99f9221f622848d1134": 5, // Orange & Bergamot Round Soap
  "6a0d7e252f7e0d5d2c727d9c": 5, // Peach & Mix Fruit Round Soap
  "6a34e8e72d10235bec79b40a": 5, // Tea Tree & Peppermint Round Soap
  "6a34ea4d2d10235bec79b41c": 5, // Tropical Island Round Soap

  // 18% — Body Care
  "6a0d7e252f7e0d5d2c727cb1": 18, // Honey Cream Body Lotion
  "6a0e969fd70eacf9b5bb0041": 18, // Frangipani Body Lotion
  "6a0d7e252f7e0d5d2c727cb8": 18, // Caramel Crush Body Lotion
  "6a0d7e252f7e0d5d2c727cbf": 18, // Cedarwood Body Massage Oil
  "6a3ba3bfdaa233713535089b": 18, // Apricot Body Scrub
  "6a0d7e252f7e0d5d2c727cc8": 18, // Coffee Beans Shower Gel
  "6a0d7e252f7e0d5d2c727cc3": 18, // Orange Fresh Shower Gel
  "6a0d7e252f7e0d5d2c727ccc": 18, // Sea Fresh Shower Gel

  // 18% — Face Care
  "6a0d9d9edf37fac29c20d5a6": 18, // Almond Bliss Face Moisturizer
  "6a0d9d9edf37fac29c20d5c7": 18, // Acne Control Face Serum
  "6a0d9d9edf37fac29c20d5cc": 18, // Anti-Aging Face Serum
  "6a0d9d9edf37fac29c20d5d0": 18, // Glow Face Serum
  "6a0d9d9edf37fac29c20d5d9": 18, // Apricot Face Scrub
  "6a0d9d9edf37fac29c20d5ac": 18, // Aloe Vera & Vitamin C Foaming Face Wash
  "6a0d9d9edf37fac29c20d5b2": 18, // Apple Cider Vinegar Foaming Face Wash
  "6a0d9d9edf37fac29c20d5bd": 18, // Neem & Tulsi Face Wash
  "6a0d9d9edf37fac29c20d5b6": 18, // Ubtan D Tan Face Wash

  // 18% — Gel
  "6a0d7e252f7e0d5d2c727cac": 18, // Aloe Vera Gel

  // 18% — Hair Care
  "6a0d7e252f7e0d5d2c727c9e": 18, // Black Grapes Conditioner with Seaweed Extract
  "6a0d7e252f7e0d5d2c727ca2": 18, // Hair Regrowth Serum

  // 18% — Hygiene
  "6a0d7e252f7e0d5d2c727cf1": 18, // Intimate Hygiene Unisex Foam Wash

  // 18% — Bath Salt
  "6a0d7e252f7e0d5d2c727cd6": 18, // Lavender Bath Salt
  "6a0d7e252f7e0d5d2c727cd1": 18, // Rose Bath Salt
};

// Products confirmed NOT in the Excel sheet — set these manually in admin
const KNOWN_UNMAPPED = [
  { id: "6a0d7e252f7e0d5d2c727cda", name: "SeaFresh Bath Salt" },
  { id: "6a0d7e252f7e0d5d2c727da4", name: "Comfort Mono Gift Kit" },
  { id: "6a0d7e252f7e0d5d2c727da5", name: "Comfort Neo Gift Kit" },
  { id: "6a0d7e252f7e0d5d2c727da6", name: "Essential Gift Kit" },
  { id: "6a0d7e252f7e0d5d2c727da7", name: "Essential Plus Gift Kit" },
];

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local or export it before running.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const Product = mongoose.connection.collection("products");

  const ids = Object.keys(GST_MAP);
  console.log(`Mapping covers ${ids.length} products.\n`);

  if (!APPLY) {
    console.log("── DRY RUN — no changes made ──");
    for (const id of ids) {
      const doc = await Product.findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { name: 1 } });
      if (!doc) {
        console.log(`⚠️  ID not found in DB: ${id} — was it deleted/changed since list-products.js ran?`);
        continue;
      }
      console.log(`${doc.name} → ${GST_MAP[id]}%`);
    }
  } else {
    console.log("── APPLYING ──");
    let updated = 0;
    for (const id of ids) {
      const res = await Product.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { gstPercent: GST_MAP[id] } }
      );
      if (res.matchedCount > 0) updated++;
      else console.log(`⚠️  ID not found, skipped: ${id}`);
    }
    console.log(`Done. Updated ${updated} of ${ids.length} products.`);
  }

  console.log("\n── Not in the Excel sheet — set these manually via admin ──");
  KNOWN_UNMAPPED.forEach((p) => console.log(`${p.name} (${p.id})`));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 