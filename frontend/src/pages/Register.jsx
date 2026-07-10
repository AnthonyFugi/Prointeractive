import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: params.get('role') === 'business' ? 'business' : 'customer',
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await register({ ...form, acceptedTerms: accepted });
      navigate(form.role === 'business' ? '/dashboard' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="panel" style={{ marginTop: '3rem' }}>
        <h1>{form.role === 'business' ? 'Create your business account' : 'Create account'}</h1>
        <form onSubmit={submit}>
          <label htmlFor="name">Name</label>
          <input id="name" required value={form.name} onChange={set('name')} />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={form.email} onChange={set('email')} />
          <label htmlFor="password">Password (8+ characters)</label>
          <input id="password" type="password" minLength={8} required value={form.password} onChange={set('password')} />
          <label htmlFor="role">I want to</label>
          <select id="role" value={form.role} onChange={set('role')}>
            <option value="customer">Shop as a customer</option>
            <option value="business">Sell as a business</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontWeight: 400, marginTop: '1rem' }}>
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: 'auto', marginTop: '0.2rem' }}
            />
            <span>
              I agree to the <Link to="/terms" target="_blank">Terms &amp; Conditions</Link> and{' '}
              <Link to="/privacy" target="_blank">Privacy Policy</Link>
            </span>
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-red" style={{ marginTop: '1rem', width: '100%' }} disabled={busy || !accepted}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <hr className="divider" />
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
