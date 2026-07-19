import { Router } from 'express';
import { createBusiness, listBusinesses, getBusiness, updateBusiness, setPayoutAccount, getPayoutAccount, setFavorite, listMyFavorites, requestVerification, getMyBusiness, setOwnClosed } from '../controllers/businessController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.route('/')
  .get(listBusinesses)
  .post(protect, restrictTo('business', 'admin'), createBusiness);
router.route('/payout')
  .get(protect, restrictTo('business', 'admin'), getPayoutAccount)
  .put(protect, restrictTo('business', 'admin'), setPayoutAccount);
router.get('/mine', protect, getMyBusiness);
router.get('/favorites/mine', protect, listMyFavorites);
router.patch('/:id/closed', protect, setOwnClosed);
router.post('/:id/favorite', protect, setFavorite);
router.post('/:id/request-verification', protect, requestVerification);
router.route('/:id')
  .get(getBusiness)
  .patch(protect, updateBusiness);

export default router;
