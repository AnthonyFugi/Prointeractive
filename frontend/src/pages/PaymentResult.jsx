import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const [state, setState] = useState('checking'); // checking | success | failed | cancelled
  const [message, setMessage] = useState('');

  useEffect(() => {
    const status = params.get('status');
    const txRef = params.get('tx_ref');
    const transactionId = params.get('transaction_id');

    if (status === 'cancelled' || !transactionId) {
      setState('cancelled');
      return;
    }
    api(`/payments/verify?tx_ref=${encodeURIComponent(txRef)}&transaction_id=${encodeURIComponent(transactionId)}`)
      .then(() => setState('success'))
      .catch((e) => { setState('failed'); setMessage(e.message); });
  }, [params]);

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="panel" style={{ marginTop: '3rem', textAlign: 'center' }}>
        {state === 'checking' && (
          <>
            <h1>Confirming your payment…</h1>
            <p className="muted">Verifying with Flutterwave — this takes a moment.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <h1>Payment confirmed ✓</h1>
            <p>Your order is now marked as paid. The business has been notified.</p>
            <Link to="/orders" className="btn btn-navy">View your orders</Link>
          </>
        )}
        {state === 'cancelled' && (
          <>
            <h1>Payment cancelled</h1>
            <p className="muted">No money moved. You can retry from your orders page whenever you're ready.</p>
            <Link to="/orders" className="btn btn-ghost">Back to orders</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <h1>Payment not confirmed</h1>
            <p className="error-text">{message}</p>
            <p className="muted">
              If you were charged, don't worry — our webhook will reconcile it automatically.
              Check your orders in a minute or two.
            </p>
            <Link to="/orders" className="btn btn-ghost">Back to orders</Link>
          </>
        )}
      </div>
    </div>
  );
}
