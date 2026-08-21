import { api } from './api.js';

/**
 * Fire-and-forget funnel counters.
 *
 * Only exists to answer whether the interest gate is worth its friction. No
 * identifiers are sent — just a key the backend increments into a daily
 * bucket — so this measures the funnel without profiling anyone.
 */
export const track = (key) => {
  try {
    api('/metrics', { method: 'POST', body: { key } }).catch(() => {});
  } catch {
    /* never let measurement break the page */
  }
};
