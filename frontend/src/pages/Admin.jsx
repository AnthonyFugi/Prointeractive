import { useEffect, useState } from 'react';
import Loader from '../components/Loader.jsx';
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
  const [bizSearch, setBizSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [adminProducts, setAdminProducts] = useState([]);
  const [an, setAn] = useState(null);
  const [prodSearch, setProdSearch] = useState('');
  const [prodFilter, setProdFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCat, setEditingCat] = useState(null); // { id, name }

  const moveCategory = async (index, dir) => {
    const next = [...categories];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setCategories(next); // optimistic
    try {
      const d = await api('/categories/reorder', { method: 'PUT', body: { ids: next.map((c) => c._id) } });
      setCategories(d.categories);
    } catch (err) { setError(err.message); }
  };

  const saveCategoryName = async (e) => {
    e.preventDefault();
    try {
      const d = await api(`/categories/${editingCat.id}`, { method: 'PATCH', body: { name: editingCat.name } });
      setCategories((prev) => prev.map((c) => (c._id === editingCat.id ? d.category : c)));
      setEditingCat(null);
    } catch (err) { setError(err.message); }
  };
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then((d) => setStats(d.stats)).catch((e) => setError(e.message));
    api('/admin/businesses').then((d) => setBusinesses(d.businesses)).catch(() => {});
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {});
    api('/admin/orders').then((d) => setOrders(d.orders)).catch(() => {});
    api('/admin/reports').then((d) => setReports(d.reports)).catch(() => {});
    api('/admin/products').then((d) => setAdminProducts(d.products)).catch(() => {});
    api('/admin/analytics').then((d) => setAn(d.analytics)).catch(() => {});
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

  const toggleClosed = async (b) => {
    const closing = !b.closed;
    if (closing && !window.confirm(`Close ${b.name}? Its storefront will be hidden and its products removed from the shop. Reopening restores them.`)) return;
    try {
      const d = await api(`/admin/businesses/${b._id}/closed`, { method: 'PATCH', body: { closed: closing } });
      setBusinesses((prev) => prev.map((x) => (x._id === b._id ? d.business : x)));
    } catch (e) { setError(e.message); }
  };

  const toggleProductFeatured = async (prod) => {
    try {
      const d = await api(`/admin/products/${prod._id}/featured`, { method: 'PATCH', body: { featured: !prod.featured } });
      setAdminProducts((prev) => prev.map((x) => (x._id === prod._id ? d.product : x)));
    } catch (e) { setError(e.message); }
  };

  const toggleBusinessFeatured = async (b) => {
    try {
      const d = await api(`/admin/businesses/${b._id}/featured`, { method: 'PATCH', body: { featured: !b.featured } });
      setBusinesses((prev) => prev.map((x) => (x._id === b._id ? d.business : x)));
    } catch (e) { setError(e.message); }
  };

  const toggleProductActive = async (prod) => {
    try {
      await api(`/products/${prod._id}`, { method: 'PATCH', body: { isActive: !prod.isActive } });
      setAdminProducts((prev) => prev.map((x) => (x._id === prod._id ? { ...x, isActive: !prod.isActive } : x)));
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
    ['Hidden products', stats.hiddenProducts],
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
        {['overview', 'analytics', 'businesses', 'products', 'users', 'orders', 'reports', 'categories'].map((t) => (
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
          <input
            placeholder="Search businesses…"
            value={bizSearch}
            onChange={(e) => setBizSearch(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          {[
            ['all', `All (${businesses.length})`],
            ['verified', `Verified (${businesses.filter((b) => b.verified).length})`],
            ['unverified', `Unverified (${businesses.filter((b) => !b.verified).length})`],
            ['requested', `⚑ Requested (${businesses.filter((b) => b.verificationRequested && !b.verified).length})`],
            ['closed', `Closed (${businesses.filter((b) => b.closed).length})`],
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
          if (bizFilter === 'closed') return b.closed;
          return true;
        })
        .filter((b) => {
          const q = bizSearch.trim().toLowerCase();
          if (!q) return true;
          return b.name?.toLowerCase().includes(q) || b.owner?.email?.toLowerCase().includes(q);
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
              {(b.categories?.length ? b.categories.join(', ') : b.category)}{b.location && ` · ${b.location}`} · Owner: {b.owner?.name} ({b.owner?.email})
            </p>
          </div>
          <div className="row">
            {b.closed && <span className="badge cancelled">closed</span>}
            <button className={`btn btn-sm ${b.featured ? 'btn-red' : 'btn-ghost'}`} onClick={() => toggleBusinessFeatured(b)}>
              {b.featured ? '★ Featured' : '☆ Feature'}
            </button>
            <button
              className={`btn btn-sm ${b.verified ? 'btn-ghost' : 'btn-navy'}`}
              onClick={() => toggleVerify(b)}
            >
              {b.verified ? 'Remove verification' : 'Verify business'}
            </button>
            <button
              className={`btn btn-sm ${b.closed ? 'btn-navy' : 'btn-danger'}`}
              onClick={() => toggleClosed(b)}
            >
              {b.closed ? 'Reopen' : 'Close'}
            </button>
          </div>
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
          {categories.map((c, i) => (
            <div className="row spread" key={c._id} style={{ padding: '0.35rem 0' }}>
              {editingCat?.id === c._id ? (
                <form onSubmit={saveCategoryName} className="row" style={{ flex: 1 }}>
                  <input
                    autoFocus required minLength={2} maxLength={40}
                    value={editingCat.name}
                    onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-navy btn-sm">Save</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingCat(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
                  <div className="row">
                    <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moveCategory(i, -1)} aria-label="Move up">↑</button>
                    <button className="btn btn-ghost btn-sm" disabled={i === categories.length - 1} onClick={() => moveCategory(i, 1)} aria-label="Move down">↓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat({ id: c._id, name: c.name })}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeCategory(c)}>Remove</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'analytics' && !an && <Loader label="Crunching numbers…" />}
      {tab === 'analytics' && an && (() => {
        const maxOrders = Math.max(1, ...an.ordersDaily.map((d) => d.orders));
        const maxRev = Math.max(1, ...an.ordersDaily.map((d) => d.revenue));
        const maxUsers = Math.max(1, ...an.usersDaily.map((d) => d.users));
        const Bar = ({ v, max, color }) => (
          <div title={String(v)} style={{ flex: 1, background: 'var(--line)', borderRadius: 3, height: 64, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', borderRadius: 3, background: color, height: `${Math.round((v / max) * 100)}%`, minHeight: v > 0 ? 3 : 0 }} />
          </div>
        );
        const Section = ({ title, aside, children }) => (
          <div className="panel" style={{ flex: '1 1 280px' }}>
            <div className="row spread" style={{ alignItems: 'baseline' }}>
              <strong>{title}</strong>
              {aside && <span className="muted" style={{ fontSize: '0.8rem' }}>{aside}</span>}
            </div>
            {children}
          </div>
        );
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                ['Product views', an.views.products],
                ['Storefront visits', an.views.businesses],
                ['Orders (30d)', an.ordersDaily.reduce((t, d) => t + d.orders, 0)],
                ['Revenue (30d, paid+)', money(an.ordersDaily.reduce((t, d) => t + d.revenue, 0))],
                ['New users (30d)', an.usersDaily.reduce((t, d) => t + d.users, 0)],
              ].map(([label, v]) => (
                <div className="panel" key={label} style={{ margin: 0 }}>
                  <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{label}</p>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--red)' }}>{v}</strong>
                </div>
              ))}
            </div>

            <Section title="Orders per day" aside="last 30 days">
              <div className="row" style={{ gap: 3, marginTop: '0.5rem', alignItems: 'flex-end' }}>
                {an.ordersDaily.map((d) => <Bar key={d._id} v={d.orders} max={maxOrders} color="var(--navy)" />)}
              </div>
            </Section>
            <Section title="Revenue per day (paid+)" aside="last 30 days">
              <div className="row" style={{ gap: 3, marginTop: '0.5rem', alignItems: 'flex-end' }}>
                {an.ordersDaily.map((d) => <Bar key={d._id} v={d.revenue} max={maxRev} color="var(--red)" />)}
              </div>
            </Section>
            <Section title="New users per day" aside="last 30 days">
              <div className="row" style={{ gap: 3, marginTop: '0.5rem', alignItems: 'flex-end' }}>
                {an.usersDaily.map((d) => <Bar key={d._id} v={d.users} max={maxUsers} color="#15803d" />)}
              </div>
            </Section>

            <div className="row" style={{ gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
              <Section title="Top products" aside="30d, units">
                {an.topProducts.length === 0 ? <p className="muted">No paid orders yet.</p> :
                  an.topProducts.map((t) => (
                    <div className="row spread" key={t._id} style={{ padding: '0.2rem 0' }}>
                      <span>{t.name}</span><strong>{t.units}</strong>
                    </div>
                  ))}
              </Section>
              <Section title="Top businesses" aside="30d">
                {an.topBusinesses.length === 0 ? <p className="muted">No orders yet.</p> :
                  an.topBusinesses.map((t) => (
                    <div className="row spread" key={t._id} style={{ padding: '0.2rem 0' }}>
                      <span>{t.name || 'Unknown'}</span><strong>{t.orders} · {money(t.value)}</strong>
                    </div>
                  ))}
              </Section>
              <Section title="Payment methods">
                {an.paymentSplit.map((pm) => (
                  <div className="row spread" key={pm._id} style={{ padding: '0.2rem 0' }}>
                    <span style={{ textTransform: 'capitalize' }}>{(pm._id || '').replace(/_/g, ' ')}</span>
                    <strong>{pm.n} · {money(pm.value)}</strong>
                  </div>
                ))}
              </Section>
              <Section title="Order status">
                {an.statusSplit.map((st) => (
                  <div className="row spread" key={st._id} style={{ padding: '0.2rem 0' }}>
                    <span style={{ textTransform: 'capitalize' }}>{st._id}</span><strong>{st.n}</strong>
                  </div>
                ))}
              </Section>
              <Section title="Active products by category">
                {an.categorySplit.map((c) => (
                  <div className="row spread" key={c._id} style={{ padding: '0.2rem 0' }}>
                    <span style={{ textTransform: 'capitalize' }}>{c._id}</span><strong>{c.n}</strong>
                  </div>
                ))}
              </Section>
            </div>
          </>
        );
      })()}

      {tab === 'products' && (
        <div className="row" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Search products or businesses…" value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)} style={{ maxWidth: 280 }} />
          {[
            ['all', `All (${adminProducts.length})`],
            ['active', `Active (${adminProducts.filter((x) => x.isActive).length})`],
            ['hidden', `Hidden (${adminProducts.filter((x) => !x.isActive).length})`],
          ].map(([key, label]) => (
            <button key={key} className={`btn btn-sm ${prodFilter === key ? 'btn-navy' : 'btn-ghost'}`}
              onClick={() => setProdFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'products' && adminProducts
        .filter((x) => (prodFilter === 'active' ? x.isActive : prodFilter === 'hidden' ? !x.isActive : true))
        .filter((x) => {
          const q = prodSearch.trim().toLowerCase();
          if (!q) return true;
          return x.name?.toLowerCase().includes(q) || x.business?.name?.toLowerCase().includes(q);
        })
        .map((x) => (
          <div className="panel row spread" key={x._id} style={x.isActive ? undefined : { opacity: 0.65 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              {x.images?.[0] && (
                <img src={x.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)' }} />
              )}
              <div>
                <strong>{x.name}</strong>
                {!x.isActive && <span className="badge cancelled" style={{ marginLeft: 8 }}>hidden{x.deactivatedReason ? ` · ${x.deactivatedReason.replace('_', ' ')}` : ''}</span>}
                <p className="muted" style={{ margin: 0 }}>
                  {x.business?.name || 'Unknown business'} · {money(x.price, x.currency)} · {x.stock} in stock
                </p>
              </div>
            </div>
            <div className="row">
              <button className={`btn btn-sm ${x.featured ? 'btn-red' : 'btn-ghost'}`} onClick={() => toggleProductFeatured(x)}>
                {x.featured ? '★ Featured' : '☆ Feature'}
              </button>
              <button className={`btn btn-sm ${x.isActive ? 'btn-danger' : 'btn-navy'}`} onClick={() => toggleProductActive(x)}>
                {x.isActive ? 'Hide' : 'Activate'}
              </button>
            </div>
          </div>
        ))}

      {tab === 'users' && (
        <div className="row" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Search name or email…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          {[
            ['all', `All (${users.length})`],
            ['customer', `Customers (${users.filter((u) => u.role === 'customer').length})`],
            ['business', `Businesses (${users.filter((u) => u.role === 'business').length})`],
            ['admin', `Admins (${users.filter((u) => u.role === 'admin').length})`],
            ['suspended', `Suspended (${users.filter((u) => u.suspended).length})`],
          ].map(([key, label]) => (
            <button key={key} className={`btn btn-sm ${userRole === key ? 'btn-navy' : 'btn-ghost'}`}
              onClick={() => setUserRole(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'users' && users
        .filter((u) => {
          if (userRole === 'suspended') return u.suspended;
          if (userRole !== 'all' && u.role !== userRole) return false;
          const q = userSearch.trim().toLowerCase();
          if (!q) return true;
          return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        })
        .map((u) => (
        <div className="panel row spread" key={u._id}>
          <div>
            <strong>{u.name}</strong>
            {u.suspended && <span className="badge cancelled" style={{ marginLeft: 8 }}>suspended</span>}
            <p className="muted" style={{ margin: 0 }}>{u.email}</p>
          </div>
          <div className="row">
            {u.role !== 'admin' && (
              <button
                className={`btn btn-sm ${u.suspended ? 'btn-navy' : 'btn-danger'}`}
                onClick={() => toggleSuspend(u)}
              >
                {u.suspended ? 'Reinstate' : 'Suspend'}
              </button>
            )}
            <span className={`badge ${u.role === 'admin' ? 'verified' : u.role === 'business' ? 'paid' : 'closed'}`}>
              {u.role}
            </span>
          </div>
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
