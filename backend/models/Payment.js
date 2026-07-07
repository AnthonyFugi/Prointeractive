import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    txRef: { type: String, required: true, unique: true },
    flwTransactionId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['initiated', 'successful', 'failed'],
      default: 'initiated',
    },
    channel: { type: String, default: '' }, // e.g. mobilemoneyzambia, card
    note: { type: String, default: '' },    // e.g. mismatch flags for manual review
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1 });

export default mongoose.model('Payment', paymentSchema);
