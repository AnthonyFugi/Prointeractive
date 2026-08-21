import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * Client-side mirror of backend/utils/pricing.js — used only to show sellers a
 * live breakdown while they type. The server always recomputes on save, so this
 * is a preview, never the source of truth.
 *
 * The rate comes from /api/pricing rather than being hardcoded, which matters
 * more here than on web: an app build sits in the stores for months, so a
 * baked-in rate would go stale the moment PLATFORM_FEE_PERCENT changed.
 */
const DEFAULT_COMMISSION_PERCENT = 5;
const DEFAULT_ROUNDING = 1;

const round2 = (n) => Math.round(n * 100) / 100;

export const makePricing = (commissionPercent, rounding) => {
  const f = commissionPercent / 100;

  const listPriceFromBase = (basePrice) => {
    const b = Number(basePrice);
    if (!Number.isFinite(b) || b <= 0) return 0;
    // Epsilon matches the server: without it, floating-point round-trips
    // (499.00000000000006) would preview a price a whole kwacha too high.
    return round2(Math.ceil(b / (1 - f) / rounding - 1e-9) * rounding);
  };

  return {
    commissionPercent,
    markupPercent: round2((1 / (1 - f) - 1) * 100),
    listPriceFromBase,
    commissionOn: (listPrice) => round2(Number(listPrice || 0) * f),
    breakdown: (basePrice) => {
      const list = listPriceFromBase(basePrice);
      return { listPrice: list, commission: round2(list * f), net: round2(list - list * f) };
    },
  };
};

let cached = null;

export function usePricing() {
  const [pricing, setPricing] = useState(
    () => cached || makePricing(DEFAULT_COMMISSION_PERCENT, DEFAULT_ROUNDING)
  );

  useEffect(() => {
    if (cached) return;
    let alive = true;
    api('/pricing')
      .then((d) => {
        if (!alive || !d?.pricing) return;
        cached = makePricing(d.pricing.commissionPercent, d.pricing.rounding || DEFAULT_ROUNDING);
        setPricing(cached);
      })
      .catch(() => {}); // defaults are fine; the server recomputes on save anyway
    return () => { alive = false; };
  }, []);

  return pricing;
}
