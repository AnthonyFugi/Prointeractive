import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { welcomeEmail } from '../utils/email.js';

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
    const { name, email, password, role } = req.body;
    const safeRole = role === 'business' ? 'business' : 'customer'; // never allow self-made admins
    const user = await User.create({ name, email, password, role: safeRole });
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
