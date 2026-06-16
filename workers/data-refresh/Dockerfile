# workers/data-refresh/Dockerfile
# Build context must be the repo root (compose.yml: context: ../..)
#
# Multi-stage: install deps at root (resolves workspace packages), then run.
# Targets Oracle Ampere ARM64 (linux/arm64) — also works on amd64.

FROM node:20-alpine AS base
WORKDIR /app

# Install build tools for native addons (prisma binary targets may need them)
RUN apk add --no-cache openssl libc6-compat

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
# Copy workspace manifests first (layer-cache friendly)
COPY package.json package-lock.json* ./
COPY packages/db/package.json         ./packages/db/
COPY packages/types/package.json      ./packages/types/
COPY packages/prediction-engine/package.json ./packages/prediction-engine/
COPY packages/data-ingestion/package.json    ./packages/data-ingestion/
COPY workers/data-refresh/package.json       ./workers/data-refresh/

# Copy Prisma schema so postinstall can generate the client
COPY packages/db/prisma/ ./packages/db/prisma/

RUN npm install --workspaces --include-workspace-root

# Generate Prisma client for the container's OS/arch
RUN npx prisma generate --schema=./packages/db/prisma/schema.prisma

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy node_modules + generated prisma client from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true

# Copy source (full monorepo slice needed for workspace resolution)
COPY packages/       ./packages/
COPY workers/data-refresh/ ./workers/data-refresh/
COPY tsconfig*.json ./

WORKDIR /app/workers/data-refresh

ENV NODE_ENV=production

CMD ["npx", "ts-node", "--esm", "src/index.ts"]
