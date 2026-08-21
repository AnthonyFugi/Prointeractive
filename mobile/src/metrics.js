import { api } from './api';

/**
 * Fire-and-forget funnel counters. No identifiers — just a key the backend
 * increments into a daily bucket.
 */
export const track = (key) => {
  api('/metrics', { method: 'POST', body: { key } }).catch(() => {});
};
