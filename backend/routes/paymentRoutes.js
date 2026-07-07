import { Router } from 'express';
import { initiateCheckout, verifyPayment, webhook, listBanks } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.get('/banks', protect, listBanks);
router.post('/checkout/:orderId', protect, initiateCheckout);
router.get('/verify', protect, verifyPayment);
router.post('/webhook', webhook); // authenticated by Flutterwave's verif-hash header

export default router;
