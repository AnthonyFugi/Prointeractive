import { useEffect, useState } from 'react';
import Loader from '../components/Loader.jsx';
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
  const [savedOnly, setSavedOnly] = useState(false);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredBiz, setFeaturedBiz] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ products: [], pages: 1, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    api('/products/trending?limit=8').then((d) => setTrending(d.products)).catch(() => {});
    api('/products?featured=true&limit=8').then((d) => setFeatured((d.products || []).filter((p) => p.featured))).catch(() => {});
    api('/businesses?featured=true&limit=6').then((d) => setFeaturedBiz((d.businesses || []).filter((b) => b.featured))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 12 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (favoritesOnly) params.set('favorites', 'true');
    if (savedOnly) params.set('saved', 'true');
    api(`/products?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, category, favoritesOnly, savedOnly, page]);

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
          {user?.role === 'customer' && user.favoriteBusinesses?.length > 0 && (
            <button
              className={`chip ${favoritesOnly ? 'on' : ''}`}
              onClick={() => { setPage(1); setFavoritesOnly(!favoritesOnly); }}
            >
              ♥ My stores
            </button>
          )}
          {user?.role === 'customer' && user.favoriteProducts?.length > 0 && (
            <button
              className={`chip ${savedOnly ? 'on' : ''}`}
              onClick={() => { setPage(1); setSavedOnly(!savedOnly); }}
            >
              ♥ Saved items
            </button>
          )}
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
      {!user && !query && !category && (
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderColor: 'var(--navy)' }}>
          <p style={{ margin: 0, flex: '1 1 260px' }}>
            <strong>Shop smarter with a free account</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Follow your favorite stores, save items for later, and see what you care about first.
            </span>
          </p>
          <div className="row">
            <Link to="/register" className="btn btn-red btn-sm">Create account</Link>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          </div>
        </div>
      )}

      {(featured.length > 0 || featuredBiz.length > 0) && !query && !category && !favoritesOnly && !savedOnly && (
        <section className="featured-band">
          <div className="row spread" style={{ alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Featured</h2>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Hand-picked on Prointeractive</span>
          </div>
          {featuredBiz.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: featured.length > 0 ? '0.75rem' : 0 }}>
              {featuredBiz.map((b) => (
                <Link key={b._id} to={`/businesses/${b.slug || b._id}`} className="chip" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {b.logoUrl && <img src={b.logoUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'contain', background: '#fff' }} />}
                  {b.name}
                </Link>
              ))}
            </div>
          )}
          {featured.length > 0 && (
            <div className="trending-row">
              {featured.map((p) => (
                <div key={'f-' + p._id} className="trending-item">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {trending.length > 0 && !query && !category && !favoritesOnly && !savedOnly && (
        <section className="trending-band">
          <div className="row spread" style={{ alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Trending 🔥</h2>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Most ordered this month</span>
          </div>
          <div className="trending-row">
            {trending.map((p) => (
              <div key={p._id} className="trending-item">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <Loader label="Loading products…" />
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
