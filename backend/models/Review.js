import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.statics.recalcProductRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const Product = mongoose.model('Product');
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0,
    ratingCount: stats[0] ? stats[0].count : 0,
  });
};

reviewSchema.post('save', function () {
  this.constructor.recalcProductRating(this.product);
});

export default mongoose.model('Review', reviewSchema);
