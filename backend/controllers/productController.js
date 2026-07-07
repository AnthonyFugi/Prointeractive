import Product from '../models/Product.js';
import Business from '../models/Business.js';

const getOwnedBusiness = async (userId) => Business.findOne({ owner: userId });

// POST /api/products  (business role)
export const createProduct = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(400).json({ success: false, message: 'Create a business profile first' });
    }
    const { name, description, price, currency, images, category, stock } = req.body;
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
    const { q, category, business, minPrice, maxPrice, sort = '-createdAt', page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category.toLowerCase();
    if (business) filter.business = business;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
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
