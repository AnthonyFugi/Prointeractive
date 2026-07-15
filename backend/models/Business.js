import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: [true, 'Business name is required'], trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, lowercase: true, trim: true },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    verificationRequested: { type: Boolean, default: false },
    verificationRequestedAt: Date,
    closed: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    payout: {
      accountBank: { type: String, default: '' },   // Flutterwave bank code
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      subaccountId: { type: String, default: '' },  // RS_... used in charge payloads
      flwId: { type: Number },                      // numeric id, used for updates
    },
  },
  { timestamps: true }
);

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Slug is generated once and never changes — printed links stay valid even if
// the business renames. Suffix added only when the clean slug is taken.
businessSchema.pre('save', async function (next) {
  if (this.slug) return next();
  const base = slugify(this.name) || 'business';
  let candidate = base;
  let n = 2;
  while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
    candidate = `${base}-${n++}`;
  }
  this.slug = candidate;
  next();
});

export default mongoose.model('Business', businessSchema);
