# Prointeractive

**Making business interaction, Easy!**

An e-commerce marketplace where every product comes with a direct line to the business behind it — browse, buy, and talk to sellers in one place. Built on the MERN stack (MongoDB, Express, React, Node).

```
prointeractive/
├── backend/     Express API — auth, catalog, orders, inquiries, S3 uploads
├── frontend/    React (Vite) client
├── Dockerfile   Multi-stage production image (frontend build + API)
└── docker-compose.yml
```

## Run locally (development)

```bash
# Terminal 1 — API
cd backend && npm install
cp .env.example .env        # set MONGO_URI + JWT_SECRET
npm run seed                # optional demo data
npm run dev                 # http://localhost:5000

# Terminal 2 — client
cd frontend && npm install
npm run dev                 # http://localhost:5173, proxies /api
```

## Deploy to Render (recommended)

The repo includes a `render.yaml` blueprint. Deployment is:

1. **MongoDB Atlas** — create a free M0 cluster (choose AWS **Frankfurt** to sit next to the Render service). Create a database user, allow network access from anywhere (`0.0.0.0/0`) or Render's outbound IPs, and copy the connection string (add `/prointeractive` before the `?` as the db name).
2. **Render** — New → **Blueprint** → connect this GitHub repo. Render reads `render.yaml`, creates the service (Starter plan, Frankfurt, always-on), and auto-generates `JWT_SECRET`.
3. Paste the remaining secrets in the service's **Environment** tab: `MONGO_URI` (Atlas), the AWS keys + `S3_BUCKET`, and later `FLW_SECRET_KEY` + `FLW_WEBHOOK_HASH` and SMTP values.
4. First deploy runs automatically; every push to `main` redeploys. Health checks hit `/api/health`.
5. After deploy: add your Render URL to the S3 bucket's CORS `AllowedOrigins`, set Flutterwave's webhook to `https://<your-service>.onrender.com/api/payments/webhook`, and run the admin bootstrap once from Render's **Shell** tab: `npm run create-admin -- admin@yourdomain.com "password" "Name"`.

`APP_URL` resolves automatically on Render (via `RENDER_EXTERNAL_URL`); set it explicitly only when you attach a custom domain.

## Run in production (self-hosted Docker)

One container serves both the API and the built frontend; Mongo runs alongside it.

```bash
# 1. Create the env file Docker Compose reads
cat > .env << 'ENV'
JWT_SECRET=<paste 32+ random characters, e.g. from: openssl rand -hex 32>
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=prointeractive-uploads
ENV

# 2. Build and start
docker compose up -d --build

# App is on http://localhost:5000 — put nginx/Caddy or a cloud load
# balancer with TLS in front of it for a public deployment.
```

## Payments (Flutterwave)

Checkout with mobile money or card runs through Flutterwave's hosted payment page. The flow: order placed (`pending`) → customer redirected to Flutterwave → Flutterwave calls our **webhook** and the customer lands on `/payment/callback` → the server **re-verifies the transaction with Flutterwave's API** (amount, currency, status) before marking the order `paid`. Both paths are idempotent; the client is never trusted.

Setup:
1. Create a Flutterwave account, grab the **secret key** (`FLWSECK_TEST-...` for sandbox) into `FLW_SECRET_KEY`.
2. In the Flutterwave dashboard, set the webhook URL to `https://yourdomain.com/api/payments/webhook` and set a **secret hash** — put the same value in `FLW_WEBHOOK_HASH`.
3. Set `APP_URL` to your public frontend origin (used for the redirect back).
4. Test with sandbox keys first — test-mode mobile money auto-authorizes after a few seconds.

Cash on delivery stays available and is settled directly between customer and business (sellers mark those paid manually in the dashboard).

### Split payments & platform commission

Every business connects a settlement bank account from **Dashboard → Payouts** (bank list pulled live from Flutterwave). This registers a Flutterwave **subaccount**; from then on, every online payment for that business is split automatically at charge time — the seller's share settles to their bank on Flutterwave's settlement cycle, and the platform keeps `PLATFORM_FEE_PERCENT` (default 5%). No manual transfers.

If a seller hasn't connected an account yet, checkout still works: the full amount lands in the platform account and the Payment record is flagged for manual settlement.

Two operational notes: changing `PLATFORM_FEE_PERCENT` applies to subaccounts created/updated after the change (existing sellers update on their next payout-account edit), and as the marketplace owner you're responsible for vetting merchants — disputes and chargebacks are logged against the platform account, which is exactly what the admin panel's business verification is for.

## Email notifications

Transactional emails fire on: welcome (registration), order placed (customer + seller), order status changes (customer), and new inquiry messages (the other party). Configure any SMTP provider (Amazon SES, Mailtrap, Gmail, etc.) via `SMTP_*` vars in `backend/.env`, plus `APP_URL` so email buttons link to your real domain. Leave `SMTP_HOST` empty and emails become no-ops (logged, never blocking) — safe for development.

## Admin panel

Create the first admin (self-registration can never produce one):

```bash
cd backend && npm run create-admin -- admin@yourdomain.com "AStrongPassword" "Your Name"
```

Sign in and open `/admin` for platform stats (users, businesses, orders, revenue), **business verification** (the ✓ badge customers see), a user directory, and a recent-orders feed.

## CI/CD (GitHub Actions)

- **`ci.yml`** — on every push and PR: backend syntax checks + router smoke test, frontend production build (artifact uploaded), and a Docker image build with layer caching.
- **`deploy.yml`** — on push to `main`: builds and publishes the image to GitHub Container Registry as `ghcr.io/<you>/<repo>:latest` and `:<sha>`. An optional SSH auto-deploy job is included, commented out — add `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY` secrets and uncomment to enable.

Note: commit both `package-lock.json` files — CI's `npm ci` depends on them.

## Production hardening included

- **Security headers** via helmet, gzip via compression, request logging via morgan
- **Rate limiting**: 500 req / 15 min per IP on the API, 30 / 15 min on auth endpoints (brute-force protection)
- **Fail-fast config validation**: the server refuses to boot without `MONGO_URI` and `JWT_SECRET`, and requires a 32+ character secret in production
- **CORS allowlist** via `CORS_ORIGIN` (comma-separated origins)
- **Graceful shutdown** on SIGTERM/SIGINT (clean deploys and container restarts)
- **Container hygiene**: multi-stage build, dev dependencies excluded, runs as non-root `node` user, Docker healthcheck on `/api/health`
- Mongo is **not exposed to the host** by default in compose — only the app reaches it

## Launch checklist

- [ ] Generate a strong `JWT_SECRET` (`openssl rand -hex 32`) — never reuse the example value
- [ ] Set `CORS_ORIGIN` to your real domain(s)
- [ ] Point `MONGO_URI` at a managed/replicated MongoDB (Atlas or self-hosted with backups) for anything beyond a single-server setup
- [ ] Create the S3 bucket; add CORS allowing `PUT` from your domain; public read on `products/*` or serve via CloudFront
- [ ] Put TLS in front (nginx, Caddy, or your cloud's load balancer) — the app trusts one proxy hop (`trust proxy`)
- [ ] Set up log collection and uptime monitoring against `/api/health`
- [ ] Schedule Mongo backups (the compose volume `mongo_data` is your data)

## Roadmap candidates

Split payments/subaccounts (route each order's money to the seller automatically with a platform fee), payouts to sellers, and refund handling from the admin panel.
