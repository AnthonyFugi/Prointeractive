const FLW_BASE = 'https://api.flutterwave.com/v3';

export const isConfigured = () => !!process.env.FLW_SECRET_KEY;

const flw = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(FLW_BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Flutterwave request failed (${res.status})`);
  }
  return data;
};

/**
 * Create a hosted payment link (Flutterwave Standard).
 * The customer completes payment on Flutterwave's page (mobile money or card),
 * then is redirected back to redirectUrl with tx_ref/transaction_id/status.
 */
export const createHostedPayment = ({ txRef, amount, currency, redirectUrl, customer, title, paymentOptions, subaccounts }) =>
  flw('/payments', {
    method: 'POST',
    body: {
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirectUrl,
      payment_options: paymentOptions,
      customer: { email: customer.email, name: customer.name },
      subaccounts,
      customizations: {
        title,
        description: 'Prointeractive order payment',
      },
    },
  });

/** Server-side verification — the only thing we trust to mark an order paid. */
export const verifyTransaction = (transactionId) =>
  flw(`/transactions/${encodeURIComponent(transactionId)}/verify`);

/** Platform commission as a fraction (e.g. 5 -> 0.05). */
export const platformFeeFraction = () => {
  const pct = Number(process.env.PLATFORM_FEE_PERCENT);
  return Number.isFinite(pct) && pct >= 0 && pct < 100 ? pct / 100 : 0.05;
};

/**
 * Create a collection subaccount for a seller. split_value is the commission
 * the PLATFORM keeps on this subaccount's transactions; the rest settles to
 * the seller's bank account on Flutterwave's settlement cycle.
 */
export const createSubaccount = ({ accountBank, accountNumber, businessName, email, mobile, country = 'ZM' }) =>
  flw('/subaccounts', {
    method: 'POST',
    body: {
      account_bank: accountBank,
      account_number: accountNumber,
      business_name: businessName,
      business_email: email,
      business_mobile: mobile || '0000000000',
      country,
      split_type: 'percentage',
      split_value: platformFeeFraction(),
    },
  });

export const updateSubaccount = (flwId, { accountBank, accountNumber, businessName }) =>
  flw(`/subaccounts/${flwId}`, {
    method: 'PUT',
    body: {
      account_bank: accountBank,
      account_number: accountNumber,
      business_name: businessName,
      split_type: 'percentage',
      split_value: platformFeeFraction(),
    },
  });

/** List banks Flutterwave supports for a country (bank codes for payout setup). */
export const fetchBanks = (country = 'ZM') => flw(`/banks/${country}`);
