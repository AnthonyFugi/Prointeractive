import { Router } from 'express';
import SiteVisit from '../models/SiteVisit.js';

const router = Router();

// POST /api/analytics/visit  { platform: 'web' | 'mobile' }
// Public and intentionally trivial — one insert, no auth, no PII. Covered by
// the blanket /api rate limiter already applied in server.js.
router.post('/visit', async (req, res, next) => {
  try {
    const platform = req.body?.platform === 'mobile' ? 'mobile' : 'web';
    await SiteVisit.create({ platform });
    res.status(201).json({ success: true });
  } catch (err) {
    // Never let a tracking ping surface as a user-facing error.
    res.status(200).json({ success: false });
  }
});

export default router;
