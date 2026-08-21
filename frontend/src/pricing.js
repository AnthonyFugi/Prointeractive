import { useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * Client-side mirror of backend/utils/pricing.js — used only to show sellers a
 * live breakdown while they type. The server always recomputes on save, so this
 * is a preview, never the source of truth.
 *
 * The rate is fetched from /api/pricing rather than hardcoded, so changing
 * PLATFORM_FEE_PERCENT on Render doesn't leave three codebases disagreeing.
 * These defaults only apply for the moment before that request lands.
 */
const DEFAULT_COMMISSION_PERCENT = 5;
const DEFAULT_ROUNDING = 1;

const round2 = (n) => Math.round(n * 100) / 100;

export const makePricing = (commissionPercent, rounding) => {
  const f = commissionPercent / 100;

  /** What the buyer pays, so the seller still nets their target. */
  const listPriceFromBase = (basePrice) => {
    const b = Number(basePrice);
    if (!Number.isFinite(b) || b <= 0) return 0;
    // Epsilon matches the server: without it, floating-point round-trips
    // (499.00000000000006) would preview a price a whole kwacha too high.
    return round2(Math.ceil(b / (1 - f) / rounding - 1e-9) * rounding);
  };

  return {
    commissionPercent,
    // The real markup applied (5.26% for a 5% commission), not the
    // intuitive-but-wrong 5%.
    markupPercent: round2((1 / (1 - f) - 1) * 100),
    listPriceFromBase,
    /** Commission taken on a given shelf price. */
    commissionOn: (listPrice) => round2(Number(listPrice || 0) * f),
    /** Everything the form needs for one target price. */
    breakdown: (basePrice) => {
      const list = listPriceFromBase(basePrice);
      return { listPrice: list, commission: round2(list * f), net: round2(list - list * f) };
    },
  };
};

let cached = null;

/**
 * Pricing helpers, with the live commission rate once it arrives.
 * Cached module-side so remounting a form doesn't re-request it.
 */
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
