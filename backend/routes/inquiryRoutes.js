import { Router } from 'express';
import { createInquiry, listInquiries, getInquiry, replyInquiry, closeInquiry } from '../controllers/inquiryController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.route('/')
  .get(protect, listInquiries)
  .post(protect, createInquiry);
router.get('/:id', protect, getInquiry);
router.post('/:id/messages', protect, replyInquiry);
router.patch('/:id/close', protect, closeInquiry);

export default router;
