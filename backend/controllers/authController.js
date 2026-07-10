import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { welcomeEmail, passwordResetEmail } from '../utils/email.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendAuth = (res, user, status = 200) => {
  res.status(status).json({
    success: true,
    token: signToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, acceptedTerms } = req.body;
    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        message: 'Please accept the Terms & Conditions to create an account',
      });
    }
    const safeRole = role === 'business' ? 'business' : 'customer'; // never allow self-made admins
    const user = await User.create({ name, email, password, role: safeRole, termsAcceptedAt: new Date() });
    welcomeEmail(user);
    sendAuth(res, user, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    sendAuth(res, user);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  const { _id, name, email, role, avatarUrl, createdAt } = req.user;
  res.json({ success: true, user: { id: _id, name, email, role, avatarUrl, createdAt } });
};


const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

// POST /api/auth/forgot-password  { email }
// Always responds the same way, so this endpoint can't be used to
// discover which emails are registered.
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericReply = () =>
      res.json({ success: true, message: 'If that account exists, a reset link is on its way.' });

    if (!email) return genericReply();

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return genericReply();

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    passwordResetEmail({ to: user.email, name: user.name, token });
    return genericReply();
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password  { token, password }
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired. Request a new one.' });
    }

    user.password = password;               // hashed by the pre-save hook
    user.resetPasswordTokenHash = undefined; // single-use
    user.resetPasswordExpires = undefined;
    await user.save();

    sendAuth(res, user); // sign them straight in with a fresh JWT
  } catch (err) {
    next(err);
  }
};


// POST /api/auth/become-business  (self-service upgrade; customer -> business only)
export const becomeBusiness = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(400).json({ success: false, message: 'Only customer accounts can switch to business' });
    }
    req.user.role = 'business';
    await req.user.save();
    res.json({ success: true, user: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'business' } });
  } catch (err) {
    next(err);
  }
};


// POST /api/auth/push-token  { token }  — store the device's Expo push token
export const savePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
      return res.status(400).json({ success: false, message: 'Invalid push token' });
    }
    req.user.expoPushToken = token;
    await req.user.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
