import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money } from '../api.js';
import Rating from './Rating.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

export default function ProductCard({ product }) {
  const { user, refresh } = useAuth();
  const saved = user?.favoriteProducts?.some((id) => String(id) === String(product._id));
  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api(`/products/${product._id}/favorite`, { method: 'POST', body: { favorited: !saved } });
      if (refresh) await refresh();
    } catch (_err) {}
  };
  const initial = product.name?.[0]?.toUpperCase() || '?';
  return (
    <Link to={`/products/${product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className="card">
        <div className="card-img">
        {user?.role === 'customer' && (
          <button
            type="button"
            aria-label={saved ? 'Remove from saved items' : 'Save for later'}
            onClick={toggleSave}
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 2,
              background: 'rgba(255,255,255,0.9)', border: '1px solid var(--line)',
              borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
              fontSize: '0.95rem', lineHeight: 1, color: saved ? 'var(--red)' : 'var(--muted)',
            }}
          >
            {saved ? '♥' : '♡'}
          </button>
        )}
          {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : initial}
        </div>
        <div className="card-body">
          <span className="name">{product.name}</span>
          {product.business?.name && (
            <span className="biz">
              {product.business.name}
              {product.business.verified && <VerifiedBadge size={13} />}
            </span>
          )}
          <span className="price">{money(product.price, product.currency)}</span>
          {product.ratingCount > 0 && (
            <Rating value={product.ratingAverage} count={product.ratingCount} />
          )}
          <span className="ask-chip">Ask the seller →</span>
        </div>
      </article>
    </Link>
  );
}
