import { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [bizFilter, setBizFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then((d) => setStats(d.stats)).catch((e) => setError(e.message));
    api('/admin/businesses').then((d) => setBusinesses(d.businesses)).catch(() => {});
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {});
    api('/admin/orders').then((d) => setOrders(d.orders)).catch(() => {});
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const d = await api('/categories', { method: 'POST', body: { name: newCategory } });
      setCategories((prev) => [...prev, d.category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory('');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeCategory = async (c) => {
    setError('');
    try {
      await api(`/categories/${c._id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((x) => x._id !== c._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const setFee = async (o, status) => {
    try {
      const d = await api(`/admin/orders/${o._id}/fee`, { method: 'PATCH', body: { status } });
      setOrders((prev) => prev.map((x) => (x._id === o._id ? d.order : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const resolveReport = async (r, status) => {
    try {
      const d = await api(`/admin/reports/${r._id}`, { method: 'PATCH', body: { status } });
      setReports((prev) => prev.map((x) => (x._id === r._id ? d.report : x)));
    } catch (e) { setError(e.message); }
  };

  const toggleSuspend = async (u) => {
    try {
      await api(`/admin/users/${u._id}/suspend`, { method: 'PATCH', body: { suspended: !u.suspended } });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, suspended: !u.suspended } : x)));
    } catch (e) { setError(e.message); }
  };

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
    ['Verification requests', stats.verificationRequests],
    ['Active products', stats.products],
    ['Orders', stats.orders],
    ['Open inquiries', stats.openInquiries],
    ['Revenue (paid+)', money(stats.revenue)],
    ['Fees due from sellers', money(stats.feesDue)],
  ];

  return (
    <div className="container">
      <h1 style={{ marginTop: '2rem' }}>Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="tabs" role="tablist">
        {['overview', 'businesses', 'users', 'orders', 'categories'].map((t) => (
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

      {tab === 'businesses' && (
        <div className="row" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            ['all', `All (${businesses.length})`],
            ['verified', `Verified (${businesses.filter((b) => b.verified).length})`],
            ['unverified', `Unverified (${businesses.filter((b) => !b.verified).length})`],
            ['requested', `⚑ Requested (${businesses.filter((b) => b.verificationRequested && !b.verified).length})`],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${bizFilter === key ? 'btn-navy' : 'btn-ghost'}`}
              onClick={() => setBizFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'businesses' && [...businesses]
        .filter((b) => {
          if (bizFilter === 'verified') return b.verified;
          if (bizFilter === 'unverified') return !b.verified;
          if (bizFilter === 'requested') return b.verificationRequested && !b.verified;
          return true;
        })
        .sort((a, b) => (b.verificationRequested && !b.verified ? 1 : 0) - (a.verificationRequested && !a.verified ? 1 : 0))
        .map((b) => (
        <div className="panel row spread" key={b._id}>
          <div>
            <strong>{b.name}</strong>{' '}
            {b.verified
              ? <span className="badge verified">verified</span>
              : b.verificationRequested
                ? <span className="badge pending">⚑ verification requested</span>
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

      {tab === 'categories' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <h3>Product categories</h3>
          <p className="muted">These power the category dropdown sellers use and the filter chips shoppers see.</p>
          <form onSubmit={addCategory} className="row">
            <input
              placeholder="New category name…"
              required minLength={2} maxLength={40}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ flex: 1 }}
              aria-label="New category name"
            />
            <button className="btn btn-navy">Add</button>
          </form>
          <hr className="divider" />
          {categories.map((c) => (
            <div className="row spread" key={c._id} style={{ padding: '0.35rem 0' }}>
              <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => removeCategory(c)}>Remove</button>
            </div>
          ))}
        </div>
      )}

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

      {tab === 'reports' && (reports.length === 0 ? (
        <div className="empty"><h3>No reports</h3><p>User reports of content or behaviour will appear here.</p></div>
      ) : reports.map((r) => (
        <div className="panel row spread" key={r._id}>
          <div>
            <strong style={{ textTransform: 'capitalize' }}>{r.targetType}</strong>
            <span className="muted"> · {r.reason.replace(/_/g, ' ')} · by {r.reporter?.name || 'Unknown'} · {new Date(r.createdAt).toLocaleString()}</span>
            {r.details && <p className="muted" style={{ margin: '0.25rem 0 0' }}>"{r.details}"</p>}
            <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>target id: {r.targetId}</p>
          </div>
          <div className="row">
            {r.status === 'open' ? (
              <button className="btn btn-navy btn-sm" onClick={() => resolveReport(r, 'resolved')}>Mark resolved</button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r, 'open')}>Reopen</button>
            )}
            <span className={`badge ${r.status === 'open' ? 'pending' : 'delivered'}`}>{r.status}</span>
          </div>
        </div>
      )))}

      {tab === 'orders' && orders.map((o) => (
        <div className="panel row spread" key={o._id}>
          <div>
            <strong>{o.customer?.name}</strong> → <strong>{o.business?.name}</strong>
            <p className="muted" style={{ margin: 0 }}>
              {new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s) · {money(o.totalAmount, o.currency)}
              {o.platformFee?.amount > 0 && ` · fee ${money(o.platformFee.amount, o.currency)} (${o.platformFee.status})`}
            </p>
          </div>
          <div className="row">
            {o.platformFee?.status === 'due' && (
              <button className="btn btn-navy btn-sm" onClick={() => setFee(o, 'settled')}>
                Mark fee settled
              </button>
            )}
            {o.platformFee?.status === 'settled' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFee(o, 'due')}>
                Reopen fee
              </button>
            )}
            <StatusBadge status={o.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
