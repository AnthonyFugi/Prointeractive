import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

export async function api(path, { method = 'GET', body } = {}) {
  const token = await SecureStore.getItemAsync('pi_token');
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export const setToken = (t) => SecureStore.setItemAsync('pi_token', t);
export const clearToken = () => SecureStore.deleteItemAsync('pi_token');
