import Product from '../models/Product.js';
import Business from '../models/Business.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import { recordAffinity, topAffinityCategories } from '../utils/affinity.js';
import { notifyFollowersOfNewStock } from '../utils/notify.js';

const getOwnedBusiness = async (userId) => Business.findOne({ owner: userId });

// POST /api/products  (business role)
export const createProduct = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(400).json({ success: false, message: 'Create a business profile first' });
    }
    const { name, description, price, basePrice, currency, images, category, stock, salePrice, baseSalePrice, saleEndsAt } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one product photo' });
    }
    if (category && !(await Category.exists({ name: String(category).toLowerCase() }))) {
      return res.status(400).json({ success: false, message: 'Choose a category from the list' });
    }
    // basePrice (what the seller wants to receive) wins when present — `price`
    // is then derived in the model's pre-validate hook. A request carrying only
    // `price` is still accepted unchanged, which is what older app builds in
    // the stores send; the hook back-fills basePrice for those.
    const doc = {
      business: business._id, name, description, currency, images, category, stock,
      saleEndsAt: saleEndsAt ?? null,
    };
    const usesBase = basePrice !== undefined && basePrice !== null && basePrice !== '';
    if (usesBase) doc.basePrice = Number(basePrice);
    else if (price !== undefined) doc.price = Number(price);

    const usesBaseSale = baseSalePrice !== undefined;
    if (usesBaseSale) {
      doc.baseSalePrice = baseSalePrice === null || baseSalePrice === '' ? null : Number(baseSalePrice);
    } else {
      doc.salePrice = salePrice ?? null;
    }

    const product = new Product(doc);
    // Tell the model which number was actually stated, so it derives the other
    // rather than guessing from what happens to look modified.
    product.$locals.priceSource = usesBase ? 'base' : 'list';
    product.$locals.salePriceSource = usesBaseSale ? 'base' : 'list';
    await product.save();

    // Followers hear about it. One notification per listing is acceptable at
    // current volume; if a seller starts bulk-uploading, batch this into a
    // scheduled digest rather than raising the cap.
    notifyFollowersOfNewStock(business._id, business.name, 1);
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

// GET /api/products  (public: search, filter, paginate, sort)
export const listProducts = async (req, res, next) => {
  try {
    const { q, category, business, favorites, saved, featured, onSale, includeInactive, minPrice, maxPrice, sort = '-createdAt', page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };
    if (includeInactive === 'true' && req.user) {
      // Only the storefront's owner (or an admin) may see hidden products
      const owned = await Business.findOne({ owner: req.user._id }).select('_id');
      const requested = business && /^[0-9a-fA-F]{24}$/.test(business) ? business : null;
      if (req.user.role === 'admin' || (owned && requested && owned._id.equals(requested))) {
        delete filter.isActive;
      }
    }
    const escapeRe = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Hoisted to function scope: both the candidate filter below and the
    // relevance ranking further down need the same word list.
    const words = q ? String(q).trim().split(/\s+/).filter(Boolean).map(escapeRe) : [];
    if (q) {
      // Substring matching, not MongoDB's $text: $text only matches whole
      // words, so a search for "Mac" would never find "MacBook" — different
      // tokens entirely, no prefix relationship. This candidate set is
      // deliberately wide (any word, anywhere in name or description);
      // the relevance ranking further down decides the actual order.
      filter.$or = words.flatMap((w) => [
        { name: new RegExp(w, 'i') },
        { description: new RegExp(w, 'i') },
      ]);
    }
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
    if (onSale === 'true') {
      filter.salePrice = { $ne: null };
      filter.saleEndsAt = { $gt: new Date() };
    }
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
    // Interests come from the account when signed in, or from the query string
    // for a visitor who picked some before creating one — the feed personalises
    // either way, which is the whole point of letting people browse first.
    const stated = (req.query.interests
      ? String(req.query.interests).split(',')
      : req.user?.interests || []
    ).map((c) => String(c).trim().toLowerCase()).filter(Boolean);
    // What they said, plus what they've actually done. Behaviour is ranked
    // separately below rather than merged, so a category they browse heavily
    // can outrank one they ticked once and never touched.
    const learned = topAffinityCategories(req.user);
    const interestList = [...new Set([...stated, ...learned])];

    // The personalised default feed. Only for the plain browse view: any
    // explicit filter or search means the shopper has told us what they want,
    // and second-guessing that with their interests would be worse than useless.
    const personalise =
      (followIds.length > 0 || interestList.length > 0) &&
      !q && !business && !favorites && !saved && featured !== 'true' && onSale !== 'true' && sort === '-createdAt';

    if (personalise) {
      const agg = await Product.aggregate([
        { $match: filter },
        { $addFields: {
          onSale: { $and: [{ $ne: ['$salePrice', null] }, { $gt: ['$saleEndsAt', '$$NOW'] }] },
        } },
        { $addFields: {
          effectivePrice: { $cond: ['$onSale', '$salePrice', '$price'] },
        } },
        { $addFields: {
          followed: { $cond: [{ $in: ['$business', followIds] }, 1, 0] },
          // A store they follow is a stronger signal than a category they
          // ticked once, so following always outranks interest.
          // Two tiers: a stated interest OR strong observed behaviour scores 1,
          // and behaviour alone breaks ties among the rest.
          interested: interestList.length
            ? { $cond: [{ $in: ['$category', interestList] }, 1, 0] }
            : 0,
          learned: learned.length
            ? { $cond: [{ $in: ['$category', learned] }, 1, 0] }
            : 0,
          inStock: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] },
        } },
        // Out-of-stock items sink rather than vanish — hiding them entirely
        // would make a thin catalogue look even thinner.
        { $sort: { followed: -1, interested: -1, learned: -1, inStock: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]);
      await Product.populate(agg, { path: 'business', select: 'name slug verified' });
      const total = await Product.countDocuments(filter);
      return res.json({ success: true, products: agg, total, page: Number(page), pages: Math.ceil(total / limit) });
    }

    // A search term gets its own ranking, computed here rather than left to
    // MongoDB's $text scoring (which we no longer use — see the filter above).
    // Signals, each a substring/regex test against the actual product name:
    //   - exact phrase found in the name           (strongest — "iphone 17 pro max")
    //   - name starts with the query                (very strong — "MacBook..." for "Mac")
    //   - how many of the individual query words appear in the name
    //   - how many appear in the description        (weakest — matches almost anything)
    // Name-based signals dominate on purpose, same principle as the index
    // weighting: a word buried in a description shouldn't outrank a real
    // match in the title.
    if (q) {
      const phraseRe = new RegExp(words.join('\\s*'), 'i');
      const startsWithRe = new RegExp('^\\s*' + words.join('\\s*'), 'i');
      const nameWordConds = words.map((w) => ({ $cond: [{ $regexMatch: { input: '$name', regex: new RegExp(w, 'i') } }, 1, 0] } ));
      const descWordConds = words.map((w) => ({ $cond: [{ $regexMatch: { input: '$description', regex: new RegExp(w, 'i') } }, 1, 0] } ));

      const agg = await Product.aggregate([
        { $match: filter },
        { $addFields: {
          onSale: { $and: [{ $ne: ['$salePrice', null] }, { $gt: ['$saleEndsAt', '$$NOW'] }] },
        } },
        { $addFields: {
          effectivePrice: { $cond: ['$onSale', '$salePrice', '$price'] },
        } },
        { $addFields: {
          phraseBonus: { $cond: [{ $regexMatch: { input: '$name', regex: phraseRe } }, 1, 0] },
          startsWithBonus: { $cond: [{ $regexMatch: { input: '$name', regex: startsWithRe } }, 1, 0] },
          nameWordMatches: { $add: nameWordConds },
          descWordMatches: { $add: descWordConds },
        } },
        { $addFields: {
          relevance: {
            $add: [
              { $multiply: ['$phraseBonus', 100] },
              { $multiply: ['$startsWithBonus', 40] },
              { $multiply: ['$nameWordMatches', 10] },
              { $multiply: ['$descWordMatches', 1] },
            ],
          },
        } },
        { $sort: { relevance: -1, createdAt: -1 } },
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
/**
 * POST /api/products/:id/view
 *
 * Records that a signed-in shopper looked at something. Fire-and-forget from
 * the client's point of view: it always returns 204, never blocks the page,
 * and a failure here must never surface to a shopper.
 *
 * Signed-out views are simply not recorded — there's nowhere to put them, and
 * inventing a device profile for anonymous visitors is a privacy cost with
 * very little ranking benefit at this catalogue size.
 */
/**
 * GET /api/products/following-new
 *
 * Everything listed by stores this shopper follows since they last looked,
 * plus the unseen count. This is the returning-visitor surface: a reason to
 * reopen the app that isn't an order they're already tracking.
 *
 * `seen=true` marks the strip as read. Kept as an explicit flag rather than a
 * side effect of fetching, so opening the home page doesn't silently clear a
 * badge the shopper never actually looked at.
 */
export const followingNew = async (req, res, next) => {
  try {
    const followIds = req.user?.favoriteBusinesses || [];
    if (!followIds.length) {
      return res.json({ success: true, products: [], unseen: 0, following: 0 });
    }

    const since = req.user.lastFollowFeedSeenAt;
    const filter = { business: { $in: followIds }, isActive: true };
    if (since) filter.createdAt = { $gt: since };

    const [products, unseen] = await Promise.all([
      Product.find(filter)
        .sort('-createdAt')
        .limit(12)
        .populate('business', 'name slug logoUrl'),
      Product.countDocuments(filter),
    ]);

    if (req.query.seen === 'true') {
      req.user.lastFollowFeedSeenAt = new Date();
      await req.user.save({ validateBeforeSave: false });
    }

    res.json({ success: true, products, unseen, following: followIds.length });
  } catch (err) {
    next(err);
  }
};

export const recordProductView = async (req, res) => {
  try {
    if (!req.user) return res.status(204).end();
    const product = await Product.findById(req.params.id).select('category');
    if (product?.category) {
      recordAffinity(req.user, product.category, 'view');
      await req.user.save({ validateBeforeSave: false });
    }
  } catch (err) {
    console.error('[view tracking]', err.message);
  }
  return res.status(204).end();
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('business', 'name slug verified location logoUrl phone');
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
    // If the caller states a target take-home, that is authoritative and the
    // shelf price is derived from it — ignore any `price` sent alongside, so a
    // stale value in a form payload can't silently override the seller's intent.
    const body = { ...req.body };
    if (body.basePrice !== undefined && body.basePrice !== null && body.basePrice !== '') {
      delete body.price;
    }
    if (body.baseSalePrice !== undefined) {
      delete body.salePrice;
    }
    const allowed = ['name', 'description', 'price', 'basePrice', 'currency', 'images', 'category', 'stock', 'isActive', 'salePrice', 'baseSalePrice', 'saleEndsAt'];
    allowed.forEach((f) => {
      if (body[f] !== undefined) product[f] = body[f];
    });
    // Only declare an intent when this request actually carried a price. An
    // edit that only touches stock or photos leaves both undefined, and the
    // model then leaves the existing prices exactly as they are.
    if (body.basePrice !== undefined) product.$locals.priceSource = 'base';
    else if (body.price !== undefined) product.$locals.priceSource = 'list';
    if (body.baseSalePrice !== undefined) product.$locals.salePriceSource = 'base';
    else if (body.salePrice !== undefined) product.$locals.salePriceSource = 'list';
    await product.save();
    // Populate before responding — without this, any caller that trusts
    // this response to refresh its local state (e.g. Admin's product list)
    // ends up overwriting a properly-populated business object with a raw,
    // unpopulated ObjectId, which then displays as "Unknown business".
    await product.populate('business', 'name slug verified');
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
