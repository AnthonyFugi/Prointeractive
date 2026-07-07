import Inquiry from '../models/Inquiry.js';
import Business from '../models/Business.js';
import { inquiryEmail } from '../utils/email.js';

// POST /api/inquiries  (customer starts a thread with a business)
export const createInquiry = async (req, res, next) => {
  try {
    const { businessId, productId, subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message required' });
    }
    const business = await Business.findById(businessId).populate('owner', 'email');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const inquiry = await Inquiry.create({
      customer: req.user._id,
      business: business._id,
      product: productId || undefined,
      subject,
      messages: [{ sender: req.user._id, body: message }],
    });
    inquiryEmail({
      to: business.owner?.email,
      fromName: req.user.name,
      subject,
      preview: message,
      inquiryId: inquiry._id,
    });

    res.status(201).json({ success: true, inquiry });
  } catch (err) {
    next(err);
  }
};

// GET /api/inquiries  (my threads: as customer, or as business owner)
export const listInquiries = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    const filter = business
      ? { $or: [{ customer: req.user._id }, { business: business._id }] }
      : { customer: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const inquiries = await Inquiry.find(filter)
      .populate('business', 'name slug')
      .populate('customer', 'name')
      .populate('product', 'name price')
      .sort('-updatedAt');
    res.json({ success: true, inquiries });
  } catch (err) {
    next(err);
  }
};

const canAccess = async (inquiry, user) => {
  if (inquiry.customer.equals(user._id) || user.role === 'admin') return true;
  const business = await Business.findOne({ owner: user._id });
  return business && inquiry.business.equals(business._id);
};

// GET /api/inquiries/:id
export const getInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('business', 'name slug')
      .populate('customer', 'name')
      .populate('product', 'name price images')
      .populate('messages.sender', 'name role');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (!(await canAccess(inquiry, req.user))) {
      return res.status(403).json({ success: false, message: 'Not your conversation' });
    }
    res.json({ success: true, inquiry });
  } catch (err) {
    next(err);
  }
};

// POST /api/inquiries/:id/messages  (reply in a thread)
export const replyInquiry = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (!(await canAccess(inquiry, req.user))) {
      return res.status(403).json({ success: false, message: 'Not your conversation' });
    }
    if (inquiry.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Thread is closed' });
    }

    inquiry.messages.push({ sender: req.user._id, body: message });
    const senderIsCustomer = inquiry.customer.equals(req.user._id);
    if (!senderIsCustomer) inquiry.status = 'answered';
    await inquiry.save();

    // Notify the other party
    let recipientEmail;
    if (senderIsCustomer) {
      const biz = await Business.findById(inquiry.business).populate('owner', 'email');
      recipientEmail = biz?.owner?.email;
    } else {
      const buyer = await (await import('../models/User.js')).default
        .findById(inquiry.customer).select('email');
      recipientEmail = buyer?.email;
    }
    inquiryEmail({
      to: recipientEmail,
      fromName: req.user.name,
      subject: inquiry.subject,
      preview: message,
      inquiryId: inquiry._id,
    });

    res.status(201).json({ success: true, inquiry });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/inquiries/:id/close
export const closeInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (!(await canAccess(inquiry, req.user))) {
      return res.status(403).json({ success: false, message: 'Not your conversation' });
    }
    inquiry.status = 'closed';
    await inquiry.save();
    res.json({ success: true, inquiry });
  } catch (err) {
    next(err);
  }
};
