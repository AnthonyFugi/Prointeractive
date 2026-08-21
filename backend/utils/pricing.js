import { platformFeeFraction } from './flutterwave.js';

/**
 * Commission-inclusive pricing.
 *
 * Sellers tell us what they want to RECEIVE (basePrice). We list at a higher
 * price so that, after the platform commission comes off the gross, the seller
 * is left with exactly what they asked for.
 *
 * The maths matters here, and the intuitive version is wrong:
 *
 *   Seller wants K100. Adding 5% gives K105.
 *   Commission is 5% of the GROSS: 5% of K105 = K5.25.
 *   Seller receives K99.75 — short by 25 ngwee.
 *
 * A markup and a margin work off different bases. Our commission is a share of
 * the sale price; the seller's target is a share of what's left. To net B after
 * a commission fraction f, the list price must be B / (1 - f) — a 5.263% markup
 * for a 5% commission, not 5%.
 *
 * The commission itself is unchanged: still a flat 5% of the sale, exactly as
 * quoted to sellers and exactly as computeCommission() charges. Only the way we
 * derive the shelf price from the seller's target is corrected here.
 */

/**
 * Smallest unit the shelf price is rounded to, in ZMW.
 * 1 = whole kwacha (K106, not K105.26) — cleaner prices, and rounding UP means
 * the seller always nets at least their target, never a ngwee less.
 * Set to 0.01 for exact-to-the-ngwee pricing instead.
 */
export const PRICE_ROUNDING = 1;

const round2 = (n) => Math.round(n * 100) / 100;

/** Commission as a fraction (0.05), read from the same env var as everything else. */
export const commissionFraction = () => platformFeeFraction();

/** Commission as a percentage for display (5). */
export const commissionPercent = () => round2(commissionFraction() * 100);

/**
 * The markup actually applied to a seller's target price, as a percentage.
 * For a 5% commission this is 5.26% — surfaced so seller-facing copy can be
 * honest about the number rather than repeating the wrong one.
 */
export const markupPercent = () => round2((1 / (1 - commissionFraction()) - 1) * 100);

/**
 * What a buyer pays, given what the seller wants to receive.
 * Rounded UP to PRICE_ROUNDING so the seller is never short-changed by rounding.
 */
export const listPriceFromBase = (basePrice) => {
  const b = Number(basePrice);
  if (!Number.isFinite(b) || b <= 0) return 0;
  const exact = b / (1 - commissionFraction());
  // The epsilon is load-bearing, not defensive noise. Round-tripping a price
  // through basePrice and back lands on values like 499.00000000000006, and a
  // bare Math.ceil would round that to 500 — quietly raising a seller's price
  // by a kwacha every time they saved an unrelated edit like stock.
  return round2(Math.ceil(exact / PRICE_ROUNDING - 1e-9) * PRICE_ROUNDING);
};

/**
 * What the seller receives, given a shelf price.
 * Used to interpret prices that were set directly (admin overrides, older app
 * builds still posting `price`, and the one-off backfill of existing listings).
 */
export const baseFromListPrice = (listPrice) => {
  const p = Number(listPrice);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return round2(p * (1 - commissionFraction()));
};

/** The commission taken on a given shelf price. */
export const commissionOnListPrice = (listPrice) =>
  round2(Number(listPrice || 0) - baseFromListPrice(listPrice));

/**
 * Everything a seller-facing form needs to show a live breakdown for one
 * target price, in a single call.
 */
export const priceBreakdown = (basePrice) => {
  const list = listPriceFromBase(basePrice);
  return {
    basePrice: round2(Number(basePrice) || 0),
    listPrice: list,
    commission: round2(list - (Number(basePrice) || 0)),
    commissionPercent: commissionPercent(),
  };
};
