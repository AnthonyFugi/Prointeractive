import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = [
  ['Create your account', 'Sign up as a business in under a minute — all you need is an email.'],
  ['Set up your storefront', 'Add your business details and list products with photos and prices.'],
  ['Start selling', 'Customers find you, message you directly, and pay by mobile money, card, or cash on delivery.'],
];

const BENEFITS = [
  ['Your own storefront', 'A page for your business with all your products, reachable by every Prointeractive customer.'],
  ['Talk to your customers', 'Built-in chat on every product. Answer questions, negotiate bulk orders, build trust before the sale.'],
  ['Get paid, automatically', 'Mobile money and card payments settle to your bank account. Cash on delivery supported too.'],
  ['Simple pricing', 'No listing fees, no monthly fees. Just 5% on completed sales — you earn, we earn.'],
  ['Premium goods only', 'Prointeractive is a new-items marketplace: authentic, first-owner, first-grade products. That standard is why buyers trust every storefront here — including yours.'],
];

export default function Sell() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  const switchToBusiness = async () => {
    setSwitching(true); setError('');
    try {
      await api('/auth/become-business', { method: 'POST' });
      if (refresh) await refresh();
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
      setSwitching(false);
    }
  };

  const isCustomer = user && user.role === 'customer';
  const cta = user
    ? user.role === 'business'
      ? { to: '/dashboard', label: 'Go to your dashboard' }
      : null // customer: upgrade button instead of a link
    : { to: '/register?role=business', label: 'Start selling — it’s free' };

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">For businesses</div>
        <h1>Put your business in front of Zambia.</h1>
        <p className="lede">
          Prointeractive gives your business a storefront, a direct line to customers,
          and payments that just work — mobile money, cards, or cash on delivery.
        </p>
        <div className="row" style={{ marginTop: '1rem' }}>
          {isCustomer ? (
            <button className="btn btn-red" onClick={switchToBusiness} disabled={switching}>
              {switching ? 'Switching…' : 'Turn my account into a business account'}
            </button>
          ) : (
            <Link to={cta.to} className="btn btn-red">{cta.label}</Link>
          )}
          <Link to="/businesses" className="btn btn-ghost">See businesses already selling</Link>
        </div>
        {isCustomer && (
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            You're signed in as {user.name} — one click makes this account a seller account.
            Your orders and messages stay exactly as they are.
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {BENEFITS.map(([title, body]) => (
            <div className="panel" key={title}>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ margin: '2.5rem 0' }}>
        <h2>How it works</h2>
        {STEPS.map(([title, body], i) => (
          <div className="row" key={title} style={{ alignItems: 'flex-start', marginTop: '1rem' }}>
            <div style={{
              background: 'var(--navy)', color: '#fff', borderRadius: '50%',
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <div>
              <strong>{title}</strong>
              <p className="muted" style={{ margin: 0 }}>{body}</p>
            </div>
          </div>
        ))}
        {isCustomer ? (
          <button className="btn btn-red" style={{ marginTop: '1.5rem' }} onClick={switchToBusiness} disabled={switching}>
            {switching ? 'Switching…' : 'Turn my account into a business account'}
          </button>
        ) : (
          <Link to={cta.to} className="btn btn-red" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
            {cta.label}
          </Link>
        )}
      </section>
    </div>
  );
}
