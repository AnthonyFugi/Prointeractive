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
 * Fold locally-picked interests into a freshly signed-in account.
 * Union, so picks from another device survive.
 */
export async function mergeLocalInterestsIntoAccount(user) {
  const local = await getLocalInterests();
  if (!local.length) return null;
  const merged = [...new Set([...(user?.interests || []), ...local])];
  try {
    const d = await api('/auth/onboarding', {
      method: 'PATCH',
      body: { interests: merged, completed: true },
    });
    await clearLocalInterests();
    return d.interests;
  } catch {
    return null; // keep the local copy and retry on the next sign-in
  }
}

/** Whether to offer the picker. Once only, and never to sellers. */
export const shouldOfferOnboarding = (user) => {
  if (!user) return false;
  if (user.role === 'business' || user.role === 'admin') return false;
  const o = user.onboarding || {};
  if (o.completedAt || o.skippedAt) return false;
  return !(user.interests || []).length;
};
