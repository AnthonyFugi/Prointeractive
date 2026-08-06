import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [deals, setDeals] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef(null);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    api('/products/trending?limit=8').then((d) => setTrending(d.products)).catch(() => {});
    api('/products?featured=true&limit=8').then((d) => setFeatured((d.products || []).filter((p) => p.featured))).catch(() => {});
    api('/businesses?featured=true&limit=6').then((d) => setFeaturedBiz((d.businesses || []).filter((b) => b.featured))).catch(() => {});
    api('/products?onSale=true&limit=8').then((d) => setDeals((d.products || []).filter((p) => p.onSale))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: 1, limit: 12 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (favoritesOnly) params.set('favorites', 'true');
    if (savedOnly) params.set('saved', 'true');
    api(`/products?${params}`)
      .then((d) => {
        setProducts(d.products || []);
        setPage(1);
        setPages(d.pages || 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, category, favoritesOnly, savedOnly]);

  // Fetches the NEXT page and APPENDS — this is what powers infinite scroll.
  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: nextPage, limit: 12 });
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (favoritesOnly) params.set('favorites', 'true');
    if (savedOnly) params.set('saved', 'true');
    api(`/products?${params}`)
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.products || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, pages, query, category, favoritesOnly, savedOnly]);

  // Watches a sentinel element at the bottom of the grid; loads the next
  // page automatically as it scrolls into view — no Prev/Next clicking.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Making business interaction, Easy!</div>
        <h1>What you need, from businesses you trust.</h1>
        <form
          className="searchbar"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What are you looking for today?"
            aria-label="Search products"
          />
          <button className="btn btn-navy" type="submit">Search</button>
        </form>
        <p style={{ marginTop: '0.9rem', fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 700 }}>
          ✓ New &amp; authentic only
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
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>
          <Link to="/register" style={{ fontWeight: 700 }}>Create a free account</Link> to follow stores and save items.
        </p>
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

      {deals.length > 0 && !query && !category && !favoritesOnly && !savedOnly && (
        <section className="trending-band" style={{ borderColor: 'var(--red)' }}>
          <div className="row spread" style={{ alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Deals 🏷️</h2>
            <Link to="/deals" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--red)' }}>See all deals →</Link>
          </div>
          <div className="trending-row">
            {deals.map((p) => (
              <div key={p._id} className="trending-item">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
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
      ) : products.length === 0 ? (
        <div className="empty">
          <h3>No products found</h3>
          <p>Try a different search, or clear the category filter.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {/* Sentinel: as this scrolls into view, loadMore() fires automatically.
              No Prev/Next — the grid just keeps going. */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
              <Loader label="Loading more…" />
            </div>
          )}
          {!loadingMore && page >= pages && products.length > 12 && (
            <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>
              You've reached the end.
            </p>
          )}
        </>
      )}
    </div>
  );
}
