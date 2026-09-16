// scripts/backfill-collection-numeric-ids.ts
import 'dotenv/config';
import { connectDB } from '../lib/db';
import { Collection } from '../lib/models/collection';   // <-- named import, curly braces
import { getNextSequence } from '../lib/models/counter';

async function run() {
  await connectDB();

  const collections = await Collection.find({ numericId: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`Found ${collections.length} collections without numericId`);

  for (const collection of collections) {
    collection.numericId = await getNextSequence('collectionId');
    await collection.save();
    console.log(`${collection.name} -> ${collection.numericId}`);
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
