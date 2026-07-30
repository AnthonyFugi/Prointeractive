// One-off: drops the old (unweighted) product text index so Mongoose
// recreates it with the new weights (name x10 over description) on next
// connect. Existing indexes are never silently upgraded by a schema change
// alone — this closes that gap. Safe to run any time; it's just an index.
import mongoose from 'mongoose';
import 'dotenv/config';
import Product from '../models/Product.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const indexes = await Product.collection.indexes();
  const textIndex = indexes.find((i) => i.name.includes('_text'));

  if (!textIndex) {
    console.log('No existing text index found — nothing to drop.');
  } else {
    console.log(`Dropping existing index: ${textIndex.name}`);
    await Product.collection.dropIndex(textIndex.name);
  }

  console.log('Creating weighted text index (name x10, description x1)...');
  await Product.collection.createIndex(
    { name: 'text', description: 'text' },
    { weights: { name: 10, description: 1 } }
  );

  console.log('Done. Search relevance ranking is now backed by the new index.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Reindex failed:', err.message);
  process.exit(1);
});
