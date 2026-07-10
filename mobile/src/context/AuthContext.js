import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken } from '../api';
import { registerForPush } from '../push';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (user) registerForPush();
  }, [user]);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    await setToken(d.token);
    setUser(d.user);
  };

  const register = async (form) => {
    const d = await api('/auth/register', { method: 'POST', body: form });
    await setToken(d.token);
    setUser(d.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
