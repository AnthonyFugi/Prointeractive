import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getLocalInterests, setLocalInterests } from '../interests.js';

/**
 * Two-step picker: choose categories, then follow a few stores.
 *
 * Works signed out. A visitor picks interests, they're kept locally, and the
 * feed reshapes immediately — no account required. Following a store does need
 * one, so that step invites sign-in rather than demanding it.
 *
 * Every step is skippable. The point is a less cluttered shop, and a shopper
 * who abandons a mandatory quiz gets no shop at all.
 */
export default function InterestPicker({ onClose, onSaved }) {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [chosen, setChosen] = useState(() => new Set(getLocalInterests()));
  const [suggested, setSuggested] = useState([]);
  const [following, setFollowing] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/categories')
      .then((d) => setCategories(d.categories || []))
      .catch(() => setError('Could not load categories. You can still browse everything.'))
      .finally(() => setLoading(false));
  }, []);

  // Seed from the account when signed in, so re-opening shows current choices.
  useEffect(() => {
    if (user?.interests?.length) setChosen(new Set(user.interests));
  }, [user]);

  const toggle = (name) =>
    setChosen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const persist = async (list, { completed = false, skipped = false } = {}) => {
    // Always keep a local copy: it's what personalises the feed for a visitor
    // who hasn't signed in, and a harmless duplicate for one who has.
    setLocalInterests(list);
    if (!user) return;
    try {
      await api('/auth/onboarding', { method: 'PATCH', body: { interests: list, completed, skipped } });
      await refresh();
    } catch {
      /* local copy still drives the feed */
    }
  };

  const goToStores = async () => {
    const list = [...chosen];
    setSaving(true);
    setError('');
    try {
      await persist(list);
      const qs = new URLSearchParams({ limit: 6 });
      if (list.length) qs.set('interests', list.join(','));
      const d = await api(`/businesses/suggested?${qs}`);
      setSuggested(d.businesses || []);
      setStep('stores');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFollow = async (biz) => {
    if (!user) {
      // Don't silently drop the tap — say what's needed and why.
      setError('Sign in to follow stores. Your picks are saved either way.');
      return;
    }
    const on = !following.has(biz._id);
    setFollowing((prev) => {
      const next = new Set(prev);
      on ? next.add(biz._id) : next.delete(biz._id);
      return next;
    });
    try {
      await api(`/businesses/${biz._id}/favorite`, { method: 'POST', body: { favorited: on } });
    } catch {
      setFollowing((prev) => {           // roll back so the UI can't lie
        const next = new Set(prev);
        on ? next.delete(biz._id) : next.add(biz._id);
        return next;
      });
    }
  };

  const finish = async () => {
    setSaving(true);
    await persist([...chosen], { completed: true });
    if (user) await refresh();
    setSaving(false);
    onSaved?.([...chosen]);
    onClose?.();
  };

  const skip = async () => {
    await persist([...chosen], { skipped: true });
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,10,40,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div className="panel" style={{ maxWidth: 520, width: '100%', margin: 0, maxHeight: '88vh', overflowY: 'auto' }}>
        {step === 'categories' ? (
          <>
            <h2 id="picker-title" style={{ marginTop: 0, marginBottom: '0.3rem' }}>What are you shopping for?</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Pick a few and we'll put those first. You can change this any time.
            </p>

            {loading ? (
              <p className="muted">Loading…</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1.1rem 0' }}>
                {categories.map((c) => {
                  const on = chosen.has(c.name);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggle(c.name)}
                      aria-pressed={on}
                      style={{
                        borderRadius: 999,
                        border: `1.5px solid ${on ? 'var(--navy)' : 'var(--line)'}`,
                        background: on ? 'var(--navy)' : 'transparent',
                        color: on ? '#fff' : 'var(--ink)',
                        padding: '0.45rem 0.9rem',
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-red" onClick={goToStores} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : chosen.size ? `Continue with ${chosen.size}` : 'Continue'}
              </button>
              <button className="btn btn-ghost" onClick={skip} disabled={saving}>Skip</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="picker-title" style={{ marginTop: 0, marginBottom: '0.3rem' }}>Stores you might like</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Follow a few to see their new stock in your feed.
            </p>

            {suggested.length === 0 ? (
              <p className="muted" style={{ margin: '1.2rem 0' }}>
                No stores match those interests just yet — new ones are joining every week.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.6rem', margin: '1.1rem 0' }}>
                {suggested.map((b) => (
                  <div key={b._id} className="row spread" style={{ alignItems: 'center', gap: '0.7rem' }}>
                    <div className="row" style={{ alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--line)' }} />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--navy-soft)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'var(--navy)' }}>
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block' }}>{b.name}</strong>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>
                          {(b.categories || []).slice(0, 2).join(' · ') || b.location || 'Zambia'}
                        </span>
                      </div>
                    </div>
                    <button
                      className={following.has(b._id) ? 'btn btn-ghost btn-sm' : 'btn btn-navy btn-sm'}
                      onClick={() => toggleFollow(b)}
                    >
                      {following.has(b._id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-red" onClick={finish} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : 'Start shopping'}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('categories')} disabled={saving}>Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
