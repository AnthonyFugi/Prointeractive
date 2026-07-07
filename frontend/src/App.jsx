import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Protected from './components/Protected.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
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

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        <div className="container">
          Pro<span style={{ color: 'var(--red)' }}>·</span>interactive — Making business interaction, Easy!
        </div>
      </footer>
    </>
  );
}
