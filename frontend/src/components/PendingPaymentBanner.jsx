import { Link, useLocation } from 'react-router-dom';
import { useOrderCounts } from '../context/OrderCountsContext.jsx';

/**
 * Site-wide notice when the signed-in customer has pending orders meant to
 * be paid online (abandoned/failed payment). Links to the retry in My Orders.
 */
export default function PendingPaymentBanner() {
  const { awaitingPayment } = useOrderCounts();
  const location = useLocation();

  // Don't nag on the pages where they're already dealing with it
  if (!awaitingPayment) return null;
  if (location.pathname === '/orders' || location.pathname.startsWith('/payment')) return null;

  return (
    <div style={{
      background: 'var(--red-soft)',
      borderBottom: '1px solid var(--line)',
      padding: '0.6rem 0',
    }}>
      <div className="container row spread">
        <span style={{ fontWeight: 600 }}>
          You have {awaitingPayment} order{awaitingPayment > 1 ? 's' : ''} awaiting payment — your items are reserved.
        </span>
        <Link to="/orders" className="btn btn-red btn-sm">Complete payment</Link>
      </div>
    </div>
  );
}
