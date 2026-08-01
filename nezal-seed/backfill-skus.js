// nezal-seed/backfill-skus.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const products = await db.collection('products').find({
    $or: [{ sku: { $exists: false } }, { sku: '' }, { sku: null }]
  }).toArray();

  console.log(`Found ${products.length} products missing SKU`);
  for (const p of products) {
    const base = p.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
    const sku = `NEZAL-${base}-${p._id.toString().slice(-4)}`;
    await db.collection('products').updateOne({ _id: p._id }, { $set: { sku } });
    console.log(`${p.name} -> ${sku}`);
  }
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });