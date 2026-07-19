import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const ONLINE_NEXT = { pending: 'paid', paid: 'shipped', shipped: 'delivered' };
const ONLINE_LABEL = { pending: 'Mark as paid', paid: 'Mark as shipped', shipped: 'Mark as delivered' };
const COD_NEXT = { pending: 'shipped', shipped: 'delivered' };
const COD_LABEL = { pending: 'Mark as shipped', shipped: 'Delivered · cash received' };

const nextStatusFor = (o) =>
  o.paymentMethod === 'cash_on_delivery' ? COD_NEXT[o.status] : ONLINE_NEXT[o.status];
const nextLabelFor = (o) =>
  o.paymentMethod === 'cash_on_delivery' ? COD_LABEL[o.status] : ONLINE_LABEL[o.status];

const EMPTY_PRODUCT = { name: '', description: '', price: '', category: '', stock: '', images: [] };

export default function Dashboard() {
  const [tab, setTab] = useState('products');
  const [business, setBusiness] = useState(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  // Store profile
  const [bizForm, setBizForm] = useState({ name: '', description: '', categories: [], location: '', phone: '', logoUrl: '' });
  const [bizMsg, setBizMsg] = useState('');
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingProduct, setSavingProduct] = useState(false);

  const clearFieldError = (field) =>
    setFieldErrors((fe) => {
      if (!fe[field]) return fe;
      const next = { ...fe };
      delete next[field];
      return next;
    });

  const toggleStorefrontClosed = async () => {
    const closing = !business.closed;
    if (closing && !window.confirm('Close your storefront? It will be hidden from customers and your products removed from the shop until you reopen.')) return;
    try {
      const d = await api(`/businesses/${business._id}/closed`, { method: 'PATCH', body: { closed: closing } });
      setBusiness(d.business);
      flashToast(closing ? 'Storefront closed — hidden from customers' : '✓ Storefront reopened — products restored');
    } catch (e) { setError(e.message); }
  };

  const reactivate = async (id) => {
    try {
      await api(`/products/${id}`, { method: 'PATCH', body: { isActive: true } });
      const d = await api(`/products?business=${business._id}&limit=100&includeInactive=true`);
      setProducts(d.products);
      flashToast('✓ Product is back in the shop');
    } catch (e) { setError(e.message); }
  };

  const toggleBizCategory = (name) =>
    setBizForm((f) => {
      const on = f.categories.includes(name);
      if (!on && f.categories.length >= 3) return f; // max 3
      return { ...f, categories: on ? f.categories.filter((c) => c !== name) : [...f.categories, name] };
    });

  const CategoryChips = () => (
    <>
      <div className="chips" style={{ marginTop: '0.25rem' }}>
        {productCategories.map((c) => {
          const on = bizForm.categories.includes(c.name);
          return (
            <button
              type="button"
              key={c._id}
              className={`chip ${on ? 'on' : ''}`}
              onClick={() => toggleBizCategory(c.name)}
            >
              {c.name}
            </button>
          );
        })}
        {bizForm.categories
          .filter((name) => !productCategories.some((c) => c.name === name))
          .map((name) => (
            <button type="button" key={name} className="chip on" onClick={() => toggleBizCategory(name)}>
              {name} (legacy)
            </button>
          ))}
      </div>
      <p className="muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
        Pick up to 3 — {bizForm.categories.length}/3 selected
      </p>
    </>
  );

  const updateProductField = (field, value) => {
    setProductForm((f) => ({ ...f, [field]: value }));
    clearFieldError(field);
  };
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [toast, setToast] = useState('');

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Orders
  const [orders, setOrders] = useState([]);

  // Payouts (Flutterwave subaccount)
  const [payout, setPayout] = useState(null);
  const [banks, setBanks] = useState([]);
  const [banksState, setBanksState] = useState('loading'); // loading | ready | error
  const [banksError, setBanksError] = useState('');
  const [payoutForm, setPayoutForm] = useState({ accountBank: '', accountNumber: '' });
  const [payoutMsg, setPayoutMsg] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);

  // S3 presigned upload — generic, used by product photos and the store logo
  const [uploading, setUploading] = useState(false);
  const uploadTo = (onDone) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { uploadUrl, publicUrl } = await api('/uploads/presign', {
        method: 'POST',
        body: { contentType: file.type, fileSize: file.size },
      });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('Upload to storage failed');
      onDone(publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const findMyBusiness = async () => {
    const d = await api('/businesses/mine');
    return d.business;
  };

  const loadBanks = () => {
    setBanksState('loading'); setBanksError('');
    api('/payments/banks?country=ZM')
      .then((d) => {
        setBanks(d.banks || []);
        setBanksState('ready');
        if (!d.banks || d.banks.length === 0) {
          setBanksState('error');
          setBanksError('Flutterwave returned an empty list for Zambia. This usually resolves once live API keys are configured.');
        }
      })
      .catch((e) => { setBanksState('error'); setBanksError(e.message); });
  };

  useEffect(() => {
    api('/categories').then((d) => setProductCategories(d.categories)).catch(() => {});
    findMyBusiness()
      .then((b) => {
        setBusiness(b);
        if (b) {
          setBizForm({
            name: b.name || '', description: b.description || '',
            categories: b.categories?.length ? b.categories : b.category ? [b.category] : [],
            location: b.location || '', phone: b.phone || '', logoUrl: b.logoUrl || '',
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!business) return;
    api(`/products?business=${business._id}&limit=100&includeInactive=true`).then((d) => {
      setProducts(d.products);
      if (d.products.length === 0) setShowProductForm(true); // first product: no extra click
    }).catch(() => {});
    api('/orders/business').then((d) => setOrders(d.orders)).catch(() => {});
    api('/businesses/payout').then((d) => setPayout(d.payout)).catch(() => {});
    api('/categories').then((d) => setProductCategories(d.categories)).catch(() => {});
    loadBanks();
  }, [business]);

  const createBusiness = async (e) => {
    e.preventDefault();
    setError('');
    setCreatingBiz(true);
    try {
      const d = await api('/businesses', { method: 'POST', body: bizForm });
      setBusiness(d.business);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingBiz(false);
    }
  };

  const saveBusiness = async (e) => {
    e.preventDefault();
    setSavingBiz(true); setBizMsg('');
    try {
      const d = await api(`/businesses/${business._id}`, { method: 'PATCH', body: bizForm });
      setBusiness(d.business);
      setBizMsg('saved');
    } catch (err) {
      setBizMsg(err.message);
    } finally {
      setSavingBiz(false);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setError('');
    const fe = {};
    if (!productForm.name.trim()) fe.name = 'Give the product a name.';
    if (productForm.price === '' || Number(productForm.price) <= 0) fe.price = 'Enter a price greater than 0.';
    if (productForm.stock === '' || Number(productForm.stock) < 0) fe.stock = 'Enter how many are in stock (0 or more).';
    if (!productForm.category) fe.category = 'Pick a category.';
    if (!productForm.images || productForm.images.length === 0) fe.images = 'Add at least one product photo.';
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;
    const body = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
    setSavingProduct(true);
    try {
      if (editingId) {
        await api(`/products/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/products', { method: 'POST', body });
      }
      const wasEditing = !!editingId;
      setProductForm(EMPTY_PRODUCT);
      setEditingId(null);
      setShowProductForm(false);
      const d = await api(`/products?business=${business._id}&limit=100&includeInactive=true`);
      setProducts(d.products);
      flashToast(wasEditing ? '✓ Product updated' : '✓ Product added — it\u2019s live in the shop');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const editProduct = (p) => {
    setEditingId(p._id);
    const categoryStillExists = productCategories.some((c) => c.name === p.category);
    setProductForm({
      name: p.name, description: p.description, price: p.price,
      category: categoryStillExists ? p.category : '',
      stock: p.stock, images: p.images || [],
    });
    setShowProductForm(true);
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
          <label>Categories</label>
          <CategoryChips />
          <label htmlFor="bloc">Location</label>
          <input id="bloc" value={bizForm.location} onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })} />
          <label htmlFor="bphone">Phone</label>
          <input id="bphone" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-red" style={{ width: '100%', marginTop: '1rem' }} disabled={creatingBiz}>
            {creatingBiz ? 'Creating your storefront…' : 'Create storefront'}
          </button>
        </form>
      </div>
    );
  }

  const setupSteps = [
    { done: !!(business.description && business.logoUrl), label: 'Complete your store profile (description + logo)', go: 'store' },
    { done: products.length > 0, label: 'Add your first product', go: 'products' },
    { done: !!payout?.connected, label: 'Connect your payout account', go: 'payouts' },
  ];
  const incomplete = setupSteps.filter((s) => !s.done);

  return (
    <div className="container">
      <div className="row spread" style={{ marginTop: '2rem' }}>
        <div className="row" style={{ alignItems: 'center' }}>
          {business.logoUrl && (
            <img src={business.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 3, border: '1px solid var(--line)' }} />
          )}
          <h1 style={{ margin: 0 }}>{business.name}</h1>
        </div>
        <div className="row">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const url = `${window.location.origin}/businesses/${business.slug || business._id}`;
              navigator.clipboard.writeText(url).then(() => alert(`Link copied:\n${url}`));
            }}
          >
            Copy store link
          </button>
          <Link to={`/businesses/${business.slug || business._id}`} className="btn btn-ghost btn-sm">View public storefront</Link>
          {!business.closed && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={toggleStorefrontClosed}>
              Close storefront temporarily
            </button>
          )}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}

      {business.closed && (
        <div className="panel" style={{ borderColor: 'var(--red)', background: 'var(--red-soft, #fdf1f1)' }}>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <div>
              <strong style={{ color: 'var(--red)' }}>Your storefront is closed</strong>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                {business.closedBy === 'admin'
                  ? 'It was closed by Prointeractive. Contact hello@fugipay.com to appeal.'
                  : 'Customers can\u2019t see your store or products until you reopen.'}
              </p>
            </div>
            {business.closedBy !== 'admin' && (
              <button className="btn btn-navy btn-sm" onClick={toggleStorefrontClosed}>Reopen storefront</button>
            )}
          </div>
        </div>
      )}

      {!business.verified && (
        <div className="panel" style={{ borderColor: 'var(--verify-blue, #1D9BF0)' }}>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <div>
              <strong>Get verified</strong>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                Verified businesses get the blue tick on their storefront and every product —
                customers use it as a signal they can buy with confidence.
              </p>
            </div>
            {business.verificationRequested ? (
              <span className="badge pending">requested — under review</span>
            ) : (
              <button
                className="btn btn-navy btn-sm"
                disabled={requestingVerify}
                onClick={async () => {
                  setRequestingVerify(true);
                  try {
                    const d = await api(`/businesses/${business._id}/request-verification`, { method: 'POST' });
                    setBusiness(d.business);
                  } catch (e) { setError(e.message); }
                  finally { setRequestingVerify(false); }
                }}
              >
                {requestingVerify ? 'Sending…' : 'Request verification'}
              </button>
            )}
          </div>
        </div>
      )}

      {incomplete.length > 0 && (
        <div className="panel" style={{ background: 'var(--navy-soft)' }}>
          <strong>Finish setting up your store</strong>
          {setupSteps.map((s) => (
            <p key={s.label} style={{ margin: '0.35rem 0' }}>
              {s.done ? '✅' : '⬜'}{' '}
              {s.done ? <span className="muted">{s.label}</span> : (
                <button className="link-btn" onClick={() => setTab(s.go)}>{s.label} →</button>
              )}
            </p>
          ))}
        </div>
      )}

      <div className="tabs" role="tablist">
        <button className={`tab ${tab === 'products' ? 'on' : ''}`} onClick={() => setTab('products')}>
          Products ({products.length})
        </button>
        <button className={`tab ${tab === 'orders' ? 'on' : ''}`} onClick={() => setTab('orders')}>
          Orders ({orders.length})
        </button>
        <button className={`tab ${tab === 'store' ? 'on' : ''}`} onClick={() => setTab('store')}>
          Store settings
        </button>
        <button className={`tab ${tab === 'payouts' ? 'on' : ''}`} onClick={() => setTab('payouts')}>
          Payouts {payout?.connected ? '✓' : ''}
        </button>
      </div>

      {tab === 'store' && (
        <form className="panel" style={{ maxWidth: 560 }} onSubmit={saveBusiness}>
          <h3>Store profile</h3>
          <p className="muted">This is what customers see in the directory and on your storefront page.</p>
          <label htmlFor="sname">Business name</label>
          <input id="sname" required value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} />
          <label htmlFor="sdesc">Description</label>
          <textarea id="sdesc" rows={4} placeholder="What do you sell? What makes your business worth buying from?"
            value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Categories</label>
              <CategoryChips />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="sloc">Location</label>
              <input id="sloc" placeholder="e.g. Kamwala, Lusaka" value={bizForm.location}
                onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })} />
            </div>
          </div>
          <label htmlFor="sphone">Phone</label>
          <input id="sphone" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
          <label htmlFor="slogo">Logo (square works best — JPEG, PNG, or WebP, up to 5 MB)</label>
          <div className="row" style={{ alignItems: 'center' }}>
            {bizForm.logoUrl && (
              <img src={bizForm.logoUrl} alt="Store logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4, border: '1px solid var(--line)' }} />
            )}
            <input id="slogo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
              onChange={uploadTo((url) => setBizForm((f) => ({ ...f, logoUrl: url })))} />
          </div>
          {uploading && <p className="muted">Uploading…</p>}
          {bizMsg === 'saved'
            ? <p className="success-text">Store profile saved.</p>
            : bizMsg && <p className="error-text">{bizMsg}</p>}
          <button className="btn btn-red" style={{ marginTop: '1rem' }} disabled={savingBiz || uploading}>
            {savingBiz ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      )}

      {tab === 'products' && (
        <>
          {!showProductForm && (
            <button className="btn btn-red" style={{ marginBottom: '1rem' }}
              onClick={() => { setEditingId(null); setProductForm(EMPTY_PRODUCT); setShowProductForm(true); }}>
              + Add product
            </button>
          )}

          {showProductForm && (
            <form className="panel" onSubmit={saveProduct} noValidate>
              <div className="row spread">
                <h3 style={{ margin: 0 }}>{editingId ? 'Edit product' : 'Add a product'}</h3>
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => { setShowProductForm(false); setEditingId(null); setProductForm(EMPTY_PRODUCT); }}>
                  Close
                </button>
              </div>
              <label htmlFor="pname">Name</label>
              <input id="pname" required value={productForm.name}
                onChange={(e) => updateProductField('name', e.target.value)} />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
              <label htmlFor="pdesc">Description</label>
              <textarea id="pdesc" value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              <div className="row">
                <div style={{ flex: 1 }}>
                  <label htmlFor="pprice">Price (ZMW)</label>
                  <input id="pprice" type="number" min="0" step="0.01" required value={productForm.price}
                    onChange={(e) => updateProductField('price', e.target.value)} />
                  {fieldErrors.price && <p className="field-error">{fieldErrors.price}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="pstock">Stock</label>
                  <input id="pstock" type="number" min="0" required value={productForm.stock}
                    onChange={(e) => updateProductField('stock', e.target.value)} />
                  {fieldErrors.stock && <p className="field-error">{fieldErrors.stock}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="pcat">Category</label>
                  <select id="pcat" required value={productForm.category}
                    onChange={(e) => updateProductField('category', e.target.value)}>
                    <option value="">Select a category…</option>
                    {productCategories.map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {fieldErrors.category && <p className="field-error">{fieldErrors.category}</p>}
                </div>
              </div>
              <label htmlFor="pimg">Photos — at least one required (JPEG, PNG, or WebP, up to 5 MB)</label>
              <input id="pimg" type="file" accept="image/jpeg,image/png,image/webp"
                onChange={uploadTo((url) => {
                  setProductForm((f) => ({ ...f, images: [...(f.images || []), url] }));
                  clearFieldError('images');
                })}
                disabled={uploading} />
              {uploading && <p className="muted">Uploading…</p>}
              {fieldErrors.images && <p className="field-error">{fieldErrors.images}</p>}
              {productForm.images?.length > 0 && (
                <div className="row" style={{ marginTop: '0.5rem' }}>
                  {productForm.images.map((url) => (
                    <span key={url} className="row" style={{ gap: '0.25rem' }}>
                      <img src={url} alt="Product" style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setProductForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }))}
                        aria-label="Remove photo">×</button>
                    </span>
                  ))}
                </div>
              )}
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
                By listing, you confirm this product is new, first-owner, and authentic, per our{' '}
                <a href="/product-standards" target="_blank" rel="noreferrer">Product Standards</a>.
              </p>
              <div className="row" style={{ marginTop: '0.5rem' }}>
                <button className="btn btn-red" disabled={uploading || savingProduct}>
                  {savingProduct ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </form>
          )}

          {products.length === 0 && !showProductForm && (
            <div className="empty">
              <h3>No products yet</h3>
              <p>Add your first product — it appears in the shop the moment you save it.</p>
            </div>
          )}

          {products.map((p) => (
            <div className="panel row spread" key={p._id} style={p.isActive ? undefined : { opacity: 0.6 }}>
              <div className="row" style={{ alignItems: 'center' }}>
                {p.images?.[0] && (
                  <img src={p.images[0]} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--line)' }} />
                )}
                <div>
                  <strong>{p.name}</strong>
                  {!p.isActive && <span className="badge cancelled" style={{ marginLeft: 8 }}>hidden</span>}
                  <p className="muted" style={{ margin: 0 }}>
                    {money(p.price, p.currency)} · {p.stock} in stock · {p.category}
                  </p>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => editProduct(p)}>Edit</button>
                {p.isActive ? (
                  <button className="btn btn-danger btn-sm" onClick={() => deactivate(p._id)}>Hide</button>
                ) : (
                  <button className="btn btn-navy btn-sm" onClick={() => reactivate(p._id)}>Reactivate</button>
                )}
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
              Connect your account to receive your share of every online payment
              automatically{payout ? ` (platform fee: ${payout.platformFeePercent}%)` : ''}.
              Until then, online payments are held by the platform and settled to you manually.
            </p>
          )}

          {banksState === 'loading' && <p className="muted">Loading bank list from Flutterwave…</p>}
          {banksState === 'error' && (
            <div className="panel" style={{ background: 'var(--red-soft)' }}>
              <p style={{ margin: 0 }}>
                <strong>Couldn't load the bank list.</strong> {banksError}
              </p>
              <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                The list (banks and mobile money operators for Zambia) comes directly from Flutterwave —
                nothing needs to be added by the platform admin. It populates fully once live
                Flutterwave keys are active.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={loadBanks}>
                Try again
              </button>
            </div>
          )}

          <form onSubmit={savePayout}>
            <label htmlFor="bank">Bank / mobile money operator</label>
            <select id="bank" required value={payoutForm.accountBank} disabled={banksState !== 'ready'}
              onChange={(e) => setPayoutForm({ ...payoutForm, accountBank: e.target.value })}>
              <option value="">{banksState === 'ready' ? 'Select…' : 'Unavailable — see above'}</option>
              {banks.map((b) => <option key={b.id || b.code} value={b.code}>{b.name}</option>)}
            </select>
            <label htmlFor="acct">Account number</label>
            <input id="acct" required value={payoutForm.accountNumber}
              onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })} />
            {payoutMsg === 'connected'
              ? <p className="success-text">Settlement account connected.</p>
              : payoutMsg && <p className="error-text">{payoutMsg}</p>}
            <button className="btn btn-red" style={{ marginTop: '1rem' }} disabled={savingPayout || banksState !== 'ready'}>
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
            {(o.shippingAddress?.line1 || o.shippingAddress?.phone) && (
              <p className="muted" style={{ margin: '0.25rem 0 0.5rem' }}>
                📍 {[o.shippingAddress.line1, o.shippingAddress.city].filter(Boolean).join(', ')}
                {o.shippingAddress.phone && <> · 📞 <a href={`tel:${o.shippingAddress.phone}`}>{o.shippingAddress.phone}</a></>}
                {o.shippingAddress.note && <><br />🗒 {o.shippingAddress.note}</>}
              </p>
            )}
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
