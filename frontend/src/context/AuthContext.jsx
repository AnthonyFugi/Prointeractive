import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pi_token');
    if (!token) return setReady(true);
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('pi_token'))
      .finally(() => setReady(true));
  }, []);

  const save = (data) => {
    localStorage.setItem('pi_token', data.token);
    setUser(data.user);
  };

  const login = async (email, password) =>
    save(await api('/auth/login', { method: 'POST', body: { email, password } }));

  const register = async (form) =>
    save(await api('/auth/register', { method: 'POST', body: form }));

  const logout = () => {
    localStorage.removeItem('pi_token');
    setUser(null);
  };

  const refresh = async () => {
    const d = await api('/auth/me');
    setUser(d.user);
    return d.user;
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}
