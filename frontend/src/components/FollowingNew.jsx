import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';

/**
 * "New from stores you follow" — the returning-visitor surface.
 *
 * The reason someone reopens a marketplace has to be something other than the
 * order they're already tracking. This is that: a short, dated strip that is
 * different every time a store they chose lists something.
 *
 * Renders nothing at all when there's nothing new, rather than an empty state.
 * A permanent "no new items" box is a standing reminder that the platform is
 * quiet, which is the opposite of what it's for.
 */
export default function FollowingNew({ onSeen }) {
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api('/products/following-new')
      .then((d) => {
        setItems(d.products || []);
        setUnseen(d.unseen || 0);
      })
      .catch(() => {}); // not following anyone, or signed out — silently absent
  }, []);

  // Marking as seen is explicit, so simply loading the home page doesn't clear
  // a badge the shopper never looked at.
  const markSeen = () => {
    setDismissed(true);
    api('/products/following-new?seen=true').catch(() => {});
    onSeen?.();
  };

  if (dismissed || !items.length) return null;

  return (
    <section className="panel" style={{ marginBottom: '1.25rem' }}>
      <div className="row spread" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          New from stores you follow
          {unseen > 0 && (
            <span
              style={{
                marginLeft: '0.5rem', background: 'var(--red)', color: '#fff',
                borderRadius: 999, padding: '0.1rem 0.5rem', fontSize: '0.75rem',
                verticalAlign: 'middle',
              }}
            >
              {unseen}
            </span>
          )}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={markSeen}>Mark seen</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
        {items.map((p) => (
          <Link
            key={p._id}
            to={`/product/${p.slug || p._id}`}
            style={{ minWidth: 140, maxWidth: 140, textDecoration: 'none', color: 'inherit' }}
          >
            {p.images?.[0] && (
              <img
                src={p.images[0]}
                alt=""
                style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
              />
            )}
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }} className="clamp-2">
              {p.name}
            </div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>{p.business?.name}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{money(p.price, p.currency)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
