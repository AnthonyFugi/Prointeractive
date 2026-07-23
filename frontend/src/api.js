// Same-origin by default (Render serves frontend+API together).
// For split hosting (e.g. Firebase Hosting), build with:
//   VITE_API_URL=https://your-api.onrender.com npm run build
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('pi_token');
  const res = await fetch(BASE + path, {
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

let displayCurrency = 'ZMW';
const USD_RATE = Number(import.meta.env.VITE_USD_ZMW_RATE) || 18; // 1 USD ≈ 18 ZMW

export const setDisplayCurrency = (cur) => {
  displayCurrency = cur === 'USD' ? 'USD' : 'ZMW';
};

export const money = (amount, currency = 'ZMW') => {
  if (displayCurrency === 'USD' && currency === 'ZMW') {
    return `$${(Number(amount || 0) / USD_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `K${Number(amount || 0).toLocaleString()}`;
};
