import Category from '../models/Category.js';
import Product from '../models/Product.js';

const DEFAULTS = ['fashion', 'electronics', 'food', 'agriculture', 'health', 'services', 'general'];

/** Lazy bootstrap: first request on an empty collection seeds the defaults. */
const ensureDefaults = async () => {
  if ((await Category.estimatedDocumentCount()) === 0) {
    await Category.insertMany(DEFAULTS.map((name) => ({ name })), { ordered: false }).catch(() => {});
  }
};

// GET /api/categories  (public)
export const listCategories = async (req, res, next) => {
  try {
    await ensureDefaults();
    const categories = await Category.find().sort('name');
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

// POST /api/categories  (admin)  { name }
export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({ name: req.body.name });
    res.status(201).json({ success: true, category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'That category already exists' });
    }
    next(err);
  }
};

// DELETE /api/categories/:id  (admin) — blocked while products still use it
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const inUse = await Product.countDocuments({ category: category.name, isActive: true });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `${inUse} active product(s) still use "${category.name}". Recategorize them first.`,
      });
    }
    await category.deleteOne();
    res.json({ success: true, message: `Category "${category.name}" removed` });
  } catch (err) {
    next(err);
  }
};
