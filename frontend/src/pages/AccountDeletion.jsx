import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AccountDeletion() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      return setError('Type DELETE in the confirmation box to continue.');
    }
    setBusy(true); setError('');
    try {
      await api('/auth/me', { method: 'DELETE', body: { password } });
      logout();
      alert('Your account and personal data have been deleted.');
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: '2rem' }}>Delete your account</h1>

      <div className="panel">
        <h3>What gets deleted</h3>
        <p>
          Deleting your Prointeractive account permanently removes your profile (name, email,
          password), your conversations with businesses, and your saved favorites. If you run a
          business account, your storefront is closed and your product listings are removed
          from the shop.
        </p>
        <h3>What we keep, and why</h3>
        <p>
          Records of completed transactions are retained in anonymised form, as required for
          legal and accounting purposes — see our <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <h3>How to delete</h3>
        <p>
          <strong>In the app or on this site:</strong> sign in and use the form below
          (in the mobile app: Account → Delete account).<br />
          <strong>By email:</strong> if you can't sign in, send a deletion request from your
          registered email address to <a href="mailto:hello@fugipay.com">hello@fugipay.com</a>{' '}
          and we'll process it within 30 days.
        </p>
      </div>

      {user ? (
        <form className="panel" onSubmit={submit} style={{ borderColor: 'var(--red)' }}>
          <h3 style={{ color: 'var(--red)' }}>Delete {user.email}</h3>
          <p className="muted">This cannot be undone.</p>
          <label htmlFor="dpass">Your password</label>
          <input id="dpass" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <label htmlFor="dconfirm">Type DELETE to confirm</label>
          <input id="dconfirm" required value={confirmText} placeholder="DELETE"
            onChange={(e) => setConfirmText(e.target.value)} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-danger" style={{ marginTop: '1rem' }} disabled={busy}>
            {busy ? 'Deleting…' : 'Permanently delete my account'}
          </button>
        </form>
      ) : (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            <Link to="/login">Sign in</Link> to delete your account here, or use the email option above.
          </p>
        </div>
      )}
    </div>
  );
}
