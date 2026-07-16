import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    order: { type: Number, default: 9999 },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
