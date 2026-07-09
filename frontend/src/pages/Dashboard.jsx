import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const CATEGORIES = ['retail', 'food', 'fashion', 'electronics', 'services', 'agriculture', 'health', 'education', 'other'];
const ONLINE_NEXT = { pending: 'paid', paid: 'shipped', shipped: 'delivered' };
const ONLINE_LABEL = { pending: 'Mark as paid', paid: 'Mark as shipped', shipped: 'Mark as delivered' };
const COD_NEXT = { pending: 'shipped', shipped: 'delivered' };
const COD_LABEL = { pending: 'Mark as shipped', shipped: 'Delivered · cash received' };

const nextStatusFor = (o) =>
  o.paymentMethod === 'cash_on_delivery' ? COD_NEXT[o.status] : ONLINE_NEXT[o.status];
const nextLabelFor = (o) =>
  o.paymentMethod === 'cash_on_delivery' ? COD_LABEL[o.status] : ONLINE_LABEL[o.status];

const EMPTY_PRODUCT = { name: '', description: '', price: '', category: 'general', stock: '', images: [] };

export default function Dashboard() {
  const [tab, setTab] = useState('products');
  const [business, setBusiness] = useState(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  // Business profile form
  const [bizForm, setBizForm] = useState({ name: '', description: '', category: 'retail', location: '', phone: '' });

  // Products
  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);

  // Orders
  const [orders, setOrders] = useState([]);

  // Payouts (Flutterwave subaccount)
  const [payout, setPayout] = useState(null);
  const [banks, setBanks] = useState([]);
  const [payoutForm, setPayoutForm] = useState({ accountBank: '', accountNumber: '' });
  const [payoutMsg, setPayoutMsg] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);

  // Image upload (S3 presigned)
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { uploadUrl, publicUrl } = await api('/uploads/presign', {
        method: 'POST',
        body: { contentType: file.type, fileSize: file.size },
      });
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('Upload to storage failed');
      setProductForm((f) => ({ ...f, images: [...(f.images || []), publicUrl] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) =>
    setProductForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));

  const findMyBusiness = async () => {
    // The API lists businesses publicly; identify mine via /auth/me + owner match
    const me = await api('/auth/me');
    const list = await api('/businesses?limit=100');
    return list.businesses.find((b) => b.owner === me.user.id || b.owner?._id === me.user.id) || null;
  };

  useEffect(() => {
    findMyBusiness()
      .then((b) => setBusiness(b))
      .catch((e) => setError(e.message))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!business) return;
    api(`/products?business=${business._id}&limit=100`).then((d) => setProducts(d.products)).catch(() => {});
    api('/orders/business').then((d) => setOrders(d.orders)).catch(() => {});
    api('/businesses/payout').then((d) => setPayout(d.payout)).catch(() => {});
    api('/payments/banks?country=ZM').then((d) => setBanks(d.banks)).catch(() => {});
    api('/categories').then((d) => setProductCategories(d.categories)).catch(() => {});
  }, [business]);

  const savePayout = async (e) => {
    e.preventDefault();
    setSavingPayout(true); setPayoutMsg('');
    try {
      const bank = banks.find((b) => String(b.code) === String(payoutForm.accountBank));
      const d = await api('/businesses/payout', {
        method: 'PUT',
        body: { ...payoutForm, bankName: bank?.name || '' },
      });
      setPayout(d.payout);
      setPayoutMsg('connected');
    } catch (err) {
      setPayoutMsg(err.message);
    } finally {
      setSavingPayout(false);
    }
  };

  const createBusiness = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const d = await api('/businesses', { method: 'POST', body: bizForm });
      setBusiness(d.business);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setError('');
    if (!productForm.images || productForm.images.length === 0) {
      return setError('Add at least one product photo before saving.');
    }
    const body = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
    try {
      if (editingId) {
        await api(`/products/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/products', { method: 'POST', body });
      }
      setProductForm(EMPTY_PRODUCT);
      setEditingId(null);
      const d = await api(`/products?business=${business._id}&limit=100`);
      setProducts(d.products);
    } catch (err) {
      setError(err.message);
    }
  };

  const editProduct = (p) => {
    setEditingId(p._id);
    setProductForm({ name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock, images: p.images || [] });
    window.scrollTo({ top: 0 });
  };

  const deactivate = async (id) => {
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const advanceOrder = async (o) => {
    try {
      await api(`/orders/${o._id}/status`, { method: 'PATCH', body: { status: nextStatusFor(o) } });
      const d = await api('/orders/business');
      setOrders(d.orders);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!checked) return <div className="container"><p className="muted">Loading…</p></div>;

  if (!business) {
    return (
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 style={{ marginTop: '2rem' }}>Set up your business</h1>
        <p className="muted">Create your storefront profile — then you can list products and receive orders and messages.</p>
        <form className="panel" onSubmit={createBusiness}>
          <label htmlFor="bname">Business name</label>
          <input id="bname" required value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} />
          <label htmlFor="bdesc">Description</label>
          <textarea id="bdesc" value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} />
          <label htmlFor="bcat">Category</label>
          <select id="bcat" value={bizForm.category} onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label htmlFor="bloc">Location</label>
          <input id="bloc" value={bizForm.location} onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })} />
          <label htmlFor="bphone">Phone</label>
          <input id="bphone" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-red" style={{ width: '100%', marginTop: '1rem' }}>Create storefront</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row spread" style={{ marginTop: '2rem' }}>
        <h1>{business.name}</h1>
        <Link to={`/businesses/${business._id}`} className="btn btn-ghost btn-sm">View public storefront</Link>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="tabs" role="tablist">
        <button className={`tab ${tab === 'products' ? 'on' : ''}`} onClick={() => setTab('products')}>
          Products ({products.length})
        </button>
        <button className={`tab ${tab === 'orders' ? 'on' : ''}`} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
        <button className={`tab ${tab === 'payouts' ? 'on' : ''}`} onClick={() => setTab('payouts')}>
          Payouts {payout?.connected ? '✓' : ''}
        </button>
      </div>

      {tab === 'products' && (
        <>
          <form className="panel" onSubmit={saveProduct}>
            <h3>{editingId ? 'Edit product' : 'Add a product'}</h3>
            <label htmlFor="pname">Name</label>
            <input id="pname" required value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <label htmlFor="pdesc">Description</label>
            <textarea id="pdesc" value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            <div className="row">
              <div style={{ flex: 1 }}>
                <label htmlFor="pprice">Price (ZMW)</label>
                <input id="pprice" type="number" min="0" step="0.01" required value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="pstock">Stock</label>
                <input id="pstock" type="number" min="0" required value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="pcat">Category</label>
                <select id="pcat" required value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                  {productCategories.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor="pimg">Photos — at least one required (JPEG, PNG, or WebP, up to 5 MB)</label>
            <input id="pimg" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} />
            {uploading && <p className="muted">Uploading…</p>}
            {productForm.images?.length > 0 && (
              <div className="row" style={{ marginTop: '0.5rem' }}>
                {productForm.images.map((url) => (
                  <span key={url} className="row" style={{ gap: '0.25rem' }}>
                    <img src={url} alt="Product" style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeImage(url)} aria-label="Remove photo">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="btn btn-red">{editingId ? 'Save changes' : 'Add product'}</button>
              {editingId && (
                <button type="button" className="btn btn-ghost"
                  onClick={() => { setEditingId(null); setProductForm(EMPTY_PRODUCT); }}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          {products.map((p) => (
            <div className="panel row spread" key={p._id}>
              <div>
                <strong>{p.name}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {money(p.price, p.currency)} · {p.stock} in stock · {p.category}
                </p>
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => editProduct(p)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deactivate(p._id)}>Deactivate</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'payouts' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <h3>Settlement account</h3>
          {payout?.connected ? (
            <p className="success-text">
              Connected: {payout.bankName || 'Bank'} ····{String(payout.accountNumber).slice(-4)}.
              Customer payments split automatically — your share settles to this account,
              and Prointeractive keeps a {payout.platformFeePercent}% platform fee.
            </p>
          ) : (
            <p className="muted">
              Connect your bank account to receive your share of every online payment
              automatically{payout ? ` (platform fee: ${payout.platformFeePercent}%)` : ''}.
              Until then, online payments are held by the platform and settled to you manually.
            </p>
          )}
          <form onSubmit={savePayout}>
            <label htmlFor="bank">Bank</label>
            <select id="bank" required value={payoutForm.accountBank}
              onChange={(e) => setPayoutForm({ ...payoutForm, accountBank: e.target.value })}>
              <option value="">Select your bank…</option>
              {banks.map((b) => <option key={b.id || b.code} value={b.code}>{b.name}</option>)}
            </select>
            <label htmlFor="acct">Account number</label>
            <input id="acct" required value={payoutForm.accountNumber}
              onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })} />
            {payoutMsg === 'connected'
              ? <p className="success-text">Settlement account connected.</p>
              : payoutMsg && <p className="error-text">{payoutMsg}</p>}
            <button className="btn btn-red" style={{ marginTop: '1rem' }} disabled={savingPayout}>
              {savingPayout ? 'Connecting…' : payout?.connected ? 'Update account' : 'Connect account'}
            </button>
          </form>
        </div>
      )}

      {tab === 'orders' && (() => {
        const feesDue = orders
          .filter((o) => o.platformFee?.status === 'due')
          .reduce((sum, o) => sum + o.platformFee.amount, 0);
        return feesDue > 0 ? (
          <div className="panel" style={{ background: 'var(--red-soft)' }}>
            <div className="row spread">
              <div>
                <strong>Platform fees due: {money(feesDue)}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  5% commission on cash-on-delivery and off-platform sales. Settled directly with Prointeractive.
                </p>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="empty"><h3>No orders yet</h3><p>Orders show up here as customers buy your products.</p></div>
        ) : orders.map((o) => (
          <div className="panel" key={o._id}>
            <div className="row spread">
              <div>
                <strong>{o.customer?.name}</strong>
                <span className="muted"> · {new Date(o.createdAt).toLocaleString()}</span>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
              {o.items.map((i, idx) => (
                <li key={idx}>{i.quantity} × {i.name}</li>
              ))}
            </ul>
            <div className="row spread">
              <span className="price">
                {money(o.totalAmount, o.currency)}
                {o.paymentMethod === 'cash_on_delivery' && (
                  <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: '0.85rem' }}>
                    cash on delivery
                  </span>
                )}
                {o.platformFee?.status === 'due' && (
                  <span className="badge pending" style={{ marginLeft: 8 }}>
                    fee due: {money(o.platformFee.amount, o.currency)}
                  </span>
                )}
                {o.platformFee?.status === 'settled' && (
                  <span className="badge delivered" style={{ marginLeft: 8 }}>fee settled</span>
                )}
              </span>
              {nextStatusFor(o) && (
                <button className="btn btn-navy btn-sm" onClick={() => advanceOrder(o)}>
                  {nextLabelFor(o)}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
