import Business from '../models/Business.js';
import { isConfigured, createSubaccount, updateSubaccount, platformFeeFraction } from '../utils/flutterwave.js';

// POST /api/businesses  (business role)
export const createBusiness = async (req, res, next) => {
  try {
    const existing = await Business.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a business profile' });
    }
    const { name, description, category, location, phone, logoUrl } = req.body;
    const business = await Business.create({
      owner: req.user._id, name, description, category, location, phone, logoUrl,
    });
    res.status(201).json({ success: true, business });
  } catch (err) {
    next(err);
  }
};

// GET /api/businesses  (public, with filters)
export const listBusinesses = async (req, res, next) => {
  try {
    const { category, q, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [businesses, total] = await Promise.all([
      Business.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
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
    const business = await Business.findById(req.params.id).populate('owner', 'name');
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
    const allowed = ['name', 'description', 'category', 'location', 'phone', 'logoUrl'];
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
