# Restaurant Management & Ordering Ecosystem

Enterprise, API-first platform for restaurant ordering, delivery, CRM, POS and analytics.

## Monorepo layout

```
/apps
  /api      NestJS backend (REST + WebSocket, Prisma, Swagger)   🟢 Builds green
  /web      Next.js 14 customer app (App Router, Tailwind)        � Builds green
  /admin    React + Vite restaurant admin dashboard              ⏳ planned
  /rider    React PWA rider app                                  ⏳ planned
  /pos      React POS system                                     ⏳ planned
/packages
  /shared   Shared TS types, roles, constants, geo utils         ✅
  /ui       Shared UI component library                          ⏳ planned
/docker     Compose files, Nginx, backup scripts                 ✅
/docs       API / ARCHITECTURE / DEPLOYMENT                      ✅
```

> **Status (as of last session):** **Phase 1 + Phase 2 + Phase 3 core + Phase 4**
> skeleton are built and compile green. **Next.js 14** customer web app,
> **React + Vite** admin dashboard, and **Python FastAPI** AI microservice are
> all scaffolded and building. Remaining: rider PWA, POS React frontend.

## Tech stack

NestJS · TypeScript · PostgreSQL + PgBouncer · Prisma · Redis · Socket.IO ·
JWT (rotating) + OAuth2 + OTP (Twilio) · TOTP 2FA · Swagger · Docker · GitHub Actions.

## Run the storefront preview (no install, no DB)

```bash
# Customer web app (Next.js 14)
pnpm --filter @app/web dev    # http://localhost:3000

# Legacy static preview (zero-dep, still works)
node apps/web/server.mjs      # http://localhost:3000 (fallback)
```

## Quick start — full backend (local)

```bash
# 1. Install dependencies (pnpm workspace)
pnpm install                # if pnpm is missing: npm i -g pnpm@9

# 2. Create your env file
cp .env.example .env        # Windows: copy .env.example .env

# 3. Start infrastructure + API (Postgres, PgBouncer, Redis, Adminer, API)
pnpm docker:up              # requires Docker Desktop

# 4. Run migrations + seed (first time)
pnpm --filter @app/api prisma:migrate
pnpm --filter @app/api prisma:seed
```

To run the API outside Docker against the dockerised DB/Redis:

```bash
pnpm --filter @app/api prisma:generate
pnpm api:dev
```

- Storefront: http://localhost:3000
- API:        http://localhost:4000/api
- Swagger:    http://localhost:4000/api/docs
- Health:     http://localhost:4000/api/health
- Adminer:    http://localhost:8080

Seeded super admin: `superadmin@rms.local` / `SuperAdmin@123`.

> **No Docker?** Point `DATABASE_URL` / `DIRECT_URL` and `REDIS_*` in `.env` at a
> hosted Postgres + Redis (e.g. Neon + Upstash), then run `prisma:migrate`,
> `prisma:seed` and `pnpm api:dev`.

## What is implemented

### Platform & security
- Prisma schema with **all 40+ tables** from the spec.
- RBAC (6 roles) via global guards; audit-log interceptor → `audit_logs`.
- Helmet, CORS whitelist, Redis rate limiting, global validation/sanitisation.
- AES-256-GCM encryption for sensitive fields (unit-tested), bcrypt passwords.
- Swagger auto-docs (`/api/docs`), health checks (`/api/health`), Docker, CI.

### Authentication
- Customer register / login / OTP verify / password reset (OTP via Twilio).
- Rider register with CNIC (AES-256 encrypted) + pending-approval flow.
- Admin login with TOTP 2FA (Google Authenticator) + QR provisioning.
- JWT access (15m) + **rotating** refresh (7d, single-use) in httpOnly cookies.
- Google + Facebook OAuth2.

### Catalog
- Categories: public tree + featured + admin CRUD.
- Products: search / filter / pagination, variants, add-ons (admin CRUD).

### Branches & addresses
- Branch management (public list, admin CRUD).
- Customer saved addresses with default handling.

### Delivery
- Zone management + **distance-based fee engine** (Haversine geofencing):
  0–7 km free, 7–10 km Rs.200, 10 km+ disabled unless a per-km zone is enabled.
- Peak-hour pricing toggle (Redis-backed). `POST /api/delivery/quote`.

### Orders
- `POST /orders/checkout` — prices a cart (items + variants + add-ons +
  delivery fee + promo + loyalty) without committing.
- `POST /orders` — places order in a transaction (items + status log + KDS
  queue), consumes loyalty/promo, creates payment, broadcasts via WebSocket.
- Order history, detail with status timeline, status updates, reorder.

### Payments & wallet
- Wallet credit/debit with atomic ledger; gift-card issue/redeem.
- Payment records (wallet/COD/gateway) with **idempotent** webhook handling.

### Real-time
- Socket.IO gateway: order-status, rider-GPS, KDS and new-order events.

### Customer web app (Next.js 14)
- Homepage: category-filtered product listing with search.
- Product detail: quantity selector, add-to-cart (localStorage).
- Cart page: adjust quantities, remove items, subtotal + delivery.
- Checkout: delivery quote, promo/loyalty-aware, place order.
- Orders page: history with status badges + tracking.
- Login/Register: JWT token stored in localStorage.

### Riders
- Rider profile: me (active orders + pending earnings), online/offline toggle.
- GPS push: records location + broadcasts to active order rooms via Socket.IO.
- Admin approval: list pending, approve/suspend riders.
- **Auto-assignment:** finds nearest online rider on READY status; creates
  earning record; emits via WebSocket.

### Reviews
- Create review for delivered order or product.
- Product reviews list with average rating + count.

### Notifications (Global)
- `dispatch()` creates per-channel records; PUSH delivered via WebSocket
  immediately; SMS/EMAIL/WHATSAPP logged for provider wiring.
- Customer notifications wired into order lifecycle (placed, status changes).

### Referrals
- Generate shareable referral code; redeem on signup.
- Both referrer and referred get loyalty points credited.

### KDS (Kitchen Display System)
- Branch queue: QUEUED → PREPARING → READY → SERVED.
- Kitchen `start()` and `ready()` update order status atomically.
- Priority management; real-time KDS broadcasts via WebSocket.

### Inventory & Warehouse
- Inventory items CRUD per branch; low-stock alerts to admins.
- Stock operations: RECEIVE / CONSUME / WASTE / ADJUST with ledger.
- Suppliers and purchase orders (create + receive into stock).

### POS
- Dine-in / takeaway order creation from cashier; auto-creates payment + KDS queue.
- Branch POS order listing.

### Analytics & BI
- Dashboard overview: total orders, revenue, active riders, customers.
- Sales-by-day aggregation; top products by revenue.
- Customer RFM segmentation (VIP / Loyal / Regular / New).

### Marketing & CRM
- Campaign creation (name, channel, template, segment targeting).
- Campaign launch dispatches notifications to segment members or all customers.
- Customer segments with JSON rules (minOrders, minSpend, lastOrderDaysAgo);
  segment builder populates membership via SQL.

### AI Microservice (Python / FastAPI)
- Skeleton running at `localhost:8000` with health check.
- Endpoints: demand forecasting, product recommendations, sentiment analysis.
- `apps/ai/requirements.txt` ready for pip install.

## Roadmap / TODO (continue next session)

- **Frontends:** rider PWA, POS React frontend.
- **Production hardening:** FCM push notifications, Twilio SMS, email (Resend),
  WhatsApp Cloud API, Stripe/JazzCash/EasyPaisa live gateways, S3 image uploads,
  CDN, monitoring (Sentry), load testing.

## Notes for next session

- IDE may show **stale** TypeScript errors (`@prisma/client has no exported
  member …`, throttler types) — these are cache artifacts. The build is the
  source of truth: `pnpm --filter @app/api build` passes. Restart the TS Server
  to clear them.
- pnpm was installed via `npm i -g pnpm@9` (corepack hit an EPERM on this box).

See `docs/ARCHITECTURE.md` for the full design and roadmap.
