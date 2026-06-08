# Architecture

## Overview

API-first monorepo. Every feature is exposed as a REST endpoint (with WebSocket
events for real-time concerns). Frontends (web/admin/rider/pos) are thin clients
over the same NestJS API.

```
              ┌────────── Nginx (TLS 1.3, reverse proxy) ──────────┐
              │                                                     │
  web/admin/rider/pos  ──HTTPS──►  NestJS API  ──►  PgBouncer  ──►  PostgreSQL
                          │            │                              ▲
                          │            ├──►  Redis (cache, queues, rate-limit, geo)
                          └─Socket.IO──┘            │
                                                    └──►  Read replica (analytics)
   External: Twilio (OTP/SMS/WhatsApp), SendGrid, Firebase FCM, AWS S3,
             Google Maps, Stripe/JazzCash/EasyPaisa.
```

## Backend layering (NestJS)

- **config/** — typed env configuration (no hardcoded secrets).
- **prisma/** — global `PrismaService` (writes/reads via PgBouncer).
- **redis/** — global `RedisService` (sessions, OTP, rate-limit, refresh whitelist, geo).
- **common/** — cross-cutting:
  - `guards/` — `JwtAuthGuard` (global, default-protect), `RolesGuard` (RBAC),
    `JwtRefreshGuard`.
  - `decorators/` — `@Public()`, `@Roles()`, `@CurrentUser()`.
  - `interceptors/` — `AuditInterceptor` + `@Audit()` (writes `audit_logs`).
  - `filters/` — `AllExceptionsFilter` (consistent error shape).
  - `crypto/` — `CryptoService` (AES-256-GCM for sensitive fields).
- **auth/** — registration/login/OTP/2FA/OAuth + token rotation.
- **users/**, **audit/**, **health/** — supporting modules.

Feature modules to come (orders, menu, delivery, payments, pos, kds, inventory,
crm, analytics) follow the same module/service/controller/dto structure.

## Security model

| Requirement            | Implementation                                              |
|------------------------|-------------------------------------------------------------|
| RBAC                   | Global `RolesGuard` + `@Roles()` on protected routes        |
| 2FA (admins)           | TOTP via `otplib`, secret AES-256 encrypted, QR provisioning|
| Audit logging          | `AuditInterceptor` → `audit_logs` (user, action, ip, ts)    |
| Rate limiting          | `@nestjs/throttler` + Redis storage (100/min public)        |
| Input validation       | Global `ValidationPipe` (whitelist + class-validator)       |
| SQL injection          | Prisma parameterised queries only                           |
| XSS / headers          | Helmet + Nginx security headers                             |
| CORS                   | Origin whitelist from `CORS_ORIGINS`                        |
| Token storage          | httpOnly cookies (never localStorage)                       |
| Passwords              | bcrypt (configurable rounds)                                |
| TLS                    | Nginx TLS 1.3 minimum                                       |

## JWT rotation

1. Login issues access (15m) + refresh (7d). Refresh `jti` whitelisted in Redis.
2. `POST /auth/refresh` validates the refresh cookie, checks the `jti` is still
   whitelisted, **deletes it** (single-use), and issues a fresh pair.
3. Logout / password-reset revokes all of a user's refresh `jti`s.

## Data model

40+ tables defined in `apps/api/prisma/schema.prisma` covering identity, catalog,
orders, payments/wallet/loyalty, delivery, inventory/suppliers, HR, POS/KDS,
engagement (notifications/reviews/CMS/support), marketing (campaigns/segments)
and audit.

## Roadmap

- **Phase 1**: ✅ Auth → Menu/Catalog → Cart/Checkout → Orders + tracking →
  Delivery/zones → Payments → real-time gateways → customer web + admin + rider apps.
- **Phase 2**: POS, KDS, Inventory/Warehouse, Super Admin dashboard.
- **Phase 3**: CRM/retention, marketing automation, analytics/BI.
- **Phase 4**: Python/FastAPI AI microservice, mobile readiness.
