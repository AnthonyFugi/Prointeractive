import mongoose from 'mongoose';

// Deliberately minimal: a visit is one ping per session/app-launch, not a
// per-page-view log. No path, no user, no cookie/fingerprint — just enough
// to answer "how many visits" for the admin analytics, nothing that reads
// as tracking an individual's behaviour.
const siteVisitSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['web', 'mobile'], required: true },
  },
  { timestamps: true }
);

siteVisitSchema.index({ createdAt: 1 });

export default mongoose.model('SiteVisit', siteVisitSchema);
