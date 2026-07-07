import { Router } from 'express';
import { createOrder, myOrders, businessOrders, getOrder, updateOrderStatus } from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.post('/', protect, createOrder);
router.get('/mine', protect, myOrders);
router.get('/business', protect, restrictTo('business', 'admin'), businessOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, updateOrderStatus);

export default router;
