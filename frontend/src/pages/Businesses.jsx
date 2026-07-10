import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Rating from '../components/Rating.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';

const CATEGORIES = ['retail', 'food', 'fashion', 'electronics', 'services', 'agriculture', 'health', 'education', 'other'];

export default function Businesses() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ businesses: [], total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const LIMIT = 12;
  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    api(`/businesses?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, category, page]);

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: '1rem' }}>
        <div className="eyebrow">Directory</div>
        <h1>Businesses on Prointeractive</h1>
        <p className="lede">
          Browse storefronts, check what they sell, and start a conversation.{' '}
          <Link to="/sell" style={{ fontWeight: 600 }}>Own a business? Join them →</Link>
        </p>
        <form
          className="searchbar"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search businesses by name…"
            aria-label="Search businesses"
          />
          <button className="btn btn-navy" type="submit">Search</button>
        </form>
        <div className="chips" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? 'on' : ''}`}
              onClick={() => { setPage(1); setCategory(category === c ? '' : c); }}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Loading businesses…</p>
      ) : data.businesses.length === 0 ? (
        <div className="empty">
          <h3>No businesses found</h3>
          <p>{query || category ? 'Try a different search, or clear the category filter.' : 'Be the first — register a business account.'}</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {data.businesses.map((b) => (
              <Link key={b._id} to={`/businesses/${b._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article className="card">
                  <div className="card-img">
                    {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : b.name[0].toUpperCase()}
                  </div>
                  <div className="card-body">
                    <span className="name">
                      {b.name}{b.verified && <VerifiedBadge size={15} />}
                    </span>
                    <span className="biz">{b.category}{b.location && ` · ${b.location}`}</span>
                    {b.ratingCount > 0 && <Rating value={b.ratingAverage} count={b.ratingCount} />}
                  </div>
                </article>
              </Link>
            ))}
          </div>
          {pages > 1 && (
            <div className="row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
              <span className="muted">Page {page} of {pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
