import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    currency: { type: String, default: 'ZMW' },
    // Special-occasion discounts, seller-controlled. A sale is active exactly
    // while both fields are set AND saleEndsAt is in the future — no cron job
    // needed, it just quietly stops applying once the date passes.
    salePrice: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (v) {
          return v == null || v < this.price;
        },
        message: 'Sale price must be lower than the regular price.',
      },
    },
    saleEndsAt: { type: Date, default: null },
    images: [{ type: String }],
    category: { type: String, default: 'general', lowercase: true },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    deactivatedReason: { type: String, enum: ['admin_close', 'owner_close', 'account_deletion', null], default: null },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Whether a sale is currently in effect — computed at read time, never stored,
// so it's always correct without any scheduled job to "turn it off".
productSchema.virtual('onSale').get(function () {
  return !!(this.salePrice != null && this.saleEndsAt && this.saleEndsAt > new Date());
});

// The price that should actually be charged right now. Every place that
// shows a price to a buyer or computes a cart/order total should read THIS,
// not `price` directly, or a sale won't be honoured at checkout.
productSchema.virtual('effectivePrice').get(function () {
  return this.onSale ? this.salePrice : this.price;
});

productSchema.index({ name: 'text', description: 'text' }, { weights: { name: 10, description: 1 } });
productSchema.index({ business: 1, isActive: 1 });
// Supports the default shop browse: active products, optionally by
// category, sorted newest-first. MongoDB can use a PREFIX of this index
// for the plain (no-category) case too, so one index covers both shapes.
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
