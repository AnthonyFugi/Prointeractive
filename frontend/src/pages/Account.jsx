import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, setDisplayCurrency } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import ProductCard from '../components/ProductCard.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';

export default function Account() {
  const { user, refresh } = useAuth();
  const [saved, setSaved] = useState(null);
  const [following, setFollowing] = useState(null);

  useEffect(() => {
    document.title = 'My account · Prointeractive';
    if (!user) return;
    api('/products?saved=true&limit=100').then((d) => setSaved(d.products)).catch(() => setSaved([]));
    api('/businesses/favorites/mine').then((d) => setFollowing(d.businesses)).catch(() => setFollowing([]));
  }, [user?.favoriteProducts?.length, user?.favoriteBusinesses?.length]);

  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;
  if (user.role === 'business') return <Navigate to="/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  const unfollow = async (b) => {
    try {
      await api(`/businesses/${b._id}/favorite`, { method: 'POST', body: { favorited: false } });
      if (refresh) await refresh();
    } catch (_e) {}
  };

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: '1rem' }}>
        <div className="eyebrow">My account</div>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}{user.createdAt ? ` · member since ${new Date(user.createdAt).toLocaleDateString()}` : ''}</p>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <Link to="/my-orders" className="btn btn-navy btn-sm">My orders</Link>
          <Link to="/inbox" className="btn btn-ghost btn-sm">Inbox</Link>
          <Link to="/forgot-password" className="btn btn-ghost btn-sm">Change password</Link>
        </div>
      </section>

      <h2 className="section-title">Following {following && following.length > 0 ? `(${following.length})` : ''}</h2>
      {following === null ? (
        <Loader />
      ) : following.length === 0 ? (
        <p className="muted">
          You're not following any stores yet. <Link to="/businesses">Browse businesses</Link> and tap + Follow — their products will show first in your shop feed.
        </p>
      ) : (
        <div className="grid" style={{ marginBottom: '1.5rem' }}>
          {following.map((b) => (
            <article className="card" key={b._id}>
              <Link to={`/businesses/${b.slug || b._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={`card-img${b.logoUrl ? ' logo' : ''}`}>
                  {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : b.name[0].toUpperCase()}
                </div>
              </Link>
              <div className="card-body">
                <span className="name">
                  <Link to={`/businesses/${b.slug || b._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {b.name}
                  </Link>
                  {b.verified && <VerifiedBadge size={15} />}
                </span>
                <span className="biz">{(b.categories?.length ? b.categories.join(' · ') : b.category)}</span>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.4rem' }} onClick={() => unfollow(b)}>
                  Unfollow
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 className="section-title">Saved items {saved && saved.length > 0 ? `(${saved.length})` : ''}</h2>
      {saved === null ? (
        <Loader />
      ) : saved.length === 0 ? (
        <p className="muted">
          Nothing saved yet. Tap the ♡ on any product to keep it here for later.
        </p>
      ) : (
        <div className="grid">
          {saved.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}

      <div className="panel" style={{ marginTop: '2rem' }}>
        <strong>Preferences</strong>
        <div className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="cur">Display currency</label>
            <select
              id="cur"
              defaultValue={user.preferences?.currency || 'ZMW'}
              onChange={async (e) => {
                try {
                  await api('/auth/preferences', { method: 'PATCH', body: { currency: e.target.value } });
                  setDisplayCurrency(e.target.value);
                  if (refresh) await refresh();
                } catch (err) { alert(err.message); }
              }}
            >
              <option value="ZMW">Zambian Kwacha (K)</option>
              <option value="USD">US Dollar ($ — approximate)</option>
            </select>
          </div>
          <div>
            <label htmlFor="city">My city <span className="muted">(shows nearby stores first)</span></label>
            <input
              id="city"
              placeholder="e.g. Lusaka"
              defaultValue={user.preferences?.city || ''}
              onBlur={async (e) => {
                try {
                  await api('/auth/preferences', { method: 'PATCH', body: { city: e.target.value } });
                  if (refresh) await refresh();
                } catch (err) { alert(err.message); }
              }}
              style={{ maxWidth: 220 }}
            />
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
          USD prices are approximate (1 USD ≈ K18). All payments are processed in Kwacha.
        </p>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>Account settings</strong>
        <p className="muted" style={{ margin: '0.25rem 0 0.5rem' }}>
          Need to leave? You can permanently delete your account and data.
        </p>
        <Link to="/account-deletion" className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
          Delete account
        </Link>
      </div>
    </div>
  );
}
