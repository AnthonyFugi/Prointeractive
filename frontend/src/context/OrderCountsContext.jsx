import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

/**
 * Shared counts for the signed-in customer's orders:
 *  - active: pending / paid / shipped (drives the navbar badge)
 *  - awaitingPayment: pending orders meant to be paid online (drives the banner)
 * Refreshes on navigation so both stay honest after checkout/payment.
 */
const Ctx = createContext({ active: 0, awaitingPayment: 0 });
export const useOrderCounts = () => useContext(Ctx);

export function OrderCountsProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({ active: 0, awaitingPayment: 0 });

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      setCounts({ active: 0, awaitingPayment: 0 });
      return;
    }
    api('/orders/mine')
      .then((d) => {
        const active = d.orders.filter((o) => ['pending', 'paid', 'shipped'].includes(o.status));
        const awaitingPayment = active.filter(
          (o) => o.status === 'pending' && o.paymentMethod !== 'cash_on_delivery'
        ).length;
        setCounts({ active: active.length, awaitingPayment });
      })
      .catch(() => setCounts({ active: 0, awaitingPayment: 0 }));
  }, [user, location.pathname]);

  return <Ctx.Provider value={counts}>{children}</Ctx.Provider>;
}
