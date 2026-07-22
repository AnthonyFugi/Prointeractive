import { Router } from 'express';
import Report from '../models/Report.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/reports — any signed-in user reports content or a user
router.post('/', protect, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      details,
    });
    res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
});

export default router;
