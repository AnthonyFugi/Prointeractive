import { Router } from 'express';
import { presignUpload } from '../controllers/uploadController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.post('/presign', protect, restrictTo('business', 'admin'), presignUpload);

export default router;
