import { Router } from 'express';
import CorporateLead from '../models/CorporateLead.js';
import { sendEmail } from '../utils/email.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { company, contactName, email, phone, needs } = req.body;
    const lead = await CorporateLead.create({ company, contactName, email, phone, needs });
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'hello@fugipay.com',
      subject: `Corporate lead: ${company}`,
      text: contactName + ' <' + email + '> ' + (phone || '') + '\n\n' + (needs || ''),
    }).catch(() => {});
    res.status(201).json({ success: true, lead: { id: lead._id } });
  } catch (err) { next(err); }
});

export default router;
