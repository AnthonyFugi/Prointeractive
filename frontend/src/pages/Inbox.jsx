import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Inbox() {
  const [inquiries, setInquiries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/inquiries').then((d) => setInquiries(d.inquiries)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container">
      <h1 style={{ marginTop: '2rem' }}>Inbox</h1>
      <p className="muted">Conversations with businesses and customers.</p>
      {error && <p className="error-text">{error}</p>}
      {inquiries.length === 0 ? (
        <div className="empty">
          <h3>No conversations yet</h3>
          <p>Open any product and use “Ask the seller” to start one.</p>
        </div>
      ) : inquiries.map((inq) => (
        <Link key={inq._id} to={`/inbox/${inq._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="panel">
            <div className="row spread">
              <div>
                <strong>{inq.subject}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {inq.business?.name}
                  {inq.product && ` · about ${inq.product.name}`}
                  {' · '}{inq.messages.length} message{inq.messages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <StatusBadge status={inq.status} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
