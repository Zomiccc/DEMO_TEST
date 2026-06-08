# ─────────────────────────────────────────────
# Base
# ─────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /workspace
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy workspace manifests for cached installs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# ─────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────
FROM base AS development
RUN pnpm install
COPY . .
WORKDIR /workspace/apps/api
RUN pnpm prisma generate
EXPOSE 4000
CMD ["pnpm", "start:dev"]

# ─────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /workspace/apps/api
RUN pnpm prisma generate && pnpm build
RUN pnpm prune --prod

# ─────────────────────────────────────────────
# Production
# ─────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
WORKDIR /workspace/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
