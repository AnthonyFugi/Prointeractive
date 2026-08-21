import mongoose from 'mongoose';
import { listPriceFromBase, baseFromListPrice } from '../utils/pricing.js';

const productSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    description: { type: String, default: '' },
    // What the seller wants to RECEIVE. This is the number sellers type in;
    // `price` below is derived from it, never entered directly.
    basePrice: { type: Number, min: 0 },
    // What the buyer pays — seller's target grossed up so that the platform
    // commission comes out of it and the seller still nets `basePrice`.
    // Kept as the canonical `price` field on purpose: every downstream reader
    // (cards, search, cart, checkout, Flutterwave, OG tags) is unchanged.
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
    // Seller's target take during a sale; `salePrice` is derived from it,
    // exactly as basePrice -> price above.
    baseSalePrice: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (v) {
          return v == null || this.basePrice == null || v < this.basePrice;
        },
        message: 'Your sale take-home must be lower than your regular take-home.',
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

// Derive shelf prices from the seller's target take-home, before validation
// runs (so the salePrice < price check below sees the computed values).
//
// Two directions, deliberately:
//   basePrice set  -> compute price   (the normal path: seller states a target)
//   price set only -> derive basePrice (admin setting a shelf price directly,
//                     and older app builds still in the stores that post
//                     `price` — those keep working with unchanged behaviour)
productSchema.pre('validate', function (next) {
  // Which number the caller actually meant. Controllers set this explicitly
  // ($locals is per-operation and never persisted); isModified() alone can't
  // tell, because a doc that was just constructed reports every field as
  // modified, and the hook's own writes count as modifications too.
  const source = this.$locals.priceSource;

  if (source === 'list' && this.price != null) {
    this.basePrice = baseFromListPrice(this.price);
  } else if (source === 'base' && this.basePrice != null) {
    this.price = listPriceFromBase(this.basePrice);
  } else if (this.isModified('basePrice') && this.basePrice != null) {
    this.price = listPriceFromBase(this.basePrice);
  } else if (this.isModified('price') && this.price != null) {
    this.basePrice = baseFromListPrice(this.price);
  } else if (this.basePrice == null && this.price != null) {
    // A pre-migration listing being saved for some unrelated reason — fill in
    // the missing base without touching the price buyers already see.
    this.basePrice = baseFromListPrice(this.price);
  }

  const saleSource = this.$locals.salePriceSource;
  if (saleSource === 'list') {
    this.baseSalePrice = this.salePrice == null ? null : baseFromListPrice(this.salePrice);
  } else if (saleSource === 'base') {
    this.salePrice = this.baseSalePrice == null ? null : listPriceFromBase(this.baseSalePrice);
  } else if (this.isModified('baseSalePrice')) {
    this.salePrice = this.baseSalePrice == null ? null : listPriceFromBase(this.baseSalePrice);
  } else if (this.isModified('salePrice')) {
    this.baseSalePrice = this.salePrice == null ? null : baseFromListPrice(this.salePrice);
  } else if (this.baseSalePrice == null && this.salePrice != null) {
    this.baseSalePrice = baseFromListPrice(this.salePrice);
  }
  next();
});

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

// What the seller actually takes home on a sale right now — mirrors
// effectivePrice, honouring an active sale. Seller-facing views read this.
productSchema.virtual('sellerNet').get(function () {
  return this.onSale ? this.baseSalePrice : this.basePrice;
});

productSchema.index({ name: 'text', description: 'text' }, { weights: { name: 10, description: 1 } });
productSchema.index({ business: 1, isActive: 1 });
// Supports the default shop browse: active products, optionally by
// category, sorted newest-first. MongoDB can use a PREFIX of this index
// for the plain (no-category) case too, so one index covers both shapes.
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
