/**
 * backfill-product-weights.js
 * Non-destructive — skips products that already have a weight set.
 * Set FORCE_UPDATE = true to overwrite existing weights.
 *
 * Run: node nezal-seed/backfill-product-weights.js
 */

const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

const FORCE_UPDATE = false;

/**
 * Shipping weights in kg (product weight + packaging).
 * Convention:
 *   75g soap     → 0.15 kg
 *   85g soap     → 0.18 kg
 *   100g soap    → 0.20 kg
 *   120g soap    → 0.25 kg
 *   50ml liquid  → 0.10 kg
 *   100ml liquid → 0.18 kg
 *   150ml liquid → 0.25 kg
 *   180ml liquid → 0.30 kg
 *   200ml liquid → 0.32 kg
 *   250ml liquid → 0.38 kg
 *   500ml liquid → 0.65 kg
 *   500g product → 0.65 kg
 *   Gift kits    → estimated
 */
const PRODUCT_WEIGHTS = {
  // ── Shampoos ──
  "cucumber-black-pepper-scalp-soothing-dandruff-shampoo-500ml": 0.65,
  "aloe-vera-amla-shikakai-hairloss-shampoo":                    0.38,
  "neem-tulsi-aloe-vera-hair-growth-shampoo":                    0.38,

  // ── Conditioner ──
  "black-grapes-conditioner-dry-damaged-hair":                   0.38,

  // ── Hair Serum ──
  "advanced-hair-regrowth-serum-anagain-redensyl":               0.18,

  // ── Aloe Vera Gel (500ml) ──
  "aloe-vera-gel-body-face":                                     0.65,

  // ── Body Lotions ──
  "moisturizing-honey-body-lotion":                              0.25,
  "body-lotion-caramel-crush-brightening":                       0.25,
  "body-lotion-frangipani":                                      0.25,

  // ── Body Massage Oil (180ml) ──
  "cedarwood-body-massage-oil-deep-relaxation":                  0.30,

  // ── Shower Gels (250ml) ──
  "nourishing-orange-shower-gel":                                0.38,
  "coffee-beans-body-shower-gel":                                0.38,
  "sea-fresh-body-shower-gel":                                   0.38,

  // ── Bath Salts (500g) ──
  "pure-rose-bathing-salt":                                      0.65,
  "lavender-bath-salt-muscle-relaxant":                          0.65,
  "sea-fresh-bath-salt-aroma-therapy":                           0.65,

  // ── Hand Washes (250ml) ──
  "tulsi-green-apple-handwash":                                  0.38,
  "tulsi-lime-handwash":                                         0.38,
  "tulsi-peach-handwash":                                        0.38,
  "orange-hand-wash-":                                           0.38,

  // ── Intimate Wash (150ml) ──
  "intimate-hygiene-sulphate-free-foam-wash":                    0.25,

  // ── Designer Soaps (100g) ──
  "brightening-lemon-designer-soap":                             0.20,
  "juicy-watermelon-designer-soap":                              0.20,
  "orange-designer-soaps":                                       0.20,
  "pastry-designer-soap":                                        0.20,

  // ── Premium Soaps (100g) ──
  "papaya-fruit-soap-whitening-detanning":                       0.20,
  "rich-chocolate-indulgence-premium-soap":                      0.20,
  "saffron-sandalwood-turmeric-premium-soap":                    0.20,
  "strawberry-mulberry-premium-soap":                            0.20,
  "charcoal-lemon-premium-soap":                                 0.20,
  "rose-aqua-moisturising-premium-soap":                         0.20,
  "black-grapes-premium-soap":                                   0.20,
  "pineapple-aqua-premium-soap":                                 0.20,
  "lemongrass-peppermint-premium-soap":                          0.20,
  "coconut-milk-honey-premium-soap":                             0.20,

  // ── Aissis Soaps (120g) ──
  "green-tea-scrub-aissis-soap":                                 0.25,
  "jasmine-aissis-soap-antiseptic":                              0.25,
  "rose-essential-oil-aissis-soap":                              0.25,
  "orange-peel-aissis-soap-skin-lightening":                     0.25,
  "peppermint-cucumber-aissis-soap":                             0.25,
  "sandalwood-almond-aissis-soap":                               0.25,
  "seafresh-aissis-soap":                                        0.25,
  "tropical-aissis-soap":                                        0.25,
  "green-apple-aissis-soap":                                     0.25,

  // ── Rock Soaps (100g) ──
  "jasmine-rock-soap-moisturizer-anti-ageing":                   0.20,
  "lavender-rock-soap-relaxing-sleep":                           0.20,
  "peppermint-cucumber-rock-soap-heals-skin":                    0.20,
  "rose-rock-soap-reduce-scars":                                 0.20,
  "strawberry-rock-soap-anti-aging":                             0.20,
  "sandalwood-rock-soap-reduces-dark-spots":                     0.20,

  // ── Chip Soaps (100g) ──
  "saffron-chips-soap-":                                         0.20,
  "lemongrass-chip-soap-acne-toner":                             0.20,
  "jasmine-chip-soap-":                                          0.20,
  "strawberry-chip-soap-anti-aging":                             0.20,
  "seafresh-chip-soap-exfoliation":                              0.20,
  "rose-&-rosemary-chips-soap":                                  0.20,

  // ── Round Soaps (85g) ──
  "milk-rose-round-soap-brightens":                              0.18,
  "apple-blossom-round-soap":                                    0.18,
  "peach-mix-fruit-round-soap":                                  0.18,
  "lavender-&-geranium-round-soap-":                             0.18,
  "multani-mitti-round-soap":                                    0.18,
  "honey-&-oatmeal-round-soap":                                  0.18,
  "tea-tree-&-peppermint-round-soap":                            0.18,
  "orange-&-bergamot-round-soap":                                0.18,
  "tropical-island-round-soap":                                  0.18,

  // ── Doobie Soaps (75g) ──
  "doobie-cincinnati-white-bath-soap":                           0.15,
  "doobie-neem-tulsi-bath-soap":                                 0.15,
  "doobie-rustic-sandal-bath-soap":                              0.15,
  "frech-rose-doodie-soap":                                      0.15,

  // ── Bathing Bars Eco (100g) ──
  "citrus-blast-bathing-bar":                                    0.20,
  "fasli-gulab-bathing-bar":                                     0.20,
  "morning-fresh-bathing-bar":                                   0.20,
  "neem-tulsi-bathing-bar":                                      0.20,
  "passion-bathing-bar":                                         0.20,

  // ── Face Moisturizer ──
  "almond-bliss-face-moisturizer":                               0.12,

  // ── Face Washes ──
  "foaming-face-wash-aloevera-vitamin-c":                        0.25,
  "foaming-facewash-apple-cider-vinegar":                        0.25,
  "natural-ubtan-face-wash":                                     0.18,
  "neem-tulsi-face-wash-acne-control":                           0.18,

  // ── Face Serums (50ml) ──
  "spotless-skin-tea-tree-salicylic-acne-serum":                 0.10,
  "face-serum-hyaluronic-acid-niacinamide":                      0.10,
  "face-serum-vitamin-c-niacinamide":                            0.10,

  // ── Scrubs ──
  "apricot-face-scrub-niacinamide":                              0.18,
  "apricot-scrub":                                               0.65,

  // ── Gift Kits (estimated) ──
  "comfort-mono-gift-kit":                                       0.80,
  "comfort-neo-gift-kit":                                        1.20,
  "essential-gift-kit":                                          1.00,
  "essential-plus-gift-kit":                                     1.50,
};

const productSchema = new mongoose.Schema({}, { strict: false });
delete mongoose.models.Product;
const Product = mongoose.model("Product", productSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [slug, weight] of Object.entries(PRODUCT_WEIGHTS)) {
    const existing = await Product.findOne({ slug }).lean();

    if (!existing) {
      console.warn(`⚠️  NOT FOUND: ${slug}`);
      notFound++;
      continue;
    }

    if (!FORCE_UPDATE && existing.weight != null) {
      console.log(`⏭️  SKIPPED (weight=${existing.weight}): ${slug}`);
      skipped++;
      continue;
    }

    await Product.updateOne({ slug }, { $set: { weight } });
    console.log(`✅ UPDATED: ${slug} → ${weight} kg`);
    updated++;
  }

  console.log("\n── Summary ──────────────────────────────");
  console.log(`✅ Updated:   ${updated}`);
  console.log(`⏭️  Skipped:   ${skipped}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log("─────────────────────────────────────────\n");

  // Report any DB products not in weight map
  const all = await Product.find({}, { slug: 1, name: 1, weight: 1 }).lean();
  const unmapped = all.filter((p) => !(p.slug in PRODUCT_WEIGHTS));
  if (unmapped.length > 0) {
    console.log(`ℹ️  ${unmapped.length} products not in weight map (will use schema default 0.3 kg):`);
    unmapped.forEach((p) =>
      console.log(`   • "${p.slug}" → ${p.name} (weight: ${p.weight ?? "not set"})`)
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});