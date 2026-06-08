# Deployment Guide

## Architecture

This is a monorepo with:
- **Frontend:** Vite + React + Tailwind (in `apps/unified/`)
- **Backend:** NestJS + Prisma + PostgreSQL + Redis (in `apps/api/`)

## Option 1: Full Deployment (Recommended)

### 1. Deploy the Backend API

The NestJS API needs a server that can run Node.js + Docker.

**Recommended platforms:**
- **Railway** (easiest - has PostgreSQL + Redis templates)
- **Render** (free tier available)
- **Fly.io** (great for Docker deployments)
- **AWS/GCP/Azure VPS** (most control)

#### Railway Steps:
1. Go to https://railway.app and login with GitHub
2. Create a new project → Deploy from GitHub repo
3. Add PostgreSQL service (template)
4. Add Redis service (template)
5. In your API service, set environment variables:
   ```
   NODE_ENV=production
   API_PORT=4000
   API_GLOBAL_PREFIX=api
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   DATABASE_URL=postgresql://user:pass@postgres:5432/rms
   DIRECT_URL=postgresql://user:pass@postgres:5432/rms
   REDIS_HOST=redis
   REDIS_PORT=6379
   JWT_ACCESS_SECRET=your-secret-key-min-32-chars
   JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
   AES_256_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   BCRYPT_SALT_ROUNDS=12
   ```
6. Run Prisma migrations:
   ```bash
   npx prisma migrate deploy
   ```
7. Seed the database:
   ```bash
   node prisma/seed-comprehensive.js
   ```

### 2. Deploy Frontend to Vercel

#### Prerequisites:
- Install Vercel CLI: `npm i -g vercel`
- Login: `vercel login`

#### Steps:
1. **Navigate to the unified app:**
   ```bash
   cd apps/unified
   ```

2. **Set production API URL:**
   Create a `.env.production` file:
   ```bash
   VITE_API_URL=https://your-api-url.railway.app/api
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

   Or connect your GitHub repo to Vercel and set:
   - Framework Preset: `Vite`
   - Build Command: `pnpm build`
   - Output Directory: `dist`
   - Root Directory: `apps/unified`

4. **Set environment variable in Vercel dashboard:**
   - Key: `VITE_API_URL`
   - Value: `https://your-api-url.railway.app/api`

### 3. Update CORS

In your backend environment variables, update `CORS_ORIGINS` to include your Vercel domain:
```
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

---

## Option 2: Frontend-Only on Vercel (with Mock API)

If you only want the frontend on Vercel without a running backend:

1. Uncomment and use the mock API in `apps/unified/`
2. Deploy the frontend only (no backend needed)
3. The app will run with mocked data

---

## Option 3: Docker Compose (Self-Hosted)

For a complete self-hosted deployment:

```bash
cd docker
docker compose up -d
```

This starts PostgreSQL, Redis, PgBouncer, and Adminer.

Then build and run the API:
```bash
cd ../apps/api
npm run build
npm run start:prod
```

And serve the frontend:
```bash
cd ../apps/unified
pnpm build
npx serve dist
```

---

## Environment Variables Reference

### Frontend (`apps/unified/.env.production`)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com/api` |

### Backend (`apps/api/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `API_PORT` | Server port | `4000` |
| `API_GLOBAL_PREFIX` | API path prefix | `api` |
| `CORS_ORIGINS` | Allowed frontend domains | `https://app.vercel.app` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `REDIS_HOST` | Redis hostname | `localhost` or `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_ACCESS_SECRET` | JWT signing key | `min-32-char-secret` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `min-32-char-secret` |
| `AES_256_KEY` | Encryption key (64 hex chars) | `0123456789abcdef...` |

---

## Quick Local Testing

```bash
# 1. Start Docker services
docker compose -f docker/docker-compose.yml up -d postgres redis

# 2. Start backend API
cd apps/api
node dist/apps/api/src/main.js

# 3. Start frontend (in new terminal)
cd apps/unified
pnpm dev
```

Open http://localhost:3000

---

## Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@rms.local` | `Customer@123` |
| Rider | `rider@rms.local` | `Rider@123` |
| Cashier | `cashier@rms.local` | `Cashier@123` |
| Kitchen | `kitchen@rms.local` | `Kitchen@123` |
| Admin | `superadmin@rms.local` | `SuperAdmin@123` |
