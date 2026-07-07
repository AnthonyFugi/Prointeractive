# Prointeractive — Frontend (React + Vite)

The client for the Prointeractive API: catalog, storefronts, cart/checkout, order tracking, inquiry inbox, and a seller dashboard.

## Setup

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173 (proxies /api → http://localhost:5000)
```

Run the backend first (`npm run dev` in `backend/`). If you seeded it, sign in as
`customer@demo.com` or `seller@demo.com` (password `password123`).

## Pages

| Route | What it does |
|---|---|
| `/` | Catalog: search, category chips, pagination |
| `/products/:id` | Product detail: add to cart, ask the seller, reviews |
| `/businesses`, `/businesses/:id` | Directory and public storefronts with direct messaging |
| `/cart`, `/checkout` | Cart grouped by business; checkout places one order per business |
| `/orders` | Customer order history with cancel-while-pending |
| `/inbox`, `/inbox/:id` | Inquiry threads — the business-interaction core |
| `/dashboard` | Seller: create storefront, manage products, advance order statuses |

## Design system

- Brand palette (from the logo): black `#000000` ink, red `#BC0000` for prices and primary actions, navy `#002368` for identity, links, and secondary actions, on white
- Logo: `public/logo.png` (navbar) and `public/favicon.png`, auto-cropped with transparent background
- Type: Bricolage Grotesque (display) + Karla (body), via Google Fonts
- Signature: the `Pro·interactive` red interpunct, and the "Ask the seller" affordance on every product card
- Accessibility floor: visible focus rings, labeled inputs, `prefers-reduced-motion` respected, responsive to mobile

## Notes / next steps

- Auth token is kept in `localStorage` (`pi_token`); cart persists in `localStorage` (`pi_cart`).
- The seller dashboard currently identifies your business by scanning the public list — a dedicated `GET /api/businesses/mine` endpoint on the backend would be a clean follow-up.
- Product photos upload from the seller dashboard straight to S3 via presigned URLs (configure AWS env vars on the backend first).
- Natural next features: real payment integration (mobile money APIs) and admin verification of businesses.
