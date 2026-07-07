import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Business from '../models/Business.js';
import User from '../models/User.js';
import { isConfigured, createHostedPayment, verifyTransaction, fetchBanks } from '../utils/flutterwave.js';
import { orderStatusEmail } from '../utils/email.js';

const APP_URL = () =>
  process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

const PAYMENT_OPTIONS = {
  mobile_money: 'mobilemoneyzambia',
  card: 'card',
};

/**
 * Shared fulfillment: called from BOTH the redirect-verify endpoint and the
 * webhook. Idempotent — safe to run twice for the same transaction.
 * Only trusts data returned by Flutterwave's verify API, never the client.
 */
const fulfillPayment = async (txRef, flwData) => {
  const payment = await Payment.findOne({ txRef });
  if (!payment) return { ok: false, reason: 'Unknown payment reference' };
  if (payment.status === 'successful') return { ok: true, payment, already: true };

  const order = await Order.findById(payment.order);
  if (!order) return { ok: false, reason: 'Order not found' };

  const paidEnough = Number(flwData.amount) >= payment.amount;
  const currencyOk = flwData.currency === payment.currency;
  const statusOk = flwData.status === 'successful';

  if (!statusOk || !paidEnough || !currencyOk) {
    payment.status = 'failed';
    payment.flwTransactionId = String(flwData.id || '');
    payment.note = `verify mismatch: status=${flwData.status} amount=${flwData.amount} currency=${flwData.currency}`;
    await payment.save();
    return { ok: false, reason: 'Payment could not be verified' };
  }

  payment.status = 'successful';
  payment.flwTransactionId = String(flwData.id || '');
  payment.channel = flwData.payment_type || '';
  await payment.save();

  if (order.status === 'pending') {
    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    const [buyer, biz] = await Promise.all([
      User.findById(order.customer).select('email'),
      Business.findById(order.business).select('name'),
    ]);
    orderStatusEmail({ order, customerEmail: buyer?.email, businessName: biz?.name || 'the business' });
  } else if (order.status !== 'paid') {
    // Money arrived for an order that moved on (e.g. cancelled) — flag for manual review/refund.
    payment.note = `paid while order status was "${order.status}" — review for refund`;
    await payment.save();
    console.error(`[payments] ${txRef}: successful charge on ${order.status} order ${order._id}`);
  }

  return { ok: true, payment, order };
};

// POST /api/payments/checkout/:orderId  (customer pays their own pending order)
export const initiateCheckout = async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured yet. Set FLW_SECRET_KEY.',
      });
    }
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.customer.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }
    const paymentOptions = PAYMENT_OPTIONS[order.paymentMethod];
    if (!paymentOptions) {
      return res.status(400).json({ success: false, message: 'This order is set to cash on delivery' });
    }

    // Split: route the seller's share to their subaccount automatically.
    const business = await Business.findById(order.business).select('payout name');
    const subaccountId = business?.payout?.subaccountId || null;

    const txRef = `PI-${order._id}-${crypto.randomUUID().slice(0, 8)}`;
    await Payment.create({
      order: order._id,
      customer: req.user._id,
      txRef,
      amount: order.totalAmount,
      currency: order.currency,
      note: subaccountId ? `split -> ${subaccountId}` : 'no subaccount: full amount to platform, settle seller manually',
    });

    const flwRes = await createHostedPayment({
      txRef,
      amount: order.totalAmount,
      currency: order.currency,
      redirectUrl: `${APP_URL()}/payment/callback`,
      customer: { email: req.user.email, name: req.user.name },
      title: 'Prointeractive',
      paymentOptions,
      subaccounts: subaccountId ? [{ id: subaccountId }] : undefined,
    });

    res.json({ success: true, link: flwRes.data.link, txRef });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/verify?tx_ref=...&transaction_id=...  (redirect landing)
export const verifyPayment = async (req, res, next) => {
  try {
    const { tx_ref: txRef, transaction_id: transactionId } = req.query;
    if (!txRef || !transactionId) {
      return res.status(400).json({ success: false, message: 'Missing payment reference' });
    }
    const payment = await Payment.findOne({ txRef });
    if (!payment || !payment.customer.equals(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const verification = await verifyTransaction(transactionId);
    const result = await fulfillPayment(txRef, verification.data || {});
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.reason });
    }
    res.json({ success: true, payment: result.payment, orderId: result.payment.order });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/webhook  (Flutterwave -> server; the authoritative signal)
export const webhook = async (req, res) => {
  // Flutterwave sends the secret hash you configured in their dashboard.
  const signature = req.headers['verif-hash'];
  if (!process.env.FLW_WEBHOOK_HASH || signature !== process.env.FLW_WEBHOOK_HASH) {
    return res.status(401).json({ success: false });
  }

  // Respond quickly; do the work, but never make Flutterwave wait on emails etc.
  res.status(200).json({ received: true });

  try {
    const event = req.body || {};
    const data = event.data || {};
    if (event.event !== 'charge.completed' || data.status !== 'successful') return;

    // Never trust the webhook payload alone — re-verify with Flutterwave's API.
    const verification = await verifyTransaction(data.id);
    await fulfillPayment(data.tx_ref || verification.data?.tx_ref, verification.data || {});
  } catch (err) {
    console.error('[payments webhook]', err.message);
  }
};


// GET /api/payments/banks?country=ZM  (bank list for payout setup dropdowns)
export const listBanks = async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ success: false, message: 'Payments are not configured yet' });
    }
    const country = (req.query.country || 'ZM').toUpperCase().slice(0, 2);
    const data = await fetchBanks(country);
    res.json({ success: true, banks: data.data || [] });
  } catch (err) {
    next(err);
  }
};
