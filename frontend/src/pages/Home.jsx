import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

const CATEGORIES = ['fashion', 'electronics', 'food', 'agriculture', 'health', 'services', 'general'];

export default function Home() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pages: 1, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        <h1>Buy from businesses you can actually talk to.</h1>
        <p className="lede">
          Every product on Prointeractive comes with a direct line to the business behind it.
          Ask about stock, request bulk pricing, or just say hello before you buy.
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
