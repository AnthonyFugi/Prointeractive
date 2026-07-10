import { Router } from 'express';
import { register, login, getMe, forgotPassword, resetPassword, becomeBusiness, savePushToken } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/become-business', protect, becomeBusiness);
router.post('/push-token', protect, savePushToken);

export default router;
