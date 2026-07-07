import { Router } from 'express';
import { createBusiness, listBusinesses, getBusiness, updateBusiness, setPayoutAccount, getPayoutAccount } from '../controllers/businessController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.route('/')
  .get(listBusinesses)
  .post(protect, restrictTo('business', 'admin'), createBusiness);
router.route('/payout')
  .get(protect, restrictTo('business', 'admin'), getPayoutAccount)
  .put(protect, restrictTo('business', 'admin'), setPayoutAccount);
router.route('/:id')
  .get(getBusiness)
  .patch(protect, updateBusiness);

export default router;
