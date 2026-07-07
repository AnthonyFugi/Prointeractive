import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * An Inquiry is a conversation thread between a customer and a business,
 * optionally attached to a specific product ("Is this in stock?", quote
 * requests, bulk pricing, etc.). This is the "business interactions" core.
 */
const inquirySchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ['open', 'answered', 'closed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

inquirySchema.index({ business: 1, status: 1, updatedAt: -1 });
inquirySchema.index({ customer: 1, updatedAt: -1 });

export default mongoose.model('Inquiry', inquirySchema);
