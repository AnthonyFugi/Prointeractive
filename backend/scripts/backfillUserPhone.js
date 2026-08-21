import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { normalizePhone, formatPhone } from '../utils/phone.js';

/**
 * Backfill User.phone from the delivery details customers already gave at
 * checkout.
 *
 * Nobody has to be asked for something they've already handed over. Every
 * order carries shippingAddress.phone, so anyone who has bought once has a
 * number on file — it just wasn't on their account.
 *
 * Takes the MOST RECENT order's number, on the assumption that a number given
 * later supersedes one given earlier. Never overwrites a phone a user has set
 * on their account themselves.
 *
 * Dry run:   node scripts/backfillUserPhone.js
 * Commit:    node scripts/backfillUserPhone.js --apply
 */
const APPLY = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const users = await User.find({ $or: [{ phone: '' }, { phone: { $exists: false } }] })
    .select('name email phone');

  let filled = 0;
  let unusable = 0;

  for (const u of users) {
    const lastOrder = await Order.findOne({ customer: u._id })
      .sort('-createdAt')
      .select('shippingAddress.phone createdAt');

    const raw = lastOrder?.shippingAddress?.phone;
    if (!raw) continue;

    const normalized = normalizePhone(raw);
    if (!normalized) {
      // Worth seeing rather than silently skipping — a cluster of these means
      // the checkout field needs validation too.
      console.log(`  ?  ${u.email.padEnd(32)} unparseable: "${raw}"`);
      unusable++;
      continue;
    }

    console.log(`  +  ${u.email.padEnd(32)} ${formatPhone(normalized)}`);
    // updateOne bypasses the pre-save hook, which is fine — already normalised.
    if (APPLY) await User.updateOne({ _id: u._id }, { $set: { phone: normalized } });
    filled++;
  }

  console.log(`\n${filled} user(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  if (unusable) console.log(`${unusable} order phone(s) could not be parsed — see "?" rows above.`);
  console.log(`${users.length - filled - unusable} user(s) have never ordered, so have no number to copy.`);
  if (!APPLY && filled > 0) console.log('\nRe-run with --apply to commit.');

  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
