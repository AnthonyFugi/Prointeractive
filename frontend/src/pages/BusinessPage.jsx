import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';

export default function BusinessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [storeQuery, setStoreQuery] = useState('');
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [state, setState] = useState('');

  useEffect(() => {
    api(`/businesses/${id}`).then((d) => {
      document.title = `${d.business.name} · Prointeractive`;
      setBusiness(d.business);
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!business?._id) return;
    api(`/products?business=${business._id}&limit=100`).then((d) => setProducts(d.products)).catch(() => {});
  }, [business?._id]);

  const send = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/businesses/${id}` } });
    try {
      await api('/inquiries', {
        method: 'POST',
        body: { businessId: business._id, subject: form.subject, message: form.message },
      });
      setState('sent');
      setForm({ subject: '', message: '' });
    } catch (err) {
      setState(err.message);
    }
  };

  if (error) return <div className="container"><p className="error-text">{error}</p></div>;
  if (!business) return <div className="container"><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <p style={{ marginTop: '1.25rem' }}><Link to="/businesses">← All businesses</Link></p>
      <div className="panel">
        <div className="row spread">
          <div className="row" style={{ alignItems: 'center' }}>
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 5, border: '1px solid var(--line)', flexShrink: 0 }}
              />
            )}
            <div>
            <h1>{business.name}{business.verified && <VerifiedBadge size={22} />}</h1>
            <p className="muted">{(business.categories?.length ? business.categories.join(' · ') : business.category)}{business.location && ` · ${business.location}`}{business.phone && ` · ${business.phone}`}</p>
            {business.description && <p>{business.description}</p>}
            </div>
          </div>
          <div className="row">
            {user && user.role === 'customer' && (() => {
              const fav = user.favoriteBusinesses?.some((b) => String(b) === String(business._id));
              return (
                <button
                  className={`btn btn-sm ${fav ? 'btn-red' : 'btn-ghost'}`}
                  onClick={async () => {
                    try {
                      await api(`/businesses/${business._id}/favorite`, { method: 'POST', body: { favorited: !fav } });
                      if (refresh) await refresh();
                    } catch (e) { alert(e.message); }
                  }}
                >
                  {fav ? '♥ Favorited' : '♡ Add to favorites'}
                </button>
              );
            })()}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const url = `${window.location.origin}/businesses/${business.slug || business._id}`;
                if (navigator.share) navigator.share({ title: business.name, url }).catch(() => {});
                else navigator.clipboard.writeText(url).then(() => alert('Link copied'));
              }}
            >
              Share
            </button>
            <button className="btn btn-navy" onClick={() => setAsking(!asking)}>Message this business</button>
          </div>
        </div>
        {asking && (
          <form onSubmit={send} style={{ maxWidth: 480, marginTop: '1rem' }}>
            <label htmlFor="subj">Subject</label>
            <input id="subj" required value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <label htmlFor="msg">Message</label>
            <textarea id="msg" required value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} />
            {state === 'sent'
              ? <p className="success-text">Sent. Replies land in your <Link to="/inbox">inbox</Link>.</p>
              : state && <p className="error-text">{state}</p>}
            <button className="btn btn-navy" style={{ marginTop: '0.5rem' }}>Send message</button>
          </form>
        )}
      </div>
      <div className="row spread" style={{ alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Products</h2>
        {products.length > 3 && (
          <input
            placeholder={`Search in ${business.name}…`}
            value={storeQuery}
            onChange={(e) => setStoreQuery(e.target.value)}
            style={{ maxWidth: 260 }}
          />
        )}
      </div>
      {(() => {
        const q = storeQuery.trim().toLowerCase();
        const shown = q
          ? products.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
          : products;
        if (shown.length === 0) {
          return <p className="muted">{q ? `Nothing matching “${storeQuery}” in this store.` : 'No products listed yet.'}</p>;
        }
        return <div className="grid">{shown.map((p) => <ProductCard key={p._id} product={p} />)}</div>;
      })()}
    </div>
  );
}
