import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const REPORT_REASONS = [
  ['spam', 'Spam'],
  ['scam_or_fraud', 'Scam or fraud'],
  ['abusive_content', 'Abusive messages'],
  ['inappropriate_content', 'Inappropriate content'],
  ['other', 'Other'],
];

export default function InquiryThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [reply, setReply] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api(`/inquiries/${id}`)
      .then((d) => {
        document.title = `${d.inquiry.subject} · Prointeractive`;
        setInquiry(d.inquiry);
      })
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const send = async (e) => {
    e.preventDefault();
    try {
      await api(`/inquiries/${id}/messages`, { method: 'POST', body: { message: reply } });
      setReply('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const close = async () => {
    try {
      await api(`/inquiries/${id}/close`, { method: 'PATCH' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="container"><p className="error-text">{error}</p></div>;
  if (!inquiry) return <div className="container"><p className="muted">Loading…</p></div>;

  const iAmCustomer = user && inquiry.customer && (inquiry.customer._id === user.id || inquiry.customer === user.id);
  const otherPartyId = iAmCustomer ? inquiry.business?.owner : inquiry.customer?._id || inquiry.customer;

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      await api('/reports', {
        method: 'POST',
        body: { targetType: 'inquiry', targetId: inquiry._id, reason: reportReason, details: reportDetails },
      });
      setReporting(false);
      setReportDetails('');
      setNotice('Report sent. Our team will review this conversation.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const blockOther = async () => {
    if (!otherPartyId) return;
    if (!window.confirm('Block this user? Neither of you will be able to message the other.')) return;
    try {
      await api('/auth/block', { method: 'POST', body: { userId: otherPartyId, blocked: true } });
      setNotice('User blocked. Messaging in this conversation is now unavailable.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <p style={{ marginTop: '1.25rem' }}><Link to="/inbox">← Inbox</Link></p>
      <div className="row spread">
        <h1>{inquiry.subject}</h1>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => setReporting(!reporting)}>Report</button>
          {otherPartyId && (
            <button className="btn btn-ghost btn-sm" onClick={blockOther}>Block</button>
          )}
          <StatusBadge status={inquiry.status} />
        </div>
      </div>
      {notice && <p className="muted" style={{ marginTop: '0.25rem' }}>{notice}</p>}
      {reporting && (
        <form className="panel" onSubmit={submitReport}>
          <strong>Report this conversation</strong>
          <label htmlFor="rreason">Reason</label>
          <select id="rreason" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label htmlFor="rdetails">Details (optional)</label>
          <textarea id="rdetails" rows={2} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-red btn-sm">Send report</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReporting(false)}>Cancel</button>
          </div>
        </form>
      )}
      <p className="muted">
        With {inquiry.business?.name}
        {inquiry.product && <> · about <Link to={`/products/${inquiry.product._id}`}>{inquiry.product.name}</Link></>}
      </p>

      <div className="thread panel">
        {inquiry.messages.map((m, i) => {
          const mine = m.sender?._id === user?.id || m.sender === user?.id;
          return (
            <div key={i} className={`bubble ${mine ? 'mine' : ''}`}>
              <div className="who">{mine ? 'You' : m.sender?.name || 'Them'}</div>
              {m.body}
            </div>
          );
        })}
      </div>

      {inquiry.status !== 'closed' ? (
        <form onSubmit={send} className="panel">
          <label htmlFor="reply">Reply</label>
          <textarea id="reply" required value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-navy">Send reply</button>
            <button type="button" className="btn btn-ghost" onClick={close}>Close conversation</button>
          </div>
        </form>
      ) : (
        <p className="muted">This conversation is closed.</p>
      )}
    </div>
  );
}
