import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const load = () => api('/orders/mine').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const [paying, setPaying] = useState('');

  const payNow = async (id) => {
    setPaying(id); setError('');
    try {
      const d = await api(`/payments/checkout/${id}`, { method: 'POST' });
      window.location.href = d.link;
    } catch (e) {
      setError(e.message);
      setPaying('');
    }
  };

  const cancel = async (id) => {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginTop: '2rem' }}>My orders</h1>
      {error && <p className="error-text">{error}</p>}
      {orders.length === 0 ? (
        <div className="empty"><h3>No orders yet</h3><p><Link to="/">Find something you like</Link>.</p></div>
      ) : orders.map((o) => (
        <div className="panel" key={o._id}>
          <div className="row spread">
            <div>
              <strong>{o.business?.name}</strong>
              <span className="muted"> · {new Date(o.createdAt).toLocaleDateString()}</span>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
            {o.items.map((i, idx) => (
              <li key={idx}>{i.quantity} × {i.name} — {money(i.price * i.quantity, o.currency)}</li>
            ))}
          </ul>
          <div className="row spread">
            <span className="price">{money(o.totalAmount, o.currency)}</span>
            {o.status === 'pending' && (
              <div className="row">
                {o.paymentMethod !== 'cash_on_delivery' && (
                  <button className="btn btn-red btn-sm" disabled={paying === o._id} onClick={() => payNow(o._id)}>
                    {paying === o._id ? 'Opening checkout…' : 'Pay now'}
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => cancel(o._id)}>Cancel order</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
