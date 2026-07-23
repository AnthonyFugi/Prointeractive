import mongoose from 'mongoose';

const corporateLeadSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 120 },
    contactName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, maxlength: 30 },
    needs: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export default mongoose.model('CorporateLead', corporateLeadSchema);
