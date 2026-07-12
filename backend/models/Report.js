import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['product', 'business', 'review', 'inquiry', 'user'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ['spam', 'scam_or_fraud', 'abusive_content', 'inappropriate_content', 'counterfeit', 'other'],
      required: true,
    },
    details: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedAt: Date,
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
