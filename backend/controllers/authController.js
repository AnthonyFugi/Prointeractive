import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Product from '../models/Product.js';
import Inquiry from '../models/Inquiry.js';
import { welcomeEmail, passwordResetEmail } from '../utils/email.js';

const googleClient = new OAuth2Client();

// Apple's public keys, fetched and cached by jose
const APPLE_KEYS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

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
    if (user && !user.password) {
      const provider = user.appleId ? 'Apple' : 'Google';
      return res.status(400).json({
        success: false,
        message: `This account uses ${provider} sign-in. Use the ${provider} button instead.`,
      });
    }
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
  const { _id, name, email, role, avatarUrl, createdAt, favoriteBusinesses = [], favoriteProducts = [], preferences } = req.user;
  res.json({
    success: true,
    user: { id: _id, name, email, role, avatarUrl, createdAt, favoriteBusinesses, favoriteProducts, preferences: preferences || { currency: 'ZMW', city: '' } },
  });
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


// POST /api/auth/block  { userId, blocked: true|false }
export const setBlocked = async (req, res, next) => {
  try {
    const { userId, blocked } = req.body;
    if (!userId || String(userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Invalid user' });
    }
    const op = blocked ? { $addToSet: { blockedUsers: userId } } : { $pull: { blockedUsers: userId } };
    await req.user.updateOne(op);
    res.json({ success: true, blocked: !!blocked });
  } catch (err) {
    next(err);
  }
};


// DELETE /api/auth/me  { password } — delete account + personal data.
// Orders are retained (anonymised) as financial records, per the Privacy Policy.
export const deleteMe = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (user.password) {
      if (!password || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Password is incorrect' });
      }
    } else if (req.body.confirm !== 'DELETE') {
      // Google-only accounts have no password: require a typed confirmation instead
      return res.status(400).json({ success: false, message: 'Type DELETE to confirm' });
    }

    // Conversations the user started as a customer
    await Inquiry.deleteMany({ customer: user._id });

    // Seller cleanup: hide the storefront and its products; keep records for order history
    const business = await Business.findOne({ owner: user._id });
    if (business) {
      await Product.updateMany({ business: business._id, isActive: true }, { isActive: false, deactivatedReason: 'account_deletion' });
      business.closed = true;
      await business.save();
    }

    await user.deleteOne();
    console.log(`[account deleted] ${user.email}`);
    res.json({ success: true, message: 'Account and personal data deleted' });
  } catch (err) {
    next(err);
  }
};


// PATCH /api/auth/preferences  { currency?, city? }
export const updatePreferences = async (req, res, next) => {
  try {
    const { currency, city } = req.body;
    if (currency !== undefined) {
      if (!['ZMW', 'USD'].includes(currency)) return res.status(400).json({ success: false, message: 'Invalid currency' });
      req.user.preferences = req.user.preferences || {};
      req.user.preferences.currency = currency;
    }
    if (city !== undefined) {
      req.user.preferences = req.user.preferences || {};
      req.user.preferences.city = String(city).trim().slice(0, 60);
    }
    await req.user.save();
    res.json({ success: true, preferences: req.user.preferences });
  } catch (err) { next(err); }
};


// ---------------------------------------------------------------------------
// Social sign-in (additive — the email/password flow above is unchanged)
// ---------------------------------------------------------------------------

// Links a verified social identity to an existing account, or creates a new one.
// Linking by email is only safe because the provider vouches that the email is verified.
const socialSignIn = async ({ res, provider, providerId, email, name, picture }) => {
  const idField = provider === 'apple' ? 'appleId' : 'googleId';
  const lookup = [{ [idField]: providerId }];
  if (email) lookup.push({ email });

  let user = await User.findOne({ $or: lookup });

  if (user) {
    let changed = false;
    if (!user[idField]) { user[idField] = providerId; changed = true; }
    if (!user.avatarUrl && picture) { user.avatarUrl = picture; changed = true; }
    if (changed) await user.save({ validateBeforeSave: false });
  } else {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'No email was shared by the provider. Please create an account with your email instead.',
      });
    }
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      [idField]: providerId,
      avatarUrl: picture || '',
      role: 'customer',
      termsAcceptedAt: new Date(),
    });
    welcomeEmail(user);
  }

  if (user.suspended) {
    return res.status(403).json({ success: false, message: 'This account is suspended.' });
  }

  return sendAuth(res, user, 200);
};

// POST /api/auth/google  { credential }
export const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (typeof credential !== 'string' || !credential.includes('.')) {
      console.error('[google-auth] no usable credential in body; keys =', Object.keys(req.body || {}));
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }
    const idToken = credential;

    const audience = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].map((v) => v && v.trim()).filter(Boolean);
    if (audience.length === 0) {
      return res.status(500).json({ success: false, message: 'Google sign-in is not configured' });
    }

    if (typeof idToken !== 'string' || !idToken.includes('.')) {
      console.error('[google-auth] no usable ID token; got type:', typeof idToken);
      return res.status(401).json({ success: false, message: 'Google did not return a usable identity token' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (err) {
      let tokenAud = 'unreadable';
      try {
        tokenAud = JSON.parse(
          Buffer.from(idToken.split('.')[1], 'base64').toString()
        ).aud;
      } catch (_e) { /* leave as unreadable */ }
      console.error(
        '[google-auth] ID token verification failed:', err?.message || err,
        '\n  token audience   :', tokenAud,
        '\n  accepted audience:', audience.join(', ') || '(none)',
      );
      return res.status(401).json({ success: false, message: 'Google sign-in could not be verified' });
    }

    if (!payload?.email_verified) {
      return res.status(401).json({ success: false, message: 'Your Google email is not verified' });
    }

    return socialSignIn({
      res,
      provider: 'google',
      providerId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name,
      picture: payload.picture,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/apple  { identityToken, name }
// Apple only sends the user's name on the FIRST authorisation, and only via the client,
// so `name` is optional and is used only when creating a new account.
export const appleAuth = async (req, res, next) => {
  try {
    const { identityToken, name } = req.body;
    if (!identityToken) {
      return res.status(400).json({ success: false, message: 'Missing Apple identity token' });
    }

    const audience = [
      process.env.APPLE_CLIENT_ID,   // Services ID (web)
      process.env.APPLE_BUNDLE_ID,   // app bundle identifier (iOS)
    ].map((v) => v && v.trim()).filter(Boolean);
    if (audience.length === 0) {
      return res.status(500).json({ success: false, message: 'Apple sign-in is not configured' });
    }

    let payload;
    try {
      const { payload: verified } = await jwtVerify(identityToken, APPLE_KEYS, {
        issuer: 'https://appleid.apple.com',
        audience,
      });
      payload = verified;
    } catch (_err) {
      return res.status(401).json({ success: false, message: 'Apple sign-in could not be verified' });
    }

    // Apple sends email_verified as a boolean or the string "true"
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const email = payload.email ? String(payload.email).toLowerCase() : null;
    if (email && !emailVerified) {
      return res.status(401).json({ success: false, message: 'Your Apple email is not verified' });
    }

    const fullName = name && typeof name === 'object'
      ? [name.firstName, name.lastName].filter(Boolean).join(' ').trim()
      : (typeof name === 'string' ? name.trim() : '');

    return socialSignIn({
      res,
      provider: 'apple',
      providerId: payload.sub,
      email,
      name: fullName || undefined,
    });
  } catch (err) {
    next(err);
  }
};
