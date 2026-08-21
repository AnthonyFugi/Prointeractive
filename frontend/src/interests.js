import { api } from './api.js';

/**
 * Interests for people who haven't signed in yet.
 *
 * The welcome flow is skippable by design — a shopper can pick what they like
 * and browse a feed shaped by it without ever creating an account. Those picks
 * live here, in localStorage, until they do sign up, at which point they're
 * merged into the account and this copy stops mattering.
 *
 * Keeping this local also protects the thing that actually brings people here:
 * a product link shared in a WhatsApp group opens straight to the product, and
 * the welcome screen never stands in front of it.
 */
const INTERESTS_KEY = 'pi_interests';
const SEEN_KEY = 'pi_welcome_seen';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback; // private mode, disabled storage, or corrupt value
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — personalisation is a bonus, not a requirement */
  }
};

/** Interests picked before signing in. Always an array. */
export const getLocalInterests = () => {
  const v = read(INTERESTS_KEY, []);
  return Array.isArray(v) ? v : [];
};

export const setLocalInterests = (list) =>
  write(INTERESTS_KEY, [...new Set((list || []).map((c) => String(c).toLowerCase().trim()).filter(Boolean))]);

export const clearLocalInterests = () => {
  try { localStorage.removeItem(INTERESTS_KEY); } catch { /* ignore */ }
};

/** Has this browser seen the welcome screen? Shown once, never nagged. */
export const hasSeenWelcome = () => read(SEEN_KEY, false) === true;
export const markWelcomeSeen = () => write(SEEN_KEY, true);

/**
 * Fold locally-picked interests into a freshly signed-in account.
 *
 * Union rather than overwrite: someone who picked interests on their phone
 * last week and on a laptop today should end up with both, not whichever
 * device happened to sync last.
 *
 * Returns the merged list, or null if there was nothing to do.
 */
export async function mergeLocalInterestsIntoAccount(user) {
  const local = getLocalInterests();
  if (!local.length) return null;

  const merged = [...new Set([...(user?.interests || []), ...local])];
  try {
    const d = await api('/auth/onboarding', {
      method: 'PATCH',
      body: { interests: merged, completed: true },
    });
    clearLocalInterests();
    return d.interests;
  } catch {
    // Keep the local copy on failure — the feed still works from it, and the
    // merge will be retried on the next sign-in.
    return null;
  }
}

/**
 * Whether to offer the interest picker to this user.
 * Offered once. Someone who completed it or deliberately skipped it is left
 * alone; sellers are skipped entirely, since the feed isn't what they came for.
 */
export const shouldOfferOnboarding = (user) => {
  if (!user) return false;
  if (user.role === 'business' || user.role === 'admin') return false;
  const o = user.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  return !(user.interests || []).length;
};
