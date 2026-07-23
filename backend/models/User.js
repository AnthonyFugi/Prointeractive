import mongoose from 'mongoose';
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
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'business', 'admin'],
      default: 'customer',
    },
    avatarUrl: { type: String, default: '' },
    termsAcceptedAt: { type: Date },
    expoPushToken: { type: String, default: '' },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    favoriteBusinesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
    favoriteProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    preferences: {
      currency: { type: String, enum: ['ZMW', 'USD'], default: 'ZMW' },
      city: { type: String, trim: true, maxlength: 60, default: '' },
    },
    suspended: { type: Boolean, default: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password before save
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
