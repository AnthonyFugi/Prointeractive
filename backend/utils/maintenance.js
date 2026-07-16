import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { runBackup } from '../scripts/backupToS3.js';

const HOUR = 60 * 60 * 1000;
const EXPIRE_AFTER_MS = 24 * HOUR;

/** Cancel online-payment orders still pending after 24h, restoring stock. */
export const expireStaleOrders = async () => {
  try {
    const cutoff = new Date(Date.now() - EXPIRE_AFTER_MS);
    const stale = await Order.find({
      status: 'pending',
      paymentMethod: { $in: ['mobile_money', 'card'] },
      createdAt: { $lt: cutoff },
    });
    for (const order of stale) {
      order.status = 'cancelled';
      await order.save();
      await Promise.all(
        order.items.map((i) =>
          Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })
        )
      );
    }
    if (stale.length) console.log(`[maintenance] expired ${stale.length} stale pending order(s)`);
  } catch (err) {
    console.error('[maintenance] order expiry failed:', err.message);
  }
};

export const startMaintenance = () => {
  // Hourly: expire stale unpaid orders
  setInterval(expireStaleOrders, HOUR);
  setTimeout(expireStaleOrders, 30 * 1000); // once shortly after boot

  // Daily: JSON backup of all collections to S3 (set BACKUP_TO_S3=true)
  if (process.env.BACKUP_TO_S3 === 'true') {
    setInterval(() => runBackup().catch((e) => console.error('[backup] failed:', e.message)), 24 * HOUR);
    setTimeout(() => runBackup().catch((e) => console.error('[backup] failed:', e.message)), 90 * 1000);
  }
  console.log('[maintenance] schedulers started');
};
