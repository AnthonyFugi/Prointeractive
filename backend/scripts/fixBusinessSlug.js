import 'dotenv/config';
import mongoose from 'mongoose';
import Business from '../models/Business.js';

/**
 * Correct a business slug that no longer matches its name.
 *
 * Slugs are generated once, at creation, and never regenerate on rename — that
 * is deliberate, because a slug that shifts under an already-shared link is a
 * broken link. But it means a storefront created under a placeholder name
 * ("no") keeps that slug forever, even after the real name is set.
 *
 * This is the explicit escape hatch. The old slug is recorded in
 * previousSlugs, and getBusiness falls back to it, so every link already
 * shared keeps working after the change.
 *
 * Audit everything:      node scripts/fixBusinessSlug.js
 * One business:          node scripts/fixBusinessSlug.js --slug=no
 * Choose the new slug:   node scripts/fixBusinessSlug.js --slug=no --to=mommies-munchkins
 * Commit:                add --apply to any of the above
 */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const APPLY = Boolean(args.apply);

// Must match the model's slugify exactly, or the audit reports false drift.
const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Free slug closest to the desired one, suffixing only if taken. */
const uniqueSlug = async (base, selfId) => {
  let candidate = base;
  let n = 2;
  while (await Business.exists({ slug: candidate, _id: { $ne: selfId } })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const filter = {};
  if (args.slug) filter.slug = String(args.slug).toLowerCase();
  if (args.id) filter._id = args.id;

  const businesses = await Business.find(filter).select('name slug previousSlugs');
  if (!businesses.length) {
    console.log('No business matched.');
    return mongoose.disconnect();
  }

  let changed = 0;
  for (const b of businesses) {
    const desired = args.to
      ? slugify(String(args.to))
      : slugify(b.name) || 'business';

    // Only flag a real mismatch. A slug carrying a numeric suffix because the
    // clean one was taken (mommies-munchkins-2) is correct, not drift.
    const isSuffixed = new RegExp(`^${desired}-\\d+$`).test(b.slug);
    if (b.slug === desired || isSuffixed) {
      if (args.slug || args.id) console.log(`  =  "${b.name}" already at /${b.slug}`);
      continue;
    }

    const newSlug = await uniqueSlug(desired, b._id);
    console.log(`  →  "${b.name}"`);
    console.log(`       /businesses/${b.slug}  ->  /businesses/${newSlug}`);
    console.log(`       old link keeps working via previousSlugs`);

    if (APPLY) {
      await Business.updateOne(
        { _id: b._id },
        {
          $set: { slug: newSlug },
          // addToSet, not push — re-running must not duplicate entries.
          $addToSet: { previousSlugs: b.slug },
        }
      );
    }
    changed++;
  }

  console.log(`\n${changed} slug(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  if (!APPLY && changed) console.log('Re-run with --apply to commit.');
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
