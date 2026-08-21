import mongoose from 'mongoose';

/**
 * Daily event counters.
 *
 * Exists to answer one question we currently guess at: does the interest gate
 * help or cost us? It's a real trade — the gate buys personalisation data at
 * the price of friction on a first visit, and nobody can tell which way that
 * nets out without numbers.
 *
 * Deliberately a counter, not an event log. One document per key per day means
 * the collection stays tiny, nothing personal is stored, and no individual
 * shopper can be reconstructed from it.
 */
const metricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    // YYYY-MM-DD, so a day's bucket is readable straight out of the database.
    day: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

metricSchema.index({ key: 1, day: 1 }, { unique: true });

export default mongoose.model('Metric', metricSchema);
