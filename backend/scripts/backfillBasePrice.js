import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { baseFromListPrice, commissionPercent } from '../utils/pricing.js';

/**
 * Backfill basePrice / baseSalePrice on listings created before
 * commission-inclusive pricing existed.
 *
 * Direction matters. We treat every existing `price` as the SHELF price and
 * derive what the seller nets from it:
 *
 *     basePrice = price x (1 - commission)
 *
 * That leaves every live price exactly where it is and simply writes down
 * today's reality. The other direction — treating current prices as targets
 * and grossing them up — would silently raise every price on the platform
 * overnight, which is not something sellers have agreed to.
 *
 * Writes go through updateOne, deliberately bypassing the model's pre-validate
 * hook, so nothing recomputes `price` on the way through.
 *
 * Dry run first:   node scripts/backfillBasePrice.js
 * Then commit:     node scripts/backfillBasePrice.js --apply
 */
const APPLY = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Commission: ${commissionPercent()}%  |  mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const products = await Product.find({
    $or: [{ basePrice: { $exists: false } }, { basePrice: null }],
  }).select('name price salePrice basePrice baseSalePrice');

  let changed = 0;
  for (const p of products) {
    const set = { basePrice: baseFromListPrice(p.price) };
    if (p.salePrice != null) set.baseSalePrice = baseFromListPrice(p.salePrice);

    console.log(
      `${p.name.slice(0, 40).padEnd(42)} price K${p.price} -> seller nets K${set.basePrice}` +
        (set.baseSalePrice != null ? `  (sale K${p.salePrice} -> K${set.baseSalePrice})` : '')
    );
    if (APPLY) await Product.updateOne({ _id: p._id }, { $set: set });
    changed++;
  }

  console.log(`\n${changed} listing(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  if (!APPLY && changed > 0) console.log('Re-run with --apply to commit.');
  console.log('No buyer-facing price was changed.');
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
