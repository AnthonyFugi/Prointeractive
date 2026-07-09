import { Router } from 'express';
import { stats, listUsers, listBusinesses, setVerified, listOrders, setFeeStatus } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.use(protect, restrictTo('admin'));

router.get('/stats', stats);
router.get('/users', listUsers);
router.get('/businesses', listBusinesses);
router.patch('/businesses/:id/verify', setVerified);
router.get('/orders', listOrders);
router.patch('/orders/:id/fee', setFeeStatus);

export default router;
