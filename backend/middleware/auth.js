import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.suspended) {
      return res.status(403).json({ success: false, message: 'This account has been suspended. Contact hello@fugipay.com.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden for your role' });
  }
  next();
};


/** Attaches req.user when a valid token is present; never rejects. */
export const maybeAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && !user.suspended) req.user = user;
  } catch (_e) {
    // invalid/expired token on a public route: proceed anonymously
  }
  next();
};
