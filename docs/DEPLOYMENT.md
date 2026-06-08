# Deployment

## Local development

```bash
pnpm install
cp .env.example .env          # copy on Windows
pnpm docker:up                # postgres, pgbouncer, redis, adminer, api
pnpm --filter @app/api prisma:migrate
pnpm --filter @app/api prisma:seed
```

Services: API `:4000`, Postgres `:5432`, PgBouncer `:6432`, Redis `:6379`,
Adminer `:8080`.

## Environment variables

All configuration is driven by `.env` (never hardcoded). See `.env.example` for
the full list. Critical secrets to set in production:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — strong random values.
- `AES_256_KEY` — exactly 64 hex chars (32 bytes).
- Database/Redis credentials, Twilio, SendGrid, FCM, S3, Maps, payment keys.

## Production (Docker Compose + Nginx)

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
docker compose -f docker/docker-compose.prod.yml exec api pnpm --filter @app/api prisma:deploy
```

- Nginx terminates TLS 1.3 and reverse-proxies `/api` and `/socket.io` to the API.
- Put real certs in `docker/nginx/certs/{fullchain,privkey}.pem`.
- `restart: always` provides auto-recovery; add a process manager/orchestrator
  (PM2, Docker Swarm, or Kubernetes) as scale demands.

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml`:

1. On push/PR to `main`: spin up Postgres + Redis services, install, generate
   Prisma client, run migrations, **run tests**, build.
2. On push to `main`: build the production Docker image and push to GHCR.
3. (Commented) SSH deploy step pulls the image and restarts the prod compose stack.

## Database backups

`docker/scripts/backup-postgres.sh` dumps Postgres, gzips, and uploads to S3.
Schedule via cron (e.g. daily `0 3 * * *`). Requires `aws` CLI and the
`POSTGRES_*` / `AWS_*` env vars.

## Health checks

`GET /api/health` verifies DB + Redis connectivity (used by orchestrators and the
Super Admin server-health widget).
