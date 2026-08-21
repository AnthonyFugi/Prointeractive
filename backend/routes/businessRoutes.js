import { Router } from 'express';
import { createBusiness, listBusinesses, getBusiness, updateBusiness, setPayoutAccount, getPayoutAccount, setFavorite, listMyFavorites, requestVerification, getMyBusiness, setOwnClosed, suggestedBusinesses } from '../controllers/businessController.js';
import { maybeAuth, protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.route('/')
  .get(maybeAuth, listBusinesses)
  .post(protect, restrictTo('business', 'admin'), createBusiness);
router.route('/payout')
  .get(protect, restrictTo('business', 'admin'), getPayoutAccount)
  .put(protect, restrictTo('business', 'admin'), setPayoutAccount);
// Registered before '/:id' — otherwise Express treats 'suggested' as an id.
router.get('/suggested', maybeAuth, suggestedBusinesses);
router.get('/mine', protect, getMyBusiness);
router.get('/favorites/mine', protect, listMyFavorites);
router.patch('/:id/closed', protect, setOwnClosed);
router.post('/:id/favorite', protect, setFavorite);
router.post('/:id/request-verification', protect, requestVerification);
router.route('/:id')
  .get(getBusiness)
  .patch(protect, updateBusiness);

export default router;
