import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * Interests for people who haven't signed in yet.
 *
 * AsyncStorage rather than SecureStore on purpose: these are shopping
 * preferences, not secrets, and SecureStore is slower and size-limited.
 *
 * Mirrors frontend/src/interests.js. Kept as a separate file rather than
 * shared, since the two apps have no common module path.
 */
const INTERESTS_KEY = 'pi_interests';
const SEEN_KEY = 'pi_welcome_seen';
const PENDING_FOLLOWS_KEY = 'pi_pending_follows';
const DONE_KEY = 'pi_onboarding_done';

export async function getLocalInterests() {
  try {
    const raw = await AsyncStorage.getItem(INTERESTS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function setLocalInterests(list) {
  try {
    const clean = [...new Set((list || []).map((c) => String(c).toLowerCase().trim()).filter(Boolean))];
    await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(clean));
  } catch {
    /* personalisation is a bonus, not a requirement */
  }
}

export async function clearLocalInterests() {
  try { await AsyncStorage.removeItem(INTERESTS_KEY); } catch { /* ignore */ }
}

export async function hasSeenWelcome() {
  try { return (await AsyncStorage.getItem(SEEN_KEY)) === 'true'; } catch { return true; }
}

export async function markWelcomeSeen() {
  try { await AsyncStorage.setItem(SEEN_KEY, 'true'); } catch { /* ignore */ }
}

/**
 * Stores a signed-out visitor asked to follow. Recorded rather than refused,
 * then applied for real on sign-in, so the tap is never a dead end.
 */
export async function getPendingFollows() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_FOLLOWS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export async function setPendingFollows(list) {
  try { await AsyncStorage.setItem(PENDING_FOLLOWS_KEY, JSON.stringify(list || [])); } catch { /* ignore */ }
}

export async function clearPendingFollows() {
  try { await AsyncStorage.removeItem(PENDING_FOLLOWS_KEY); } catch { /* ignore */ }
}

/** Best-effort per store: one failure shouldn't cost the others. */
export async function applyPendingFollows() {
  const pending = await getPendingFollows();
  if (!pending.length) return 0;
  const results = await Promise.allSettled(
    pending.map((b) => api(`/businesses/${b.id}/favorite`, { method: 'POST', body: { favorited: true } }))
  );
  const failed = pending.filter((_, i) => results[i].status === 'rejected');
  if (failed.length) await setPendingFollows(failed);
  else await clearPendingFollows();
  return pending.length - failed.length;
}

/**
 * Local record that the picker has been dealt with on this device — covers the
 * async gap at sign-up where the fresh account has no interests yet and the
 * picker would otherwise reopen on someone who just finished it.
 */
export async function markOnboardingDoneLocally() {
  try { await AsyncStorage.setItem(DONE_KEY, 'true'); } catch { /* ignore */ }
}
export async function isOnboardingDoneLocally() {
  try { return (await AsyncStorage.getItem(DONE_KEY)) === 'true'; } catch { return false; }
}
export async function clearOnboardingDoneLocally() {
  try { await AsyncStorage.removeItem(DONE_KEY); } catch { /* ignore */ }
}

/**
 * Fold locally-picked interests into a freshly signed-in account.
 * Union, so picks from another device survive.
 */
export async function mergeLocalInterestsIntoAccount(user) {
  // Follows first — they're what the shopper actively tapped, and they should
  // land even when there were no interests to merge.
  await applyPendingFollows().catch(() => {});

  const local = await getLocalInterests();
  if (!local.length) return null;
  const merged = [...new Set([...(user?.interests || []), ...local])];
  try {
    const d = await api('/auth/onboarding', {
      method: 'PATCH',
      body: { interests: merged, completed: true },
    });
    await clearLocalInterests();
    await clearOnboardingDoneLocally();
    return d.interests;
  } catch {
    return null; // keep the local copy and retry on the next sign-in
  }
}

/**
 * Whether this visitor must pick interests before browsing the shop tab.
 *
 * A gate, not a wall: one tap, never an account. Applies only to the shop tab —
 * a product opened from a shared link deep-links straight to ProductScreen and
 * never renders this.
 */
export async function needsInterestGate(user) {
  if (user && (user.role === 'business' || user.role === 'admin')) return false;
  if ((user?.interests || []).length) return false;
  const o = user?.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  if (await isOnboardingDoneLocally()) return false;
  if ((await getLocalInterests()).length) return false;
  return true;
}

/**
 * Whether to offer the picker. Once only, and never to sellers.
 * Async because the local completion flag lives in AsyncStorage.
 */
export async function shouldOfferOnboarding(user) {
  if (!user) return false;
  if (user.role === 'business' || user.role === 'admin') return false;
  if (await isOnboardingDoneLocally()) return false;
  const o = user.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  return !(user.interests || []).length;
}
