# workers/pick-generation/Dockerfile
# Build context must be the repo root (compose.yml: context: ../..)

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/db/package.json              ./packages/db/
COPY packages/types/package.json           ./packages/types/
COPY packages/prediction-engine/package.json ./packages/prediction-engine/
COPY workers/pick-generation/package.json  ./workers/pick-generation/
COPY packages/db/prisma/                   ./packages/db/prisma/

RUN npm install --workspaces --include-workspace-root
RUN npx prisma generate --schema=./packages/db/prisma/schema.prisma

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true

COPY packages/       ./packages/
COPY workers/pick-generation/ ./workers/pick-generation/
COPY tsconfig*.json ./

WORKDIR /app/workers/pick-generation

ENV NODE_ENV=production

CMD ["npx", "ts-node", "--esm", "src/index.ts"]
