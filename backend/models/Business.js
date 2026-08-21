import mongoose from 'mongoose';
import { normalizePhone } from '../utils/phone.js';

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
    /**
     * Slugs this business used to have.
     *
     * Changing a slug silently breaks every link already shared — in a WhatsApp
     * group, in a printed flyer, in a Google result. Keeping the old ones and
     * falling back to them on lookup means a correction costs nobody a visit.
     */
    previousSlugs: { type: [String], default: [], index: true },
    description: { type: String, default: '' },
    category: { type: String, lowercase: true, trim: true }, // legacy single value (kept in sync = categories[0])
    categories: { type: [String], default: [] },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    verificationRequested: { type: Boolean, default: false },
    verificationRequestedAt: Date,
    closed: { type: Boolean, default: false },
    closedBy: { type: String, enum: ['admin', 'owner', null], default: null },
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

// Same normalisation as User.phone, so a number stored as typed doesn't
// produce a dead link for some sellers and a working one for others.
businessSchema.pre('save', function (next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = normalizePhone(this.phone) || this.phone;
  }
  next();
});

// Slug is generated once and never changes on rename — printed and shared
// links stay valid even if the business renames. Suffix added only when the
// clean slug is taken.
//
// Deliberately no auto-regeneration: a slug that shifts under a shared link is
// a broken link. When a slug genuinely needs correcting (created under a
// placeholder name, say), scripts/fixBusinessSlug.js does it explicitly and
// records the old one in previousSlugs so the old URL keeps resolving.
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
