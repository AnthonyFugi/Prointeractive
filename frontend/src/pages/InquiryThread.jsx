import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function InquiryThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const load = () => api(`/inquiries/${id}`).then((d) => setInquiry(d.inquiry)).catch((e) => setError(e.message));
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

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <p style={{ marginTop: '1.25rem' }}><Link to="/inbox">← Inbox</Link></p>
      <div className="row spread">
        <h1>{inquiry.subject}</h1>
        <StatusBadge status={inquiry.status} />
      </div>
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
