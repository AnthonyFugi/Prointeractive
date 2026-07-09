import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },       // snapshot at purchase time
    price: { type: Number, required: true },      // snapshot at purchase time
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'Order must contain at least one item'],
    },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZMW' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      line1: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    paymentMethod: {
      type: String,
      enum: ['mobile_money', 'card', 'cash_on_delivery'],
      default: 'cash_on_delivery',
    },
    paidAt: Date,
    deliveredAt: Date,
    platformFee: {
      percent: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      // pending: sale not final · collected: taken via Flutterwave split
      // due: owed by seller (COD / off-platform payment) · settled: seller has paid it
      status: {
        type: String,
        enum: ['pending', 'collected', 'due', 'settled'],
        default: 'pending',
      },
    },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ business: 1, status: 1 });

export default mongoose.model('Order', orderSchema);
