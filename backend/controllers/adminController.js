import User from '../models/User.js';
import Business from '../models/Business.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Inquiry from '../models/Inquiry.js';

// GET /api/admin/stats
export const stats = async (req, res, next) => {
  try {
    const [users, businesses, unverified, products, orders, openInquiries, revenue, feesDue] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Business.countDocuments({ verified: false }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Inquiry.countDocuments({ status: 'open' }),
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { 'platformFee.status': 'due' } },
        { $group: { _id: null, total: { $sum: '$platformFee.amount' } } },
      ]),
    ]);
    res.json({
      success: true,
      stats: {
        users, businesses, unverified, products, orders, openInquiries,
        revenue: revenue[0]?.total || 0,
        feesDue: feesDue[0]?.total || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find().sort('-createdAt').skip(skip).limit(Number(limit)),
      User.countDocuments(),
    ]);
    res.json({ success: true, total, page: Number(page), users });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/businesses  (includes unverified, with owner contact)
export const listBusinesses = async (req, res, next) => {
  try {
    const businesses = await Business.find()
      .populate('owner', 'name email')
      .sort('verified -createdAt');
    res.json({ success: true, businesses });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/businesses/:id/verify  { verified: true|false }
export const setVerified = async (req, res, next) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { verified: !!req.body.verified },
      { new: true }
    ).populate('owner', 'name email');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders  (recent, across the platform)
export const listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('business', 'name')
      .sort('-createdAt')
      .limit(100);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};


// PATCH /api/admin/orders/:id/fee  { status: 'settled' | 'due' }
export const setFeeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['settled', 'due'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "settled" or "due"' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.platformFee || order.platformFee.amount <= 0) {
      return res.status(400).json({ success: false, message: 'No platform fee on this order' });
    }
    order.platformFee.status = status;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};
