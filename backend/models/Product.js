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
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ business: 1, isActive: 1 });

export default mongoose.model('Product', productSchema);
