import { Router } from 'express';
import { register, login, getMe, forgotPassword, resetPassword, becomeBusiness, savePushToken, setBlocked, deleteMe, updatePreferences } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.patch('/preferences', protect, updatePreferences);
router.get('/me', protect, getMe);
router.post('/become-business', protect, becomeBusiness);
router.post('/push-token', protect, savePushToken);
router.post('/block', protect, setBlocked);
router.delete('/me', protect, deleteMe);

export default router;
