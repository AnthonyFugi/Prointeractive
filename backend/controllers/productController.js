import Product from '../models/Product.js';
import Business from '../models/Business.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

const getOwnedBusiness = async (userId) => Business.findOne({ owner: userId });

// POST /api/products  (business role)
export const createProduct = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(400).json({ success: false, message: 'Create a business profile first' });
    }
    const { name, description, price, currency, images, category, stock } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one product photo' });
    }
    if (category && !(await Category.exists({ name: String(category).toLowerCase() }))) {
      return res.status(400).json({ success: false, message: 'Choose a category from the list' });
    }
    const product = await Product.create({
      business: business._id, name, description, price, currency, images, category, stock,
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

// GET /api/products  (public: search, filter, paginate, sort)
export const listProducts = async (req, res, next) => {
  try {
    const { q, category, business, favorites, saved, featured, includeInactive, minPrice, maxPrice, sort = '-createdAt', page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };
    if (includeInactive === 'true' && req.user) {
      // Only the storefront's owner (or an admin) may see hidden products
      const owned = await Business.findOne({ owner: req.user._id }).select('_id');
      const requested = business && /^[0-9a-fA-F]{24}$/.test(business) ? business : null;
      if (req.user.role === 'admin' || (owned && requested && owned._id.equals(requested))) {
        delete filter.isActive;
      }
    }
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category.toLowerCase();
    if (business) {
      if (/^[0-9a-fA-F]{24}$/.test(business)) {
        filter.business = business;
      } else {
        // Accept a business slug too — resolves to its id, or matches nothing
        const biz = await Business.findOne({ slug: String(business).toLowerCase() }).select('_id');
        filter.business = biz ? biz._id : null;
      }
    }
    if (saved === 'true') {
      const ids = req.user?.favoriteProducts || [];
      filter._id = { $in: ids };
    }
    if (featured === 'true') filter.featured = true;
    if (favorites === 'true') {
      // Signed-in users only; anonymous requests get an empty result, not an error
      const ids = req.user?.favoriteBusinesses || [];
      filter.business = { $in: ids };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const followIds = req.user?.favoriteBusinesses || [];
    const followFirst =
      followIds.length > 0 && !q && !business && !favorites && !saved && featured !== 'true' && sort === '-createdAt';

    if (followFirst) {
      const agg = await Product.aggregate([
        { $match: filter },
        { $addFields: { followed: { $cond: [{ $in: ['$business', followIds] }, 1, 0] } } },
        { $sort: { followed: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]);
      await Product.populate(agg, { path: 'business', select: 'name slug verified' });
      const total = await Product.countDocuments(filter);
      return res.json({ success: true, products: agg, total, page: Number(page), pages: Math.ceil(total / limit) });
    }

    const [products, total] = await Promise.all([
      Product.find(filter).populate('business', 'name slug verified').sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / limit), products });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id  (public)
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('business', 'name slug verified location');
    if (product) Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(() => {});
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id  (owning business)
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const business = await getOwnedBusiness(req.user._id);
    const owns = business && product.business.equals(business._id);
    if (!owns && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your product' });
    }
    if (req.body.images !== undefined && (!Array.isArray(req.body.images) || req.body.images.length === 0)) {
      return res.status(400).json({ success: false, message: 'A product needs at least one photo' });
    }
    if (req.body.category && !(await Category.exists({ name: String(req.body.category).toLowerCase() }))) {
      return res.status(400).json({ success: false, message: 'Choose a category from the list' });
    }
    const allowed = ['name', 'description', 'price', 'currency', 'images', 'category', 'stock', 'isActive'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id  (soft delete via isActive)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const business = await getOwnedBusiness(req.user._id);
    const owns = business && product.business.equals(business._id);
    if (!owns && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your product' });
    }
    product.isActive = false;
    await product.save();
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
};


// GET /api/products/trending — most-ordered in the last 30 days; padded with
// newest listings when order history is still thin, so the section never looks empty.
export const trendingProducts = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const ranked = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ['paid', 'shipped', 'delivered'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', ordered: { $sum: '$items.quantity' } } },
      { $sort: { ordered: -1 } },
      { $limit: limit },
    ]);

    const ids = ranked.map((r) => r._id);
    const found = await Product.find({ _id: { $in: ids }, isActive: true })
      .populate('business', 'name verified slug');
    // preserve rank order
    const byId = new Map(found.map((p) => [String(p._id), p]));
    let products = ids.map((id) => byId.get(String(id))).filter(Boolean);

    if (products.length < limit) {
      const fill = await Product.find({ isActive: true, _id: { $nin: ids } })
        .sort('-createdAt')
        .limit(limit - products.length)
        .populate('business', 'name verified slug');
      products = [...products, ...fill];
    }
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
};


// POST /api/products/:id/favorite  { favorited: true|false } — save/unsave (wishlist)
export const setFavoriteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const favorited = !!req.body.favorited;
    const op = favorited
      ? { $addToSet: { favoriteProducts: product._id } }
      : { $pull: { favoriteProducts: product._id } };
    await req.user.updateOne(op);
    res.json({ success: true, favorited });
  } catch (err) {
    next(err);
  }
};
