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
const PENDING_FOLLOWS_KEY = 'pi_pending_follows';
const DONE_KEY = 'pi_onboarding_done';

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
 * Stores a signed-out visitor asked to follow.
 *
 * Following needs an account, but refusing the tap outright is a dead end —
 * the shopper is told to sign in with no way to do it and no memory of what
 * they wanted. Instead the intent is recorded here, the button reflects it
 * straight away, and the follows are applied for real the moment they sign in.
 *
 * Shape is [{ id, name }] rather than bare ids so the picker can still render
 * the choice after a page reload, when the suggestion list is long gone.
 */
export const getPendingFollows = () => {
  const v = read(PENDING_FOLLOWS_KEY, []);
  return Array.isArray(v) ? v : [];
};

export const setPendingFollows = (list) => write(PENDING_FOLLOWS_KEY, list || []);

export const clearPendingFollows = () => {
  try { localStorage.removeItem(PENDING_FOLLOWS_KEY); } catch { /* ignore */ }
};

/**
 * Turn remembered intent into real follows, once there's an account to hang
 * them on. Best-effort per store: one failure shouldn't cost the others.
 */
export async function applyPendingFollows() {
  const pending = getPendingFollows();
  if (!pending.length) return 0;

  const results = await Promise.allSettled(
    pending.map((b) =>
      api(`/businesses/${b.id}/favorite`, { method: 'POST', body: { favorited: true } })
    )
  );
  const failed = pending.filter((_, i) => results[i].status === 'rejected');
  // Keep only what genuinely failed, so a retry next sign-in is possible
  // without re-following everything.
  if (failed.length) setPendingFollows(failed);
  else clearPendingFollows();
  return pending.length - failed.length;
}

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
  // Follows first: they're the thing the shopper actively tapped, and they
  // should land even if there were no interests to merge.
  await applyPendingFollows().catch(() => {});

  const local = getLocalInterests();
  if (!local.length) return null;

  const merged = [...new Set([...(user?.interests || []), ...local])];
  try {
    const d = await api('/auth/onboarding', {
      method: 'PATCH',
      body: { interests: merged, completed: true },
    });
    clearLocalInterests();
    // The account now records completion, so the local stand-in isn't needed
    // and must not linger for whoever signs in next on this browser.
    clearOnboardingDoneLocally();
    return d.interests;
  } catch {
    // Keep the local copy on failure — the feed still works from it, and the
    // merge will be retried on the next sign-in.
    return null;
  }
}

/**
 * Local record that the picker has been dealt with on this device.
 *
 * Needed because of an ordering gap at sign-up: the fresh account comes back
 * with empty interests, the merge that fills them in is async, and in the gap
 * between the two the picker would decide it hadn't been shown yet and reopen
 * on top of someone who had just finished it.
 *
 * Cleared once the merge lands, because from then on the ACCOUNT carries
 * `onboarding.completedAt` — which also means a different person signing in on
 * this same browser is still asked properly.
 */
export const markOnboardingDoneLocally = () => write(DONE_KEY, true);
export const isOnboardingDoneLocally = () => read(DONE_KEY, false) === true;
export const clearOnboardingDoneLocally = () => {
  try { localStorage.removeItem(DONE_KEY); } catch { /* ignore */ }
};

/**
 * Whether this visitor must pick interests before browsing the home feed.
 *
 * A gate, not a wall: it asks for one tap, never an account. And it applies
 * ONLY to the home page — /product/* and /business/* are untouched, so a link
 * shared into a WhatsApp group opens straight onto the item for someone who
 * has never been here before. That is the traffic that matters most, and it
 * must not meet a form.
 *
 * Anyone who has already chosen — on this device or on their account — passes
 * straight through, as do sellers and admins, whose feed isn't the point.
 */
export const needsInterestGate = (user) => {
  if (user && (user.role === 'business' || user.role === 'admin')) return false;
  if ((user?.interests || []).length) return false;
  // Respects a skip recorded before this gate existed — we don't re-ask
  // someone who was previously told the step was optional.
  const o = user?.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  if (isOnboardingDoneLocally()) return false;
  if (getLocalInterests().length) return false;
  return true;
};

/**
 * Whether to offer the interest picker to this user.
 * Offered once. Someone who completed it or deliberately skipped it is left
 * alone; sellers are skipped entirely, since the feed isn't what they came for.
 */
export const shouldOfferOnboarding = (user) => {
  if (!user) return false;
  if (user.role === 'business' || user.role === 'admin') return false;
  // Covers the async gap right after sign-up, before the merge has written
  // interests back to the account.
  if (isOnboardingDoneLocally()) return false;
  const o = user.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  return !(user.interests || []).length;
};
