import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then((d) => setStats(d.stats)).catch((e) => setError(e.message));
    api('/admin/businesses').then((d) => setBusinesses(d.businesses)).catch(() => {});
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {});
    api('/admin/orders').then((d) => setOrders(d.orders)).catch(() => {});
  }, []);

  const toggleVerify = async (b) => {
    try {
      const d = await api(`/admin/businesses/${b._id}/verify`, {
        method: 'PATCH',
        body: { verified: !b.verified },
      });
      setBusinesses((prev) => prev.map((x) => (x._id === b._id ? d.business : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const STAT_LABELS = stats && [
    ['Users', stats.users],
    ['Businesses', stats.businesses],
    ['Awaiting verification', stats.unverified],
    ['Active products', stats.products],
    ['Orders', stats.orders],
    ['Open inquiries', stats.openInquiries],
    ['Revenue (paid+)', money(stats.revenue)],
  ];

  return (
    <div className="container">
      <h1 style={{ marginTop: '2rem' }}>Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="tabs" role="tablist">
        {['overview', 'businesses', 'users', 'orders'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        stats ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {STAT_LABELS.map(([label, value]) => (
              <div className="panel" key={label} style={{ margin: 0 }}>
                <p className="muted" style={{ margin: 0 }}>{label}</p>
                <p className="price" style={{ fontSize: '1.5rem', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        ) : <p className="muted">Loading…</p>
      )}

      {tab === 'businesses' && businesses.map((b) => (
        <div className="panel row spread" key={b._id}>
          <div>
            <strong>{b.name}</strong>{' '}
            {b.verified
              ? <span className="badge verified">verified</span>
              : <span className="badge pending">unverified</span>}
            <p className="muted" style={{ margin: 0 }}>
              {b.category}{b.location && ` · ${b.location}`} · Owner: {b.owner?.name} ({b.owner?.email})
            </p>
          </div>
          <button
            className={`btn btn-sm ${b.verified ? 'btn-ghost' : 'btn-navy'}`}
            onClick={() => toggleVerify(b)}
          >
            {b.verified ? 'Remove verification' : 'Verify business'}
          </button>
        </div>
      ))}

      {tab === 'users' && users.map((u) => (
        <div className="panel row spread" key={u._id}>
          <div>
            <strong>{u.name}</strong>
            <p className="muted" style={{ margin: 0 }}>{u.email}</p>
          </div>
          <span className={`badge ${u.role === 'admin' ? 'verified' : u.role === 'business' ? 'paid' : 'closed'}`}>
            {u.role}
          </span>
        </div>
      ))}

      {tab === 'orders' && orders.map((o) => (
        <div className="panel row spread" key={o._id}>
          <div>
            <strong>{o.customer?.name}</strong> → <strong>{o.business?.name}</strong>
            <p className="muted" style={{ margin: 0 }}>
              {new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s) · {money(o.totalAmount, o.currency)}
            </p>
          </div>
          <StatusBadge status={o.status} />
        </div>
      ))}
    </div>
  );
}
