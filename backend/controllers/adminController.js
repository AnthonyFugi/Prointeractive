import User from '../models/User.js';
import Business from '../models/Business.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';
import { sendEmail } from '../utils/email.js';
import Inquiry from '../models/Inquiry.js';

// GET /api/admin/stats
export const stats = async (req, res, next) => {
  try {
    const [users, businesses, unverified, products, hiddenProducts, orders, openInquiries, revenue, feesDue, verificationRequests] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Business.countDocuments({ verified: false }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
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
      Business.countDocuments({ verificationRequested: true, verified: false }),
    ]);
    res.json({
      success: true,
      stats: {
        users, businesses, unverified, products, orders, openInquiries,
        hiddenProducts,
        revenue: revenue[0]?.total || 0,
        feesDue: feesDue[0]?.total || 0,
        verificationRequests,
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
    const verified = !!req.body.verified;
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { verified, verificationRequested: false },
      { new: true }
    ).populate('owner', 'name email');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (verified && business.owner?.email) {
      sendEmail({
        to: business.owner.email,
        subject: `${business.name} is now verified ✓`,
        heading: 'You earned the blue tick',
        body: `${business.name} is now a verified business on Prointeractive. The verification badge shows on your storefront and every product — customers use it as a signal they can buy with confidence.`,
      });
    }
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


// GET /api/admin/reports
export const listReports = async (req, res, next) => {
  try {
    const reports = await Report.find(req.query.status ? { status: req.query.status } : {})
      .populate('reporter', 'name email')
      .sort('-createdAt')
      .limit(200);
    res.json({ success: true, reports });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/reports/:id  { status: 'resolved' | 'open' }
export const setReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['resolved', 'open'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, resolvedAt: status === 'resolved' ? new Date() : undefined },
      { new: true }
    ).populate('reporter', 'name email');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/suspend  { suspended: true|false }
export const setSuspended = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot suspend an admin' });
    user.suspended = !!req.body.suspended;
    await user.save();
    res.json({ success: true, user: { id: user._id, suspended: user.suspended } });
  } catch (err) {
    next(err);
  }
};


// PATCH /api/admin/businesses/:id/closed  { closed: true|false }
export const setBusinessClosed = async (req, res, next) => {
  try {
    const closed = !!req.body.closed;
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { closed, closedBy: closed ? 'admin' : null },
      { new: true }
    ).populate('owner', 'name email');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    if (closed) {
      // Pull the storefront's products from the shop, marked so reopening can restore them
      await Product.updateMany(
        { business: business._id, isActive: true },
        { isActive: false, deactivatedReason: 'admin_close' }
      );
    } else {
      // Reopen restores exactly what the close deactivated — seller-hidden products stay hidden
      await Product.updateMany(
        { business: business._id, deactivatedReason: { $in: ['admin_close', 'owner_close'] } },
        { isActive: true, deactivatedReason: null }
      );
    }
    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};


// GET /api/admin/products — every product, active or hidden
export const listAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .populate('business', 'name slug')
      .sort('-createdAt')
      .limit(500);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
};
