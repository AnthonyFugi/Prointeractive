import { useCallback, useEffect, useRef, useState } from 'react';
import Loader from '../components/Loader.jsx';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Deals() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef(null);

  useEffect(() => {
    document.title = 'Deals · Prointeractive';
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ onSale: 'true', page: 1, limit: 12 });
    if (query) params.set('q', query);
    api(`/products?${params}`)
      .then((d) => {
        setProducts(d.products || []);
        setPage(1);
        setPages(d.pages || 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ onSale: 'true', page: nextPage, limit: 12 });
    if (query) params.set('q', query);
    api(`/products?${params}`)
      .then((d) => {
        setProducts((prev) => [...prev, ...(d.products || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, pages, query]);

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
        <div className="eyebrow" style={{ color: 'var(--red)' }}>Deals 🏷️</div>
        <h1>Special-occasion discounts, while they last.</h1>
        <p className="lede">
          Real businesses running real sales — same trust, same direct messaging, just marked down.
        </p>
        <form className="searchbar" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search deals…"
            aria-label="Search deals"
          />
          <button className="btn btn-navy" type="submit">Search</button>
        </form>
      </section>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <Loader label="Loading deals…" />
      ) : products.length === 0 ? (
        <div className="empty">
          <h3>{query ? `No deals matching "${query}"` : 'No deals right now'}</h3>
          <p>{query ? 'Try a different search.' : 'Sellers run special-occasion discounts from time to time — check back soon, or browse the full shop.'}</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
              <Loader label="Loading more…" />
            </div>
          )}
          {!loadingMore && page >= pages && products.length > 12 && (
            <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>
              That's every deal right now.
            </p>
          )}
        </>
      )}
    </div>
  );
}
