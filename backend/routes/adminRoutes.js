import { Router } from 'express';
import { stats, listUsers, listBusinesses, setVerified, listOrders, setFeeStatus, listReports, setReportStatus, setSuspended, setBusinessClosed, listAllProducts } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.use(protect, restrictTo('admin'));

router.get('/stats', stats);
router.get('/users', listUsers);
router.get('/businesses', listBusinesses);
router.patch('/businesses/:id/verify', setVerified);
router.get('/orders', listOrders);
router.patch('/orders/:id/fee', setFeeStatus);
router.get('/reports', listReports);
router.patch('/reports/:id', setReportStatus);
router.patch('/users/:id/suspend', setSuspended);
router.patch('/businesses/:id/closed', setBusinessClosed);
router.get('/products', listAllProducts);

export default router;
