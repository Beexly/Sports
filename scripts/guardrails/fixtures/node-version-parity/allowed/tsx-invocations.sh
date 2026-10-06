#!/usr/bin/env bash
# TypeScript through tsx is the repo's supported path and must NOT be flagged.
tsx scripts/edge-lab/gate-slate.ts
npx tsx scripts/free-ingest-smoke.ts
ts-node --esm prisma/seed.ts
TSX_TSCONFIG_PATH=apps/web/tsconfig.json tsx scripts/ops/snapshot.ts
node --test scripts/guardrails/some.test.mjs
node scripts/guardrails/run-all.mjs
