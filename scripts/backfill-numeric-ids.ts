// scripts/backfill-numeric-ids.ts
import 'dotenv/config';
import { connectDB } from '../lib/db';
import { Product } from '../lib/models/product';   // <-- named import, curly braces
import { getNextSequence } from '../lib/models/counter';

async function run() {
  await connectDB();

  const products = await Product.find({ numericId: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`Found ${products.length} products without numericId`);

  for (const product of products) {
    product.numericId = await getNextSequence('productId');
    await product.save();
    console.log(`${product.name} -> ${product.numericId}`);
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});