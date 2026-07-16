import 'dotenv/config';
import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Product from '../models/Product.js';

// Usage: npm run reactivate -- <business slug or id>
const key = process.argv[2];
if (!key) { console.error('Usage: npm run reactivate -- <business slug or id>'); process.exit(1); }

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const business = (/^[0-9a-fA-F]{24}$/.test(key) ? await Business.findById(key) : null)
    || await Business.findOne({ slug: key.toLowerCase() });
  if (!business) { console.error('Business not found:', key); process.exit(1); }

  if (business.closed) {
    business.closed = false;
    await business.save();
    console.log(`Reopened storefront: ${business.name}`);
  }
  const r = await Product.updateMany(
    { business: business._id, isActive: false },
    { isActive: true, deactivatedReason: null }
  );
  console.log(`Reactivated ${r.modifiedCount} product(s) for ${business.name}.`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
