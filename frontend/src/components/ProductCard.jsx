import { Link } from 'react-router-dom';
import { money } from '../api.js';
import Rating from './Rating.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

export default function ProductCard({ product }) {
  const initial = product.name?.[0]?.toUpperCase() || '?';
  return (
    <Link to={`/products/${product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className="card">
        <div className="card-img">
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
