import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SocialAuth from '../components/SocialAuth.jsx';

export default function Login() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const social = (fn) => async (...args) => {
    setBusy(true); setError('');
    try {
      await fn(...args);
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="panel" style={{ marginTop: '3rem' }}>
        <h1>Sign in</h1>
        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-red" style={{ marginTop: '1rem', width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <SocialAuth
          onGoogle={social(loginWithGoogle)}
          onApple={social(loginWithApple)}
        />
        <hr className="divider" />
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
        <p className="muted"><Link to="/forgot-password">Forgot your password?</Link></p>
      </div>
    </div>
  );
}
