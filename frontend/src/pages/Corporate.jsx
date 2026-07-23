import { useState } from 'react';
import { api } from '../api.js';

export default function Corporate() {
  const [form, setForm] = useState({ company: '', contactName: '', email: '', phone: '', needs: '' });
  const [state, setState] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      await api('/corporate', { method: 'POST', body: form });
      setState('sent');
    } catch (err) {
      setState(err.message);
    }
  };

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Corporate &amp; institutional</div>
        <h1>Procurement, without the runaround.</h1>
        <p className="lede">
          Source from verified Zambian businesses in one place — bulk quotes, documented orders,
          and payment on invoice, mobile money, or card. One conversation, straight to the supplier.
        </p>
      </section>

      <div className="row" style={{ gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="panel">
            <strong>Why procure on Prointeractive</strong>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              <b>Verified suppliers.</b> Every ✓-badged business is checked by our team.<br /><br />
              <b>A paper trail by default.</b> Quotes, agreements, and orders live in one thread — audit-friendly.<br /><br />
              <b>Local payment rails.</b> Mobile money, card, and cash on delivery through Flutterwave.<br /><br />
              <b>One point of contact.</b> Our team helps match your requirements to suppliers.
            </p>
          </div>
        </div>

        <div style={{ flex: '1 1 340px' }}>
          <div className="panel">
            <strong>Tell us what you need</strong>
            {state === 'sent' ? (
              <p className="success-text" style={{ marginTop: '0.75rem' }}>
                Received — our team will get back to you within one business day.
              </p>
            ) : (
              <form onSubmit={submit} style={{ marginTop: '0.5rem' }}>
                <label htmlFor="c-company">Company / institution</label>
                <input id="c-company" required value={form.company} onChange={set('company')} />
                <label htmlFor="c-name">Contact person</label>
                <input id="c-name" required value={form.contactName} onChange={set('contactName')} />
                <label htmlFor="c-email">Work email</label>
                <input id="c-email" type="email" required value={form.email} onChange={set('email')} />
                <label htmlFor="c-phone">Phone (optional)</label>
                <input id="c-phone" value={form.phone} onChange={set('phone')} />
                <label htmlFor="c-needs">What are you looking to procure?</label>
                <textarea id="c-needs" rows={4} placeholder="e.g. 25 laptops for our Lusaka office, quarterly stationery supply…" value={form.needs} onChange={set('needs')} />
                {state && state !== 'sending' && state !== 'sent' && <p className="error-text">{state}</p>}
                <button className="btn btn-red" disabled={state === 'sending'} style={{ marginTop: '0.75rem' }}>
                  {state === 'sending' ? 'Sending…' : 'Request a callback'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
