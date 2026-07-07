# Prointeractive — Backend (Express + MongoDB)

E-commerce platform with built-in business interactions: businesses sell products, customers buy, and both sides communicate through inquiry threads and reviews.

## Setup

```bash
cd backend
npm install
cp .env.example .env    # then edit MONGO_URI and JWT_SECRET
npm run seed            # optional: demo users, business, products
npm run dev             # starts on http://localhost:5000
```

Demo logins after seeding: `customer@demo.com` and `seller@demo.com` (password: `password123`).

## Architecture

```
backend/
├── server.js            # App entry: middleware, route mounting
├── config/db.js         # Mongoose connection
├── models/              # User, Business, Product, Order, Inquiry, Review
├── controllers/         # Business logic per resource
├── routes/              # Express routers
├── middleware/          # JWT auth, role guard, error handling
└── utils/seed.js        # Demo data
```

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | /register | Public | `{ name, email, password, role: "customer"\|"business" }` |
| POST | /login | Public | Returns JWT |
| GET | /me | Bearer token | Current user |

### Businesses — `/api/businesses`
| Method | Path | Access |
|---|---|---|
| GET | / | Public (filters: `category`, `q`, `page`, `limit`) |
| POST | / | Business role — one profile per account |
| GET | /:id | Public |
| PATCH | /:id | Owner or admin |
| GET | /payout | Owner — settlement account status + platform fee |
| PUT | /payout | Owner — connect/update settlement bank account (creates a Flutterwave subaccount with the platform commission baked in) |

### Products — `/api/products`
| Method | Path | Access |
|---|---|---|
| GET | / | Public (`q` text search, `category`, `business`, `minPrice`, `maxPrice`, `sort`, pagination) |
| POST | / | Business role (requires business profile) |
| GET | /:id | Public |
| PATCH | /:id | Owning business |
| DELETE | /:id | Owning business (soft delete) |
| GET | /:productId/reviews | Public |
| POST | /:productId/reviews | Verified buyers (delivered order) only |

### Orders — `/api/orders`
| Method | Path | Access |
|---|---|---|
| POST | / | Customer — `{ items: [{productId, quantity}], shippingAddress, paymentMethod }` |
| GET | /mine | Customer's own orders |
| GET | /business | Orders received by my business |
| GET | /:id | Buyer, seller, or admin |
| PATCH | /:id/status | Seller advances; customer may cancel while pending |

Order lifecycle: `pending → paid → shipped → delivered` (cancellable until shipped; stock is restocked on cancel).

### Uploads — `/api/uploads`
| Method | Path | Access |
|---|---|---|
| POST | /presign | Business role — `{ contentType, fileSize }` returns `{ uploadUrl, publicUrl }` |

Images upload directly from the browser to S3 via a 5-minute presigned PUT URL (JPEG/PNG/WebP, max 5 MB); the server never proxies image bytes. Requires `AWS_REGION`, `S3_BUCKET`, and AWS credentials in `.env` (or an IAM role when deployed). The bucket needs public read on `products/*` (or serve via CloudFront) and CORS allowing PUT from your frontend origin.

### Payments — `/api/payments`
| Method | Path | Access |
|---|---|---|
| POST | /checkout/:orderId | Customer — returns a Flutterwave hosted checkout `link` for their pending order |
| GET | /verify?tx_ref&transaction_id | Customer — redirect landing; server re-verifies with Flutterwave |
| POST | /webhook | Flutterwave (authenticated by `verif-hash` header matching `FLW_WEBHOOK_HASH`) |
| GET | /banks?country=ZM | Business role — Flutterwave bank list for payout setup |

Orders only transition to `paid` after server-side verification of status, amount, and currency against Flutterwave's API. A successful charge landing on a cancelled order is flagged in the Payment record for manual refund review.

### Inquiries (business interactions) — `/api/inquiries`
| Method | Path | Access |
|---|---|---|
| POST | / | Customer starts a thread with a business (optionally about a product) |
| GET | / | My threads (as customer or business owner) |
| GET | /:id | Participants only |
| POST | /:id/messages | Reply in thread |
| PATCH | /:id/close | Either participant |

## Design decisions

- **JWT auth** with role-based guards (`customer`, `business`, `admin`); self-registration can never create admins.
- **Price/name snapshots** on order items so historical orders survive product edits.
- **Stock is validated and decremented** at order time, restocked on cancellation.
- **Reviews are purchase-verified**: only customers with a delivered order containing the product can review, one review per user per product, and product ratings recalculate automatically.
- **Inquiries** model the "business interactions" pillar: threaded messages between customer and business, with open/answered/closed states.
- **Soft deletes** for products (`isActive`) so order history never breaks.
- Currency defaults to ZMW and payment methods include mobile money — adjust in the models if targeting other markets.

## Next steps (frontend)

React (Vite) client consuming this API: auth pages, product catalog with search, business storefronts, cart/checkout, order tracking, and the inquiry inbox.
# Prointeractive
