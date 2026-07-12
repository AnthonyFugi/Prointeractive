import { Router } from 'express';
import { createBusiness, listBusinesses, getBusiness, updateBusiness, setPayoutAccount, getPayoutAccount, setFavorite, listMyFavorites } from '../controllers/businessController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.route('/')
  .get(listBusinesses)
  .post(protect, restrictTo('business', 'admin'), createBusiness);
router.route('/payout')
  .get(protect, restrictTo('business', 'admin'), getPayoutAccount)
  .put(protect, restrictTo('business', 'admin'), setPayoutAccount);
router.get('/favorites/mine', protect, listMyFavorites);
router.post('/:id/favorite', protect, setFavorite);
router.route('/:id')
  .get(getBusiness)
  .patch(protect, updateBusiness);

export default router;
