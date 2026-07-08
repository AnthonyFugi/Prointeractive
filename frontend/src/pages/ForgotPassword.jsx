import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="panel" style={{ marginTop: '3rem' }}>
        <h1>Reset password</h1>
        {sent ? (
          <>
            <p className="success-text">If that account exists, a reset link is on its way.</p>
            <p className="muted">Check your inbox (and spam folder). The link works for 15 minutes.</p>
            <Link to="/login">← Back to sign in</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="muted">Enter your account email and we'll send you a reset link.</p>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-red" style={{ marginTop: '1rem', width: '100%' }} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <hr className="divider" />
            <p className="muted"><Link to="/login">← Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
