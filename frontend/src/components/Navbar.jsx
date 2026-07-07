import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="wordmark">
          <img src="/logo.png" alt="" />
          <span>Pro<span className="dot">·</span>interactive</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/">Shop</NavLink>
          <NavLink to="/businesses">Businesses</NavLink>
          {user && <NavLink to="/inbox">Inbox</NavLink>}
          {user && user.role === 'customer' && <NavLink to="/orders">My orders</NavLink>}
          {user && user.role === 'business' && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span className="muted">{user.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
          <Link to="/cart" className="cart-pill">Cart · {count}</Link>
        </nav>
      </div>
    </header>
  );
}
