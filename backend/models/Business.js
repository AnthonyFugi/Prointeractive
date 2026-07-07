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
    category: {
      type: String,
      enum: [
        'retail', 'food', 'fashion', 'electronics', 'services',
        'agriculture', 'health', 'education', 'other',
      ],
      default: 'other',
    },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    verified: { type: Boolean, default: false },
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

businessSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug =
      this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' + this._id.toString().slice(-4);
  }
  next();
});

export default mongoose.model('Business', businessSchema);
