import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken } from '../api';
import Constants from 'expo-constants';
import { setDisplayCurrency } from '../theme';
import { signInWithGoogle, signInWithApple } from '../socialAuth';
import { mergeLocalInterestsIntoAccount } from '../interests';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me')
      .then((d) => (setDisplayCurrency(d.user && d.user.preferences ? d.user.preferences.currency : 'ZMW'), setUser(d.user)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    // Remote push was removed from Expo Go on Android in SDK 53 — importing
    // expo-notifications at all triggers a hard crash there. Deliberately
    // using the (deprecated but still functional) appOwnership check rather
    // than the newer executionEnvironment: 'storeClient' covers Expo Go AND
    // a future expo-dev-client build, but dev-client builds CAN do push
    // properly — appOwnership === 'expo' is the one check that means
    // specifically "generic Expo Go", nothing broader.
    if (Constants.appOwnership === 'expo') return;
    import('../push').then(({ registerForPush }) => registerForPush()).catch(() => {});
  }, [user]);

  // Shared tail for every sign-in path: store the token, set the user, then
  // fold in anything picked while browsing signed-out so the shopper isn't
  // asked the same question twice.
  const completeSignIn = async (d) => {
    await setToken(d.token);
    setDisplayCurrency(d.user && d.user.preferences ? d.user.preferences.currency : 'ZMW');
    setUser(d.user);
    const merged = await mergeLocalInterestsIntoAccount(d.user);
    if (merged) setUser((u) => (u ? { ...u, interests: merged } : u));
  };

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    await completeSignIn(d);
  };

  const register = async (form) => {
    const d = await api('/auth/register', { method: 'POST', body: form });
    await completeSignIn(d);
  };

  const loginWithGoogle = async () => {
    const idToken = await signInWithGoogle();
    const d = await api('/auth/google', { method: 'POST', body: { credential: idToken } });
    await completeSignIn(d);
  };

  const loginWithApple = async () => {
    const { identityToken, name } = await signInWithApple();
    const d = await api('/auth/apple', { method: 'POST', body: { identityToken, name } });
    await completeSignIn(d);
  };

  const refresh = async () => {
    try {
      const d = await api('/auth/me');
      setDisplayCurrency(d.user && d.user.preferences ? d.user.preferences.currency : 'ZMW');
      setUser(d.user);
    } catch (_e) {}
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, login, register, logout, refresh, loginWithGoogle, loginWithApple }}>{children}</Ctx.Provider>;
}
