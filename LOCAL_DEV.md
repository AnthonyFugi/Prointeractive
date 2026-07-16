# Local development

## Full-stack local (recommended)
Backend runs on your machine against the SAME Atlas database as production
(backend/.env already points there — local == live data).

    # terminal 1
    cd backend && npm run dev        # API on http://localhost:5001 (5000 is taken by macOS AirPlay)

    # terminal 2
    cd frontend && npm run dev       # app on http://localhost:5173

frontend/.env.development points dev at localhost:5000 automatically.

## Frontend-only against the live API
    cd frontend
    VITE_API_URL=https://prointeractive.onrender.com npm run dev

(The server always accepts http://localhost:* origins, so no CORS changes needed.)

## Caveats when local
- Flutterwave webhooks go to the RENDER URL — an online payment made against a
  local backend will not flip to "paid" locally. Test payments on the live site.
- You share the production database: whatever you create/edit locally is REAL.
  Use obvious test names and clean up after.
- Push notifications fire from whichever backend creates the order.

## Before pushing
    cd backend && node -e "process.env.JWT_SECRET='t';process.env.MONGO_URI='mongodb://127.0.0.1/x';import('./server.js').then(()=>setTimeout(()=>process.exit(0),1500))"
    cd frontend && npm run build
Then deploy, then the smoke ritual: home -> directory -> storefront -> product -> cart.
