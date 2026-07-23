import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useOrderCounts } from '../context/OrderCountsContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { active } = useOrderCounts();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="wordmark" onClick={close}>
          <img src="/logo.png" alt="" />
          <span>Pro<span className="dot">·</span>interactive</span>
        </Link>

        <div className="nav-right">
          <Link to="/cart" className="cart-pill" onClick={close}>Cart · {count}</Link>
          <button
            className="nav-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" onClick={close}>Shop</NavLink>
          <NavLink to="/businesses" onClick={close}>Businesses</NavLink>
          {(!user || user.role === 'customer') && (
            <NavLink to="/sell" onClick={close} className="sell-link">Sell</NavLink>
          )}
          {user && <NavLink to="/inbox" onClick={close}>Inbox</NavLink>}
          {user && user.role === 'customer' && (
            <NavLink to="/orders" onClick={close}>
              My orders{active > 0 && <span className="count-badge">{active}</span>}
            </NavLink>
          )}
          {user && user.role === 'business' && <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>}

          {user ? (
            <>
              <NavLink
                to={user.role === 'business' ? '/dashboard' : user.role === 'admin' ? '/admin' : '/account'}
                onClick={close}
                className="nav-user"
                title={user.role === 'business' ? 'Your dashboard' : user.role === 'admin' ? 'Admin console' : 'My account'}
              >
                <span className="nav-user-avatar" aria-hidden="true">{user.name?.[0]?.toUpperCase() || '?'}</span>
                {user.name}
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={() => { close(); logout(); }}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Sign in</NavLink>
              <NavLink to="/register" onClick={close} className="btn btn-red btn-sm" style={{ color: '#fff' }}>
                Create account
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
