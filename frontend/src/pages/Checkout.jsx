import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

export default function Checkout() {
  const { groups, total, clear, items } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ line1: '', city: '', country: 'Zambia', phone: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const groupList = Object.values(groups);
  if (items.length === 0) {
    return <div className="container"><div className="empty" style={{ marginTop: '3rem' }}>
      <h3>Nothing to check out</h3><p><Link to="/">Back to shop</Link></p></div></div>;
  }

  const placeOrders = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const created = [];
      for (const g of groupList) {
        const d = await api('/orders', {
          method: 'POST',
          body: {
            items: g.items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            shippingAddress: address,
            paymentMethod,
          },
        });
        created.push(d.order);
      }
      clear();

      // Single order paid online -> straight into Flutterwave's checkout
      if (paymentMethod !== 'cash_on_delivery' && created.length === 1) {
        const pay = await api(`/payments/checkout/${created[0]._id}`, { method: 'POST' });
        window.location.href = pay.link;
        return;
      }
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: '2rem' }}>Checkout</h1>
      <div className="panel">
        {groupList.map((g) => (
          <p key={g.businessId} className="muted">
            {g.items.length} item{g.items.length > 1 ? 's' : ''} from <strong>{g.businessName}</strong>
          </p>
        ))}
        <p className="price" style={{ fontSize: '1.3rem' }}>Total {money(total)}</p>
      </div>
      <form className="panel" onSubmit={placeOrders}>
        <h3>Delivery</h3>
        <label htmlFor="line1">Address</label>
        <input id="line1" required value={address.line1}
          onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
        <label htmlFor="city">City</label>
        <input id="city" required value={address.city}
          onChange={(e) => setAddress({ ...address, city: e.target.value })} />
        <label htmlFor="country">Country</label>
        <input id="country" required value={address.country}
          onChange={(e) => setAddress({ ...address, country: e.target.value })} />
        <label htmlFor="aphone">Phone number (for the delivery)</label>
        <input id="aphone" type="tel" required placeholder="e.g. 097 1234567" value={address.phone}
          onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
        <label htmlFor="anote">Delivery note <span className="muted">(optional — landmarks, directions)</span></label>
        <input id="anote" placeholder="e.g. Blue gate opposite the filling station" value={address.note}
          onChange={(e) => setAddress({ ...address, note: e.target.value })} />
        <label htmlFor="pay">Payment method</label>
        <select id="pay" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="mobile_money">Mobile money</option>
          <option value="card">Card</option>
          <option value="cash_on_delivery">Cash on delivery</option>
        </select>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-red" style={{ width: '100%', marginTop: '1rem' }} disabled={busy}>
          {busy ? 'Placing order…' : `Place order · ${money(total)}`}
        </button>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          Mobile money and card payments are processed securely by Flutterwave.
          Cash on delivery is settled directly with the business.
        </p>
      </form>
    </div>
  );
}
