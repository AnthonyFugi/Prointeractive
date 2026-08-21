import { createContext, useContext, useEffect, useState } from 'react';
import { setDisplayCurrency, api } from '../api.js';
import { forgetAutoSignIn } from '../credentials.js';
import { mergeLocalInterestsIntoAccount } from '../interests.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pi_token');
    if (!token) return setReady(true);
    api('/auth/me')
      .then((d) => (setDisplayCurrency(d.user?.preferences?.currency), setUser(d.user)))
      .catch(() => localStorage.removeItem('pi_token'))
      .finally(() => setReady(true));
  }, []);

  const save = async (data) => {
    localStorage.setItem('pi_token', data.token);
    setUser(data.user);
    // Anything picked while browsing signed-out is folded into the account,
    // so the shopper isn't asked the same question twice. Union, not
    // overwrite — picks made on another device are kept.
    const merged = await mergeLocalInterestsIntoAccount(data.user);
    if (merged) setUser((u) => (u ? { ...u, interests: merged } : u));
  };

  const login = async (email, password) =>
    save(await api('/auth/login', { method: 'POST', body: { email, password } }));

  const register = async (form) =>
    save(await api('/auth/register', { method: 'POST', body: form }));

  const loginWithGoogle = async (credential) =>
    save(await api('/auth/google', { method: 'POST', body: { credential } }));

  const loginWithApple = async (identityToken, name) =>
    save(await api('/auth/apple', { method: 'POST', body: { identityToken, name } }));

  const logout = () => {
    localStorage.removeItem('pi_token');
    setUser(null);
    // Signing out should mean the next person to pick up this device has to
    // choose an account deliberately, not get signed straight back in.
    forgetAutoSignIn();
  };

  const refresh = async () => {
    const d = await api('/auth/me');
    (setDisplayCurrency(d.user?.preferences?.currency), setUser(d.user));
    return d.user;
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout, refresh, loginWithGoogle, loginWithApple }}>
      {children}
    </AuthCtx.Provider>
  );
}
