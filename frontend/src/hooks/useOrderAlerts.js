import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/**
 * Live order alerts for sellers on the web.
 *
 * Push notifications only reach the mobile app, so a seller running their
 * store from a laptop learned about orders whenever they next checked email.
 * In a market where buyers expect a reply in minutes, that's lost sales the
 * seller will blame on the platform.
 *
 * Polling rather than Web Push, deliberately: Web Push needs a service worker,
 * VAPID keys and a permission prompt, and only pays off when the tab is
 * closed. Sellers work with the dashboard open, so polling covers the real
 * case at a fraction of the complexity. Web Push is the upgrade if sellers
 * later want alerts with the tab shut.
 */
const POLL_MS = 30000;

export function useOrderAlerts({ enabled }) {
  const [newCount, setNewCount] = useState(0);
  const [latest, setLatest] = useState(null);
  // Newest order id already accounted for. null means "first poll" — we
  // establish a baseline then rather than announcing every historical order.
  const seenRef = useRef(null);
  const baseTitle = useRef(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let timer;

    const poll = async () => {
      // Don't poll a tab nobody is looking at — it wastes the seller's data,
      // which is not a trivial consideration on a Zambian mobile connection.
      if (document.visibilityState !== 'visible') return;
      try {
        const d = await api('/orders/business');
        if (!alive) return;
        const orders = d.orders || [];
        if (!orders.length) return;

        const newestId = String(orders[0]._id);
        if (seenRef.current === null) {
          seenRef.current = newestId;   // baseline, announce nothing
          return;
        }
        if (newestId === seenRef.current) return;

        const idx = orders.findIndex((o) => String(o._id) === seenRef.current);
        // -1 means more than a page of orders arrived since the last poll;
        // count what we can see rather than guessing.
        const arrived = idx === -1 ? orders.length : idx;
        if (arrived > 0) {
          setNewCount((c) => c + arrived);
          setLatest(orders[0]);
          notify(orders[0], arrived);
        }
        seenRef.current = newestId;
      } catch {
        // A failed poll is not worth telling the seller about; the next one
        // in thirty seconds will either work or it won't.
      }
    };

    poll();
    timer = setInterval(poll, POLL_MS);
    // Poll immediately when they come back to the tab, so returning from
    // another window shows current state rather than up-to-30-seconds-stale.
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  // Unread count in the tab title — visible even when the seller is working
  // in another tab, which is the whole point.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = newCount > 0 ? `(${newCount}) ${baseTitle.current}` : baseTitle.current;
  }, [newCount]);

  const clear = () => setNewCount(0);

  return { newCount, latest, clear };
}

/**
 * Desktop notification, if the seller has allowed it.
 *
 * Works without a service worker while the tab is open. Permission is never
 * requested here — asking on page load gets denied and the denial is sticky.
 * The dashboard asks only after a seller opts in.
 */
function notify(order, count) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const body =
      count > 1
        ? `${count} new orders are waiting.`
        : `${order.items?.length || 1} item(s) · ${order.currency} ${Number(order.totalAmount).toFixed(2)}`;
    new Notification(count > 1 ? 'New orders' : 'New order 🛒', { body, tag: 'proint-order' });
  } catch {
    /* notifications are a bonus, never a requirement */
  }
}

/** Ask for permission. Called from a click, never on load. */
export async function requestOrderNotifications() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}
