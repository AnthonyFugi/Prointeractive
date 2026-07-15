import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Rating from '../components/Rating.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ImageCarousel from '../components/ImageCarousel.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [reported, setReported] = useState(false);

  // Ask-the-seller form
  const [asking, setAsking] = useState(false);
  const [askForm, setAskForm] = useState({ subject: '', message: '' });
  const [askState, setAskState] = useState('');

  // Review form
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    api(`/products/${id}`).then((d) => {
      document.title = `${d.product.name} · Prointeractive`;
      setProduct(d.product);
    }).catch((e) => setError(e.message));
    api(`/products/${id}/reviews`).then((d) => setReviews(d.reviews)).catch(() => {});
  }, [id]);

  if (error) return <div className="container"><p className="error-text">{error}</p></div>;

  if (!product) return <div className="container"><p className="muted">Loading…</p></div>;

  const addToCart = () => {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 3500);
  };

  const sendInquiry = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/products/${id}` } });
    setAskState('');
    try {
      await api('/inquiries', {
        method: 'POST',
        body: {
          businessId: product.business._id,
          productId: product._id,
          subject: askForm.subject || `About: ${product.name}`,
          message: askForm.message,
        },
      });
      setAskState('sent');
      setAskForm({ subject: '', message: '' });
    } catch (err) {
      setAskState(err.message);
    }
  };

  const sendReview = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/products/${id}` } });
    setReviewMsg('');
    try {
      await api(`/products/${id}/reviews`, { method: 'POST', body: reviewForm });
      setReviewMsg('sent');
      const d = await api(`/products/${id}/reviews`);
      setReviews(d.reviews);
    } catch (err) {
      setReviewMsg(err.message);
    }
  };

  return (
    <div className="container">
      <p style={{ marginTop: '1.25rem' }}><Link to="/">← Back to shop</Link></p>
      <div className="panel">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          {product.images?.length > 0 && (
            <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
              <ImageCarousel images={product.images} alt={product.name} />
            </div>
          )}
          <div style={{ flex: '1 1 320px' }}>
            <h1>{product.name}</h1>
            <p className="muted">
              Sold by{' '}
              <Link to={`/businesses/${product.business.slug || product.business._id}`}>{product.business.name}</Link>
              {product.business.verified && <VerifiedBadge size={15} />}
              {product.business.location && ` · ${product.business.location}`}
            </p>
            {product.ratingCount > 0 && <Rating value={product.ratingAverage} count={product.ratingCount} />}
            <p style={{ marginTop: '0.75rem' }}>{product.description}</p>
            <p className="muted">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          </div>
          <div style={{ flex: '0 0 220px' }}>
            <p className="price" style={{ fontSize: '1.6rem' }}>{money(product.price, product.currency)}</p>
            <label htmlFor="qty">Quantity</label>
            <input id="qty" type="number" min={1} max={product.stock} value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
            <button className="btn btn-red" style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={product.stock < 1} onClick={addToCart}>
              {added ? 'Added ✓' : 'Add to cart'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setAsking(!asking)}>
              Ask the seller
            </button>
          </div>
        </div>

        <p style={{ marginTop: '0.75rem' }}>
          {reported ? (
            <span className="muted">Thanks — this listing has been reported for review.</span>
          ) : (
            <button
              className="link-btn muted"
              style={{ fontSize: '0.85rem', textDecoration: 'underline' }}
              onClick={async () => {
                const reason = window.prompt('Why are you reporting this listing? (spam / scam / counterfeit / inappropriate)');
                if (reason === null) return;
                try {
                  await api('/reports', {
                    method: 'POST',
                    body: { targetType: 'product', targetId: product._id, reason: 'other', details: reason.slice(0, 500) },
                  });
                  setReported(true);
                } catch (e) { alert(e.message); }
              }}
            >
              Report this listing
            </button>
          )}
        </p>

        {added && (
          <div className="toast" role="status">
            ✓ Added to cart — <Link to="/cart">View cart</Link>
          </div>
        )}

        {asking && (
          <form onSubmit={sendInquiry} style={{ marginTop: '1rem', maxWidth: 480 }}>
            <label htmlFor="subject">Subject</label>
            <input id="subject" placeholder={`About: ${product.name}`} value={askForm.subject}
              onChange={(e) => setAskForm({ ...askForm, subject: e.target.value })} />
            <label htmlFor="message">Your question</label>
            <textarea id="message" required placeholder="Is this available in other sizes?"
              value={askForm.message}
              onChange={(e) => setAskForm({ ...askForm, message: e.target.value })} />
            {askState === 'sent'
              ? <p className="success-text">Sent. Replies land in your <Link to="/inbox">inbox</Link>.</p>
              : askState && <p className="error-text">{askState}</p>}
            <button className="btn btn-navy" style={{ marginTop: '0.5rem' }}>Send question</button>
          </form>
        )}
      </div>

      <h2 className="section-title">Reviews</h2>
      {reviews.length === 0
        ? <p className="muted">No reviews yet. Reviews open after a delivered order.</p>
        : reviews.map((r) => (
          <div className="panel" key={r._id}>
            <div className="row spread">
              <strong>{r.user?.name || 'Customer'}</strong>
              <Rating value={r.rating} />
            </div>
            {r.comment && <p style={{ margin: '0.4rem 0 0' }}>{r.comment}</p>}
          </div>
        ))}

      <div className="panel">
        <h3>Write a review</h3>
        <p className="muted">Available once your order of this product is delivered.</p>
        <form onSubmit={sendReview} style={{ maxWidth: 480 }}>
          <label htmlFor="rating">Rating</label>
          <select id="rating" value={reviewForm.rating}
            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
          <label htmlFor="comment">Comment</label>
          <textarea id="comment" value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
          {reviewMsg === 'sent'
            ? <p className="success-text">Review published.</p>
            : reviewMsg && <p className="error-text">{reviewMsg}</p>}
          <button className="btn btn-navy" style={{ marginTop: '0.5rem' }}>Publish review</button>
        </form>
      </div>
    </div>
  );
}
