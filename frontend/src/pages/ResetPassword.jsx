import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const d = await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      localStorage.setItem('pi_token', d.token);
      window.location.href = '/'; // full reload so AuthContext picks up the new session
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="panel" style={{ marginTop: '3rem' }}>
          <h1>Invalid link</h1>
          <p className="muted">This reset link is missing its token. Request a new one.</p>
          <Link to="/forgot-password" className="btn btn-ghost">Request reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="panel" style={{ marginTop: '3rem' }}>
        <h1>Choose a new password</h1>
        <form onSubmit={submit}>
          <label htmlFor="password">New password (8+ characters)</label>
          <input id="password" type="password" minLength={8} required value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type="password" minLength={8} required value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-red" style={{ marginTop: '1rem', width: '100%' }} disabled={busy}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
