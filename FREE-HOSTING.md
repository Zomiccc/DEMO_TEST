# Free Hosting Deployment Guide

## Best Completely Free Stack

| Service | What | Free Tier |
|---------|------|-----------|
| **Vercel** | Frontend | Unlimited |
| **Render** | Backend API | Free (sleeps after 15min idle) |
| **Supabase** | PostgreSQL | 500MB, unlimited requests |
| **Upstash** | Redis | 10,000 commands/day |

---

## Step 1: Push Code to GitHub

```bash
cd D:\d

# If not already a git repo
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOURNAME/rms.git
git push -u origin main
```

---

## Step 2: Deploy PostgreSQL (Supabase)

1. Go to https://supabase.com
2. Sign up with GitHub
3. Create New Project
4. Choose region closest to you (e.g., `Singapore` or `US East`)
5. Set database password
6. Wait ~2 minutes for project creation

### Get Connection String

Go to **Project Settings** → **Database** → scroll to **Connection String** → **URI**

Copy this:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

This is your `DATABASE_URL` and `DIRECT_URL`.

---

## Step 3: Deploy Redis (Upstash)

1. Go to https://console.upstash.com
2. Sign up with GitHub
3. Click **Create Database**
4. Name: `rms-redis`
5. Region: Same as Supabase
6. Click **Create**

### Get Redis URL

Click your database → **Details** tab → copy **REDIS_URL**:
```
rediss://default:xxxx@abc-12345.upstash.io:6379
```

---

## Step 4: Deploy Backend (Render)

1. Go to https://render.com
2. Sign up with GitHub
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Configure:

| Setting | Value |
|---------|-------|
| Name | `rms-api` |
| Region | Same as your DB |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `cd apps/api && npm install && npx prisma generate && npm run build` |
| Start Command | `cd apps/api && node dist/apps/api/src/main.js` |
| Plan | `Free` |

6. Add **Environment Variables:**

```
NODE_ENV=production
API_PORT=10000
API_GLOBAL_PREFIX=api
CORS_ORIGINS=https://rms-frontend.vercel.app

DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

REDIS_HOST=abc-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

JWT_ACCESS_SECRET=generate-a-64-char-random-string-here-for-real
JWT_REFRESH_SECRET=generate-another-64-char-random-string-now
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

AES_256_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
BCRYPT_SALT_ROUNDS=12
TOTP_ISSUER=RMS-Platform

RATE_LIMIT_PUBLIC_PER_MIN=100
RATE_LIMIT_AUTH_PER_MIN=500
```

7. Click **Create Web Service**

Wait ~5 minutes for first deploy.

### Run Migrations & Seed (One Time)

In Render dashboard:
1. Click **Shell** tab
2. Run:
```bash
cd apps/api
npx prisma migrate deploy
node prisma/seed-comprehensive.js
```

Your API URL will be: `https://rms-api.onrender.com/api`

---

## Step 5: Deploy Frontend (Vercel)

### Option A: Vercel CLI (Fastest)

```bash
cd D:\d\apps\unified

# Install Vercel CLI
npm install -g vercel

# Login (opens browser)
vercel login

# Create env file
echo "VITE_API_URL=https://rms-api.onrender.com/api" > .env.production

# Deploy
vercel --prod
```

### Option B: GitHub + Vercel Dashboard

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click **Add New Project**
4. Import your GitHub repo
5. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | `Vite` |
| Root Directory | `apps/unified` |
| Build Command | `pnpm build` |
| Output Directory | `dist` |

6. Click **Environment Variables** → Add:
   - Key: `VITE_API_URL`
   - Value: `https://rms-api.onrender.com/api`

7. Click **Deploy**

Your frontend URL will be: `https://rms-frontend.vercel.app`

---

## Step 6: Update CORS on Backend

After both are deployed:

1. Go to Render dashboard → your web service → **Environment**
2. Update `CORS_ORIGINS`:
```
CORS_ORIGINS=https://rms-frontend.vercel.app,https://rms-frontend-git-main.vercel.app
```
3. Click **Manual Deploy** → **Deploy latest commit**

---

## Your Live URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `https://rms-frontend.vercel.app` | Customer app |
| API | `https://rms-api.onrender.com/api` | Backend |
| API Docs | `https://rms-api.onrender.com/api/docs` | Swagger UI |
| Database | Supabase dashboard | PostgreSQL |
| Cache | Upstash dashboard | Redis |

---

## Demo Accounts (Already Seeded)

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@rms.local` | `Customer@123` |
| Rider | `rider@rms.local` | `Rider@123` |
| Cashier | `cashier@rms.local` | `Cashier@123` |
| Kitchen | `kitchen@rms.local` | `Kitchen@123` |
| Admin | `superadmin@rms.local` | `SuperAdmin@123` |

---

## Important Notes

### Render Free Tier Limitations
- **Sleeps after 15 minutes** of inactivity
- First request after sleep takes ~30 seconds to wake up
- 512MB RAM (enough for this app)
- 100GB bandwidth/month

### To Keep Render Always Awake
Use a free uptime monitor that pings your API every 10 minutes:
- https://uptimerobot.com (free plan)
- https://cron-job.org (free)

Set it to ping: `https://rms-api.onrender.com/api/health`

### Supabase Free Tier
- 500MB database storage
- 2GB bandwidth/day
- Unlimited API requests
- Backups included

### Vercel Free Tier
- Unlimited bandwidth
- 100GB/month
- Fast global CDN
- Automatic HTTPS

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API returns 502 | Check Render logs, ensure `npx prisma generate` ran |
| Frontend blank page | Check Vercel build logs, ensure `VITE_API_URL` is set |
| Database connection fail | Check Supabase connection string, ensure password is correct |
| CORS errors | Add your Vercel domain to `CORS_ORIGINS` on Render |
| Redis connection fail | Check Upstash password and host |

---

## Alternative: Railway (Even Easier)

Railway gives you everything in one place:

1. https://railway.app
2. New Project → Deploy from GitHub
3. Add PostgreSQL (template)
4. Add Redis (template)
5. Set environment variables
6. Deploy

Railway free tier: $5 credit/month (~200 hours runtime)

---

## Quick Summary

```
Frontend (Vercel FREE)  →  Backend (Render FREE)  →  Database (Supabase FREE)  →  Cache (Upstash FREE)
     ↓                          ↓                         ↓                              ↓
https://...vercel.app    https://...onrender.com    postgresql://...supabase.com   rediss://...upstash.io
```

**Total cost: $0 forever.**
