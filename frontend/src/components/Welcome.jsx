import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasSeenWelcome, markWelcomeSeen } from '../interests.js';
import { track } from '../metrics.js';

/**
 * Shown once, on a first visit to the home page.
 *
 * Deliberately NOT a wall. "Look around first" is a real, equally-weighted
 * option, because the traffic that matters most arrives from a product link
 * pasted into a WhatsApp group — and a stranger who taps that link should land
 * on the product, not on a sign-up form. Same reason it never appears on
 * /product/* or /business/* routes: it's mounted only by Home.
 *
 * Dismissing it in any way marks it seen, so nobody meets it twice.
 */
export default function Welcome({ onPickInterests, onDismiss, required = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred a beat so it doesn't flash over a page still painting.
    if (!hasSeenWelcome()) {
      const t = setTimeout(() => { setOpen(true); track('welcome_shown'); }, 350);
      return () => clearTimeout(t);
    }
  }, []);

  // With the gate on there is no dismiss — the only way forward is to choose
  // interests, sign in, or open a shared link (which never renders this).
  const close = () => {
    if (required) return;
    markWelcomeSeen();
    setOpen(false);
    track('welcome_browsed');
    onDismiss?.();      // let Home move on to the picker
  };

  const go = (path) => () => {
    markWelcomeSeen();
    setOpen(false);
    onDismiss?.();
    navigate(path);
  };

  const pick = () => {
    markWelcomeSeen();
    setOpen(false);
    onPickInterests?.();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={required ? undefined : close}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,10,40,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, width: '100%', margin: 0, position: 'relative' }}
      >
        {!required && (
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              position: 'absolute', top: 10, right: 12, background: 'none', border: 'none',
              fontSize: '1.35rem', lineHeight: 1, cursor: 'pointer', color: 'var(--muted)',
            }}
          >
            ×
          </button>
        )}

        <h2 id="welcome-title" style={{ marginTop: 0, marginBottom: '0.4rem' }}>
          Welcome to Prointeractive
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Zambian businesses, in one place.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '1.1rem 0', display: 'grid', gap: '0.85rem' }}>
          <li style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>🛍️</span>
            <span>Shop from stores near you — clothing, electronics, spares, and more.</span>
          </li>
          <li style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>💬</span>
            <span>Message a business directly before you buy.</span>
          </li>
          <li style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>📱</span>
            <span>Pay by mobile money, card, or cash on delivery.</span>
          </li>
        </ul>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <button className="btn btn-red" onClick={pick} style={{ width: '100%' }}>
            {required ? 'Get started' : 'Show me what I like'}
          </button>
          <button className="btn btn-navy" onClick={go('/register')} style={{ width: '100%' }}>
            Create an account
          </button>
          {!required && (
            <button className="btn btn-ghost" onClick={close} style={{ width: '100%' }}>
              Look around first
            </button>
          )}
        </div>

        <p className="muted" style={{ textAlign: 'center', marginTop: '0.9rem', marginBottom: 0, fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <button type="button" className="link-button" onClick={go('/login')}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
