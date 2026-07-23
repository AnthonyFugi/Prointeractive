import Business from '../models/Business.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const MAX_BUSINESS_CATEGORIES = 3;
/** Accepts `categories` array or legacy `category` string; returns clean array or an error string. */
const normalizeCategories = async (body) => {
  let list = Array.isArray(body.categories) ? body.categories : body.category ? [body.category] : [];
  list = [...new Set(list.map((c) => String(c).toLowerCase().trim()).filter(Boolean))];
  if (list.length === 0) return { error: 'Pick at least one category' };
  if (list.length > MAX_BUSINESS_CATEGORIES) return { error: `Pick at most ${MAX_BUSINESS_CATEGORIES} categories` };
  const known = await Category.countDocuments({ name: { $in: list } });
  if (known !== list.length) return { error: 'Unknown category — pick from the list' };
  return { list };
};
import { sendEmail } from '../utils/email.js';
import { isConfigured, createSubaccount, updateSubaccount, platformFeeFraction } from '../utils/flutterwave.js';

// POST /api/businesses  (business role)
export const createBusiness = async (req, res, next) => {
  try {
    const existing = await Business.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a business profile' });
    }
    const { name, description, location, phone, logoUrl } = req.body;
    const { list, error } = await normalizeCategories(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const business = await Business.create({
      owner: req.user._id, name, description, location, phone, logoUrl,
      categories: list, category: list[0],
    });
    res.status(201).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// GET /api/businesses  (public, with filters)
export const listBusinesses = async (req, res, next) => {
  try {
    const { category, q, page = 1, limit = 12, featured } = req.query;
    const filter = { closed: { $ne: true } };
    if (featured === 'true') filter.featured = true;
    if (category) filter.$or = [{ categories: category }, { category }];
    if (q) filter.name = { $regex: q, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const city = req.user?.preferences?.city?.trim();
    if (city) {
      const skip = (Number(page) - 1) * Number(limit);
      const cityRe = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const agg = await Business.aggregate([
        { $match: filter },
        { $addFields: { near: { $cond: [{ $regexMatch: { input: { $ifNull: ['$location', ''] }, regex: cityRe } }, 1, 0] } } },
        { $sort: { near: -1, featured: -1, verified: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]);
      const total = await Business.countDocuments(filter);
      return res.json({ success: true, businesses: agg, total, page: Number(page), pages: Math.ceil(total / limit) });
    }

    const [businesses, total] = await Promise.all([
      Business.find(filter).sort('-featured -createdAt').skip(skip).limit(Number(limit)),
      Business.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), businesses });
  } catch (err) {
    next(err);
  }
};

// GET /api/businesses/:id  (public)
export const getBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const business = (
      /^[0-9a-fA-F]{24}$/.test(id) ? await Business.findById(id) : null
    ) || await Business.findOne({ slug: id.toLowerCase() });
    if (business && business.closed) {
      return res.status(404).json({ success: false, message: 'This storefront is closed' });
    }
    if (business) await business.populate('owner', 'name');
    if (business) Business.updateOne({ _id: business._id }, { $inc: { views: 1 } }).catch(() => {});
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/businesses/:id  (owner only)
export const updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (!business.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your business profile' });
    }
    if (req.body.categories || req.body.category) {
      const { list, error } = await normalizeCategories(req.body);
      if (error) return res.status(400).json({ success: false, message: error });
      req.body.categories = list;
      req.body.category = list[0];
    }
    const allowed = ['name', 'description', 'category', 'categories', 'location', 'phone', 'logoUrl'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) business[f] = req.body[f];
    });
    await business.save();
    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};


// PUT /api/businesses/payout  (owner sets/updates their settlement account)
export const setPayoutAccount = async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ success: false, message: 'Payments are not configured on the platform yet' });
    }
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) return res.status(400).json({ success: false, message: 'Create a business profile first' });

    const { accountBank, accountNumber, bankName } = req.body;
    if (!accountBank || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank and account number are required' });
    }

    let flwRes;
    if (business.payout?.flwId) {
      flwRes = await updateSubaccount(business.payout.flwId, {
        accountBank, accountNumber, businessName: business.name,
      });
    } else {
      flwRes = await createSubaccount({
        accountBank,
        accountNumber,
        businessName: business.name,
        email: req.user.email,
        mobile: business.phone,
      });
    }

    business.payout = {
      accountBank,
      accountNumber,
      bankName: bankName || '',
      subaccountId: flwRes.data.subaccount_id || business.payout?.subaccountId || '',
      flwId: flwRes.data.id || business.payout?.flwId,
    };
    await business.save();

    res.json({
      success: true,
      payout: {
        bankName: business.payout.bankName,
        accountNumber: business.payout.accountNumber,
        connected: !!business.payout.subaccountId,
        platformFeePercent: platformFeeFraction() * 100,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/businesses/payout  (owner checks their payout status)
export const getPayoutAccount = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) return res.status(400).json({ success: false, message: 'Create a business profile first' });
    res.json({
      success: true,
      payout: {
        bankName: business.payout?.bankName || '',
        accountNumber: business.payout?.accountNumber || '',
        connected: !!business.payout?.subaccountId,
        platformFeePercent: platformFeeFraction() * 100,
      },
    });
  } catch (err) {
    next(err);
  }
};


// POST /api/businesses/:id/favorite  { favorited: true|false }
export const setFavorite = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    const favorited = !!req.body.favorited;
    const op = favorited
      ? { $addToSet: { favoriteBusinesses: business._id } }
      : { $pull: { favoriteBusinesses: business._id } };
    await req.user.updateOne(op);
    res.json({ success: true, favorited });
  } catch (err) {
    next(err);
  }
};

// GET /api/businesses/favorites/mine
export const listMyFavorites = async (req, res, next) => {
  try {
    const me = await req.user.populate('favoriteBusinesses', 'name category categories location verified logoUrl');
    res.json({ success: true, businesses: me.favoriteBusinesses || [] });
  } catch (err) {
    next(err);
  }
};


// POST /api/businesses/:id/request-verification  (owner)
export const requestVerification = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (!business.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your business' });
    }
    if (business.verified) {
      return res.status(400).json({ success: false, message: 'This business is already verified' });
    }
    business.verificationRequested = true;
    business.verificationRequestedAt = new Date();
    await business.save();

    // Nudge the admin (fire-and-forget)
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@fugipay.com',
      subject: `Verification request: ${business.name}`,
      heading: 'A business wants the blue tick',
      body: `${business.name} (${(business.categories && business.categories.length ? business.categories.join(', ') : business.category) || 'uncategorised'}${business.location ? ', ' + business.location : ''}) has requested verification. Review it in the admin panel → Businesses.`,
    });

    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};


// GET /api/businesses/mine — the owner's business, closed or not
export const getMyBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    res.json({ success: true, business: business || null });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/businesses/:id/closed  { closed: true|false } — owner self-close/reopen
export const setOwnClosed = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (!business.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not your business' });
    }
    const closed = !!req.body.closed;
    if (!closed && business.closed && business.closedBy === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'This storefront was closed by Prointeractive — contact hello@fugipay.com to appeal.',
      });
    }
    business.closed = closed;
    business.closedBy = closed ? 'owner' : null;
    await business.save();
    if (closed) {
      await Product.updateMany(
        { business: business._id, isActive: true },
        { isActive: false, deactivatedReason: 'owner_close' }
      );
    } else {
      await Product.updateMany(
        { business: business._id, deactivatedReason: { $in: ['owner_close', 'admin_close'] } },
        { isActive: true, deactivatedReason: null }
      );
    }
    res.json({ success: true, business });
  } catch (err) {
    next(err);
  }
};
