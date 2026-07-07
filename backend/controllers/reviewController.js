import Review from '../models/Review.js';
import Order from '../models/Order.js';

// POST /api/products/:productId/reviews  (must have a delivered order containing the product)
export const createReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const { productId } = req.params;

    const purchased = await Order.exists({
      customer: req.user._id,
      status: 'delivered',
      'items.product': productId,
    });
    if (!purchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products from delivered orders',
      });
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      comment,
    });
    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already reviewed this product' });
    }
    next(err);
  }
};

// GET /api/products/:productId/reviews  (public)
export const listReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort('-createdAt');
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};
