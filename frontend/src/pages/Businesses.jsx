import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Rating from '../components/Rating.jsx';

export default function Businesses() {
  const [data, setData] = useState({ businesses: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    api('/businesses?limit=24').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: '1rem' }}>
        <div className="eyebrow">Directory</div>
        <h1>Businesses on Prointeractive</h1>
        <p className="lede">Browse storefronts, check what they sell, and start a conversation.</p>
      </section>
      {error && <p className="error-text">{error}</p>}
      {data.businesses.length === 0 ? (
        <div className="empty"><h3>No businesses yet</h3><p>Be the first — register a business account.</p></div>
      ) : (
        <div className="grid">
          {data.businesses.map((b) => (
            <Link key={b._id} to={`/businesses/${b._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article className="card">
                <div className="card-img">{b.name[0].toUpperCase()}</div>
                <div className="card-body">
                  <span className="name">
                    {b.name} {b.verified && <span className="badge verified">verified</span>}
                  </span>
                  <span className="biz">{b.category}{b.location && ` · ${b.location}`}</span>
                  {b.ratingCount > 0 && <Rating value={b.ratingAverage} count={b.ratingCount} />}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
