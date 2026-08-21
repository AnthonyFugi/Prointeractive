/**
 * Behavioural category affinity.
 *
 * The onboarding picker gives one static answer. This turns what shoppers
 * actually do into ranking signal, which is what makes a feed feel personal
 * three months in rather than three minutes in.
 */

/**
 * How much each action is worth.
 *
 * The spread is deliberate: a view is weak evidence (people open things by
 * accident), adding to a cart is real intent, and buying is the only one that
 * cost the shopper money. A single purchase should outweigh a browsing session.
 */
export const WEIGHTS = {
  view: 1,
  cart: 3,
  purchase: 8,
};

/** Affinity halves roughly every 30 days without reinforcement. */
const HALF_LIFE_DAYS = 30;

/**
 * Score with time decay applied at read time.
 *
 * Decaying on read rather than on a schedule means no cron job, no nightly
 * sweep over every user, and no drift when a job fails to run. The stored
 * value is only ever a score plus the moment it was last touched.
 */
export const decayedScore = (entry, now = Date.now()) => {
  if (!entry?.score) return 0;
  const ageDays = (now - new Date(entry.updatedAt).getTime()) / 86400000;
  if (ageDays <= 0) return entry.score;
  return entry.score * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
};

/**
 * Record an action against a category. Mutates the user document in place;
 * the caller decides when to save.
 */
export const recordAffinity = (user, category, action = 'view') => {
  const cat = String(category || '').toLowerCase().trim();
  if (!cat) return;
  const weight = WEIGHTS[action] ?? WEIGHTS.view;

  if (!user.categoryAffinity) user.categoryAffinity = new Map();
  const existing = user.categoryAffinity.get(cat);
  // Decay what's there before adding, so an old score doesn't get topped up
  // at full value and become permanently sticky.
  const current = existing ? decayedScore(existing) : 0;

  user.categoryAffinity.set(cat, {
    score: Math.min(current + weight, 1000), // ceiling stops one obsession dominating forever
    updatedAt: new Date(),
  });
};

/**
 * The categories this shopper actually leans toward, strongest first.
 *
 * Combined with their stated interests by the caller — stated interests are
 * what they asked for, affinity is what they do, and the feed should respect
 * both rather than letting either win outright.
 */
export const topAffinityCategories = (user, limit = 5) => {
  if (!user?.categoryAffinity?.size) return [];
  const now = Date.now();
  return [...user.categoryAffinity.entries()]
    .map(([cat, entry]) => ({ cat, score: decayedScore(entry, now) }))
    // Below 0.5 is noise — a single view six weeks ago shouldn't shape a feed.
    .filter((e) => e.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => e.cat);
};
