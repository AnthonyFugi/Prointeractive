import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pages: 1, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 12 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    api(`/products?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, category, page]);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Making business interaction, Easy!</div>
        <h1>What you need, from businesses you trust.</h1>
        <p className="lede">
          Every product connects you straight to the business behind it.
          Ask a question, agree the details, and pay your way — mobile money,
          card, or cash on delivery.
        </p>
        <form
          className="searchbar"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
          <button className="btn btn-navy" type="submit">Search</button>
        </form>
        <p style={{ marginTop: '0.9rem', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--navy)', fontWeight: 700 }}>✓ New &amp; authentic only</span>
          <span className="muted">
            {' '}— every listing must be first-owner, first-grade.{' '}
            <Link to="/product-standards">Our Product Standards</Link>
          </span>
        </p>
        {user?.role === 'business' ? (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Manage your storefront in the <Link to="/dashboard" style={{ fontWeight: 600 }}>Dashboard →</Link>
          </p>
        ) : user?.role === 'admin' ? null : (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Own a business? <Link to="/sell" style={{ fontWeight: 600 }}>Start selling on Prointeractive →</Link>
          </p>
        )}
        <div className="chips" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c._id}
              className={`chip ${category === c.name ? 'on' : ''}`}
              onClick={() => { setPage(1); setCategory(category === c.name ? '' : c.name); }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Loading products…</p>
      ) : data.products.length === 0 ? (
        <div className="empty">
          <h3>No products found</h3>
          <p>Try a different search, or clear the category filter.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {data.products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {data.pages > 1 && (
            <div className="row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
              <span className="muted">Page {page} of {data.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
