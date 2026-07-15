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
    api(`/products?business=${business._id}&limit=24`).then((d) => setProducts(d.products)).catch(() => {});
  }, [business?._id]);

  const send = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/businesses/${id}` } });
    try {
      await api('/inquiries', {
        method: 'POST',
        body: { businessId: id, subject: form.subject, message: form.message },
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
          <div>
            <h1>{business.name}{business.verified && <VerifiedBadge size={22} />}</h1>
            <p className="muted">{(business.categories?.length ? business.categories.join(' · ') : business.category)}{business.location && ` · ${business.location}`}{business.phone && ` · ${business.phone}`}</p>
            {business.description && <p>{business.description}</p>}
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
      <h2 className="section-title">Products</h2>
      {products.length === 0
        ? <p className="muted">No products listed yet.</p>
        : <div className="grid">{products.map((p) => <ProductCard key={p._id} product={p} />)}</div>}
    </div>
  );
}
