import mongoose from 'mongoose';
import { sendPush } from './push.js';

/**
 * Notifications aimed at the CUSTOMER.
 *
 * Until now every push on the platform went to sellers — a buyer placed an
 * order and then heard nothing at all until it turned up. Order status is the
 * strongest reason anyone has to reopen a marketplace app, and it was unused.
 *
 * All of this is fire-and-forget on purpose: a push that fails must never
 * break the order transaction that triggered it.
 */

/**
 * What the buyer should read for each status, per payment method.
 *
 * Written as something a person would say, not as a state-machine dump.
 * "paid" means something different on cash-on-delivery (money hasn't moved
 * yet — the seller has simply accepted) than on an online order, and telling
 * a COD buyer their payment succeeded would be plainly wrong.
 */
const MESSAGES = {
  paid: {
    online: (b) => ({ title: 'Payment confirmed ✅', body: `${b} has your order and is preparing it.` }),
    cod: (b) => ({ title: 'Order confirmed ✅', body: `${b} accepted your order. Pay cash on delivery.` }),
  },
  shipped: {
    any: (b) => ({ title: 'On its way 🚚', body: `Your order from ${b} is out for delivery.` }),
  },
  delivered: {
    online: (b) => ({ title: 'Delivered ✓', body: `Your order from ${b} has arrived. How was it?` }),
    cod: (b) => ({ title: 'Delivered ✓', body: `Your order from ${b} has arrived. How was it?` }),
  },
  cancelled: {
    any: (b) => ({ title: 'Order cancelled', body: `Your order from ${b} was cancelled.` }),
  },
};

/**
 * Tell the customer their order moved.
 * Silently does nothing for statuses with no customer-facing meaning.
 */
export const notifyCustomerOrderStatus = async (order, businessName = 'the seller') => {
  try {
    const entry = MESSAGES[order.status];
    if (!entry) return;

    const isCod = order.paymentMethod === 'cash_on_delivery';
    const build = entry.any || (isCod ? entry.cod : entry.online);
    if (!build) return;

    const customer = await mongoose.model('User')
      .findById(order.customer)
      .select('expoPushToken');
    if (!customer?.expoPushToken) return;

    const { title, body } = build(businessName);
    await sendPush(customer.expoPushToken, {
      title,
      body,
      // Deep-link payload so tapping the notification opens the order itself
      // rather than dropping the customer on the home feed.
      data: { type: 'order', orderId: String(order._id) },
    });
  } catch (err) {
    console.error('[notify customer]', err.message);
  }
};

/** Confirmation the moment an order is placed, before any status change. */
export const notifyCustomerOrderPlaced = async (order, businessName = 'the seller') => {
  try {
    const customer = await mongoose.model('User')
      .findById(order.customer)
      .select('expoPushToken');
    if (!customer?.expoPushToken) return;

    await sendPush(customer.expoPushToken, {
      title: 'Order placed 🛍️',
      body:
        order.paymentMethod === 'cash_on_delivery'
          ? `${businessName} has your order. You'll pay on delivery.`
          : `${businessName} has your order.`,
      data: { type: 'order', orderId: String(order._id) },
    });
  } catch (err) {
    console.error('[notify customer placed]', err.message);
  }
};

/**
 * Tell followers a store they follow has listed something new.
 *
 * Deliberately capped and batched: one notification per store per run, never
 * one per product. A seller uploading thirty items at once must not fire
 * thirty notifications — that's how an app gets its permissions revoked.
 */
export const notifyFollowersOfNewStock = async (businessId, businessName, productCount) => {
  try {
    if (!productCount) return;
    const followers = await mongoose.model('User')
      .find({ favoriteBusinesses: businessId, expoPushToken: { $ne: '' } })
      .select('expoPushToken')
      .limit(500);

    const body =
      productCount === 1
        ? `${businessName} added something new.`
        : `${businessName} added ${productCount} new items.`;

    await Promise.allSettled(
      followers.map((f) =>
        sendPush(f.expoPushToken, {
          title: 'New in a store you follow',
          body,
          data: { type: 'business', businessId: String(businessId) },
        })
      )
    );
  } catch (err) {
    console.error('[notify followers]', err.message);
  }
};


/**
 * A new message landed in someone's Prointeractive inbox.
 *
 * This is the piece that makes on-platform messaging viable. Until now the
 * inbox emailed and nothing else — so a message sat unseen until someone
 * happened to open the site, and conversations drifted to WhatsApp not by
 * preference but by silence.
 *
 * The notification deliberately carries a PREVIEW and a deep link rather than
 * the full thread: the point is to pull someone back into Prointeractive to
 * reply, not to let them read and answer somewhere else.
 */
export const notifyNewMessage = async (recipientId, { fromName, preview, inquiryId }) => {
  try {
    const recipient = await mongoose.model('User')
      .findById(recipientId)
      .select('expoPushToken');
    if (!recipient?.expoPushToken) return;

    await sendPush(recipient.expoPushToken, {
      title: `New message from ${fromName}`,
      // Trimmed so a long message doesn't get truncated mid-word by the OS.
      body: preview.length > 120 ? `${preview.slice(0, 117)}…` : preview,
      data: { type: 'inquiry', inquiryId: String(inquiryId) },
    });
  } catch (err) {
    console.error('[notify message]', err.message);
  }
};
