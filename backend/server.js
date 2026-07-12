import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

// ---- Fail fast on missing configuration ----
const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
if (isProd && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // behind nginx / a load balancer

// ---- Security & performance middleware ----
app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

// General API limit + stricter limit for credential endpoints
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again in a few minutes.' } }));

app.get('/api/health', (req, res) =>
  res.json({ success: true, name: 'Prointeractive API', time: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// ---- Serve the built frontend in production ----
if (isProd) {
  const dist = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(dist, { maxAge: '1d', index: false }));

  // Rich link previews: inject per-business Open Graph tags server-side so
  // crawlers (WhatsApp, Facebook, X) see the business, not the bare domain.
  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let indexHtmlCache = null;
  const loadIndexHtml = () => {
    if (!indexHtmlCache) indexHtmlCache = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    return indexHtmlCache;
  };

  app.get('/businesses/:idOrSlug', async (req, res) => {
    const html = loadIndexHtml();
    try {
      const { default: Business } = await import('./models/Business.js');
      const { idOrSlug } = req.params;
      const business = (
        /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? await Business.findById(idOrSlug) : null
      ) || await Business.findOne({ slug: idOrSlug.toLowerCase() });

      if (!business || business.closed) return res.send(html);

      const base = process.env.APP_URL || 'https://proint.web.app';
      const title = escapeHtml(`${business.name} — on Prointeractive`);
      const desc = escapeHtml(
        business.description ||
        `${business.name} sells on Prointeractive. Browse products, ask questions, and pay your way.`
      );
      const url = `${base}/businesses/${business.slug || business._id}`;
      const image = business.logoUrl || `${base}/og-image.png`;

      const out = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/(property="og:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(property="og:image" content=")[^"]*(")/, `$1${escapeHtml(image)}$2`)
        .replace(/(name="twitter:image" content=")[^"]*(")/, `$1${escapeHtml(image)}$2`)
        .replace(/(name="description" content=")[^"]*(")/, `$1${desc}$2`);
      res.send(out);
    } catch (_err) {
      res.send(html);
    }
  });

  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () =>
    console.log(`Prointeractive API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
  );

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received: closing server…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
