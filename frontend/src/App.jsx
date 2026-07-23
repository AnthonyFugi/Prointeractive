import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import PendingPaymentBanner from './components/PendingPaymentBanner.jsx';
import Protected from './components/Protected.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import Corporate from './pages/Corporate.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Businesses from './pages/Businesses.jsx';
import BusinessPage from './pages/BusinessPage.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import MyOrders from './pages/MyOrders.jsx';
import Inbox from './pages/Inbox.jsx';
import InquiryThread from './pages/InquiryThread.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import PaymentResult from './pages/PaymentResult.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import Sell from './pages/Sell.jsx';
import AccountDeletion from './pages/AccountDeletion.jsx';
import ProductStandards from './pages/ProductStandards.jsx';

const TITLES = {
  '/': null, // full brand line below
  '/businesses': 'Businesses',
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/orders': 'My orders',
  '/inbox': 'Inbox',
  '/account': 'My account',
  '/corporate': 'Corporate procurement',
  '/login': 'Sign in',
  '/register': 'Create account',
  '/forgot-password': 'Reset password',
  '/reset-password': 'Reset password',
  '/dashboard': 'Dashboard',
  '/admin': 'Admin',
  '/sell': 'Sell on Prointeractive',
  '/terms': 'Terms & Conditions',
  '/privacy': 'Privacy Policy',
  '/product-standards': 'Product Standards',
  '/account-deletion': 'Delete account',
  '/payment/callback': 'Payment',
};

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Detail pages (/products/:id, /businesses/:slug, /inbox/:id) set their own
    // title once their data loads — don't fight them here.
    const dynamic = /^\/(products|businesses|inbox)\/./.test(pathname);
    if (dynamic) return;
    const t = TITLES[pathname];
    document.title = t
      ? `${t} · Prointeractive`
      : 'Prointeractive — What you need, from businesses you trust.';
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <Navbar />
      <PendingPaymentBanner />
      <main>
        <PageTitle />
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Account />} />
          <Route path="/corporate" element={<Corporate />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/account-deletion" element={<AccountDeletion />} />
          <Route path="/product-standards" element={<ProductStandards />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/businesses" element={<Businesses />} />
          <Route path="/businesses/:id" element={<BusinessPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
          <Route path="/orders" element={<Protected><MyOrders /></Protected>} />
          <Route path="/payment/callback" element={<Protected><PaymentResult /></Protected>} />
          <Route path="/inbox" element={<Protected><Inbox /></Protected>} />
          <Route path="/inbox/:id" element={<Protected><InquiryThread /></Protected>} />
          <Route path="/dashboard" element={<Protected role="business"><Dashboard /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-line muted">
          <span>
            Pro<span style={{ color: 'var(--red)' }}>·</span>interactive · © {new Date().getFullYear()}{' '}
            FugiPay Technology Limited, Lusaka, Zambia
          </span>
          <a href="mailto:hello@fugipay.com">hello@fugipay.com</a>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/product-standards">Standards</Link>
          <Link to="/corporate">Corporate</Link>
          <Link to="/account-deletion">Delete account</Link>
        </div>
      </footer>
    </>
  );
}
