import User from '../models/User.js';
import Business from '../models/Business.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';
import { sendEmail } from '../utils/email.js';
import Inquiry from '../models/Inquiry.js';
import SiteVisit from '../models/SiteVisit.js';

// The platform's original/root admin account — permanently protected from
// role changes regardless of how many other admins exist. Unlike the
// last-admin check below (which only bites when exactly one admin remains),
// this account can never be demoted, full stop.
const PROTECTED_ADMIN_EMAIL = 'admin@fugipay.com';

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
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    // Filters are applied server-side so pagination pages through the
    // FILTERED set, not the whole catalog with the filter applied after —
    // otherwise a rare filter (like "featured") could show one item per
    // page even though every match is really just a few pages away.
    const filter = {};
    if (req.query.featured === 'true') filter.featured = true;
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'hidden') filter.isActive = false;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('business', 'name slug')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, products, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};


export const setProductFeatured = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { featured: !!req.body.featured }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

export const setBusinessFeatured = async (req, res, next) => {
  try {
    const business = await Business.findByIdAndUpdate(req.params.id, { featured: !!req.body.featured }, { new: true }).populate('owner', 'name email');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (err) { next(err); }
};

// GET /api/admin/analytics — platform metrics for decision-making
export const analytics = async (req, res, next) => {
  try {
    const days = 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    const [ordersDaily, usersDaily, visitsDaily, statusSplit, paymentSplit, topProducts, topBusinesses, viewsTotals, categorySplit, totalProducts, activeProducts, totalBusinesses, verifiedBusinesses, totalVisits] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayKey, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $in: ['$status', ['paid', 'shipped', 'delivered']] }, '$totalAmount', 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayKey, users: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      SiteVisit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dayKey, visits: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
        { $group: { _id: '$paymentMethod', n: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $in: ['paid', 'shipped', 'delivered'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', units: { $sum: '$items.quantity' }, name: { $first: '$items.name' } } },
        { $sort: { units: -1 } }, { $limit: 8 },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$business', orders: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
        { $sort: { orders: -1 } }, { $limit: 8 },
        { $lookup: { from: 'businesses', localField: '_id', foreignField: '_id', as: 'biz' } },
        { $addFields: { name: { $first: '$biz.name' } } },
        { $project: { biz: 0 } },
      ]),
      Promise.all([
        Product.aggregate([{ $group: { _id: null, views: { $sum: '$views' } } }]),
        Business.aggregate([{ $group: { _id: null, views: { $sum: '$views' } } }]),
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Business.countDocuments({}),
      Business.countDocuments({ verified: true }),
      SiteVisit.countDocuments({}),
    ]);
    res.json({
      success: true,
      analytics: {
        days, ordersDaily, usersDaily, visitsDaily, statusSplit, paymentSplit, topProducts, topBusinesses,
        views: { products: viewsTotals[0][0]?.views || 0, businesses: viewsTotals[1][0]?.views || 0 },
        categorySplit,
        totals: { products: totalProducts, activeProducts, businesses: totalBusinesses, verifiedBusinesses, visits: totalVisits },
      },
    });
  } catch (err) { next(err); }
};


// PATCH /api/admin/users/:id/role  { role: 'customer' | 'business' | 'admin' }
// Lets existing admins extend oversight to new team members without ever
// touching the database directly.
export const setUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['customer', 'business', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // The original admin account is permanently protected — its role can
    // never be changed, by anyone, for any reason.
    if (user.email === PROTECTED_ADMIN_EMAIL && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'This account is protected and cannot be changed.' });
    }

    // Never let an admin strip their own oversight access — a slipped click
    // could otherwise lock the person out of the console entirely.
    if (String(user._id) === String(req.user._id) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own admin access.' });
    }

    // Never demote the last remaining admin — the platform must always keep
    // at least one person able to grant access back.
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'At least one admin must remain — promote someone else first.' });
      }
    }

    user.role = role;
    await user.save();
    res.json({ success: true, user: { id: user._id, role: user.role } });
  } catch (err) {
    next(err);
  }
};
