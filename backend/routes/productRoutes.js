import { Router } from 'express';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { createReview, listReviews } from '../controllers/reviewController.js';
import { protect, restrictTo, maybeAuth } from '../middleware/auth.js';

const router = Router();
router.get('/trending', trendingProducts);
router.route('/')
  .get(maybeAuth, listProducts)
  .post(protect, restrictTo('business', 'admin'), createProduct);
router.route('/:id')
  .get(getProduct)
  .patch(protect, restrictTo('business', 'admin'), updateProduct)
  .delete(protect, restrictTo('business', 'admin'), deleteProduct);

// Nested reviews
router.route('/:productId/reviews')
  .get(listReviews)
  .post(protect, createReview);

export default router;
