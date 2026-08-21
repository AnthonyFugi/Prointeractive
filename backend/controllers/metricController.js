import Metric from '../models/Metric.js';

/**
 * A closed list. Anything not named here is ignored rather than stored,
 * so a public endpoint can't be used to write arbitrary keys into the
 * database or to inflate a metric that matters.
 */
const ALLOWED = new Set([
  'gate_shown',        // the picker appeared with the gate on
  'gate_completed',    // categories chosen and saved
  'gate_skipped',      // dismissed (only possible when ungated)
  'welcome_shown',
  'welcome_browsed',   // "Look around first"
  'follow_intent',     // signed-out shopper tapped Follow
]);

const today = () => new Date().toISOString().slice(0, 10);

/**
 * POST /api/metrics  { key }
 * Public and unauthenticated by design — the whole point is measuring
 * signed-out visitors. Returns 204 always; a metrics failure must never be
 * visible to a shopper.
 */
export const recordMetric = async (req, res) => {
  try {
    const key = String(req.body?.key || '');
    if (ALLOWED.has(key)) {
      await Metric.updateOne(
        { key, day: today() },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('[metric]', err.message);
  }
  return res.status(204).end();
};

/**
 * GET /api/metrics/funnel?days=14  (admin)
 * The number that actually matters is the completion rate — of everyone who
 * met the gate, how many got through it.
 */
export const onboardingFunnel = async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days) || 14, 90);
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const rows = await Metric.find({ day: { $gte: from } }).sort('day');
    const totals = rows.reduce((acc, r) => {
      acc[r.key] = (acc[r.key] || 0) + r.count;
      return acc;
    }, {});

    const shown = totals.gate_shown || 0;
    const completed = totals.gate_completed || 0;

    res.json({
      success: true,
      days,
      totals,
      completionRate: shown ? Math.round((completed / shown) * 100) : null,
      // Read this before deciding whether the gate stays. Below ~80% and the
      // friction is costing more first visits than the personalisation is worth.
      byDay: rows.map((r) => ({ day: r.day, key: r.key, count: r.count })),
    });
  } catch (err) {
    next(err);
  }
};
