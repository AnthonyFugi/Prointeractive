import mongoose from 'mongoose';
import { normalizePhone } from '../utils/phone.js';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [
        function () { return !this.googleId && !this.appleId; },
        'Password is required',
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    googleId: { type: String, default: null, index: true, sparse: true },
    appleId: { type: String, default: null, index: true, sparse: true },
    role: {
      type: String,
      enum: ['customer', 'business', 'admin'],
      default: 'customer',
    },
    avatarUrl: { type: String, default: '' },
    termsAcceptedAt: { type: Date },
    /**
     * Stored in E.164 (+260977123456), normalised on save.
     *
     * Optional rather than required at sign-up: this is the same friction
     * argument as the interest gate, and a phone field is a bigger ask than a
     * category tap. It's collected at checkout anyway (shippingAddress.phone),
     * prompted for in Account, and backfilled from past orders — so coverage
     * comes from where people already give it, not from a wall at the door.
     */
    phone: { type: String, default: '', trim: true },
    expoPushToken: { type: String, default: '' },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    favoriteBusinesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
    favoriteProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    preferences: {
      currency: { type: String, enum: ['ZMW', 'USD'], default: 'ZMW' },
      city: { type: String, trim: true, maxlength: 60, default: '' },
    },
    // Category names the shopper picked during onboarding. Used to weight
    // their feed and to suggest stores worth following. Validated against the
    // live Category list on write, so a renamed category can't rot in here.
    interests: { type: [String], default: [] },
    // Onboarding is offered once, never forced. `skippedAt` is recorded so we
    // don't nag someone who has already said no thanks; `completedAt` so we
    // don't re-ask someone who has already chosen.
    onboarding: {
      completedAt: { type: Date, default: null },
      skippedAt: { type: Date, default: null },
    },
    /**
     * Learned category affinity, keyed by category name.
     *
     * `interests` is a one-time tick — someone who chose "electronics" in
     * month one looks identical forever. This is the signal that compounds:
     * viewing, carting and buying all move it, so by month two the feed
     * reflects what a shopper actually does rather than what they once said.
     *
     * Scores decay on read (see decayedAffinity) rather than on a schedule,
     * so a phase someone has moved past fades without needing a cron job.
     */
    categoryAffinity: {
      type: Map,
      of: new mongoose.Schema(
        { score: { type: Number, default: 0 }, updatedAt: { type: Date, default: Date.now } },
        { _id: false }
      ),
      default: () => new Map(),
    },
    // Last time the shopper looked at their "new from stores you follow" strip.
    // Drives the unseen count without storing a row per product per user.
    lastFollowFeedSeenAt: { type: Date, default: null },
    suspended: { type: Boolean, default: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // Audit trail for admin-initiated resets. Any admin able to reset a
    // seller's password can reach that seller's payout details, so every use
    // is recorded against the account and the user is emailed about it.
    lastAdminPasswordReset: {
      at: { type: Date, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
  },
  { timestamps: true }
);

// Hash password before save
// One canonical shape for every number, whatever the user typed. Without
// this, "0977123456" and "+260 97 712 3456" are different strings and a
// WhatsApp link works for one and fails for the other.
userSchema.pre('save', function (next) {
  if (this.isModified('phone') && this.phone) {
    const normalized = normalizePhone(this.phone);
    // Keep the raw value if it can't be parsed rather than silently wiping
    // what someone typed — Account shows it back to them to correct.
    this.phone = normalized || this.phone;
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
