import 'dotenv/config';
import mongoose from 'mongoose';
import Business from '../models/Business.js';

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'business';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const businesses = await Business.find({});
  const taken = new Set();
  for (const b of businesses) {
    const base = slugify(b.name);
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) candidate = `${base}-${n++}`;
    taken.add(candidate);
    if (b.slug !== candidate) {
      await Business.updateOne({ _id: b._id }, { slug: candidate });
      console.log(`${b.name}: ${b.slug || '(none)'} -> ${candidate}`);
    }
  }
  console.log(`Done. ${businesses.length} businesses checked.`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
