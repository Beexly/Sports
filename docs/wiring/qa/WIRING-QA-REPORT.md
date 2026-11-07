# WIRING-QA-REPORT

## 1. Corpus ingestion
Main carries a PARTIAL 38-file copy of the inbox. motif/corpus-inbox-2026-11-07 is authoritative with 127 files. Based on searching the repo for the dataset path, it is not visibly consumed by any reasoning/research module, only stored.
Command: `git ls-tree -r origin/main data/corpus/inbox-motif/ | wc -l` (38)
Command: `git ls-tree -r origin/motif/corpus-inbox-2026-11-07 data/corpus/inbox-motif/ | wc -l` (127)

## 2. Warehouse
Datasets DS_OPENMETEO_STADIUM_HOURLY and DS_NWS_STADIUM_FORECAST failed with ERROR status and 0 records. The registry points to a Windows host path (C:\Users\Garrett\...) but no normalized data exists in the repo under intelligence/data/warehouse/normalized/.
Command: `grep -in "error" intelligence/data/warehouse/ingestion_registry.jsonl`

## 3. Layer stack + context packets
Layer modules exist in intelligence/reasoning/ (e.g., analyst.py, bayes.py, critique.py). Consumption could not be definitively determined across all tracks.
Command: `ls -1 intelligence/reasoning/`

## 4. Jarvis/Jynx brain
Found hardcoded instances of score/equation values in apps/web/lib/jarvis/stealth-skeleton-brain.ts (e.g., seasonLedger strings). The string 47-19-1 was not found in stealth-skeleton-brain.ts or ask-jarvis.ts.
Command: `grep -rn "47-19-1" apps/web/lib/jarvis/`
As of latest evidence (docs/wiring/qa/MATH-QA-PROTOCOL.md, etc.): the /benchmarks composite 86.12 is NOT the mean of its seven components (plain mean 81.205714; 86.12 implies AIME=97.90 vs displayed 60.00); provider health fields ttft/throughput/accuracy are computed proxies and uptime_target 0.999 is an unmeasured literal (index.ts:2304); the worker Sinkhorn residual at shipped (40, 0.15) is at machine floor (live endpoint 1.387779e-16); the CRPS constant verifies.

## 5. Provider worker + routes
The openrouter routes (api/openrouter/v1/*) provide different model descriptions/IDs compared to the provider worker. Worker has gse/stealth-skeleton-alpha, gse/skeleton-v1, gse/skeleton-v1-fast, etc., whereas OpenRouter routes export gse/skeleton-stealth, gse/skeleton-flash, gse/skeleton-math-pro, gse/skeleton-forecast, gse/skeleton-council, gse/skeleton-embed-v2, gse/skeleton-rerank-v2. wrangler.toml is configured for 'gse-stealth-skeleton-provider'.
Command: `cat apps/web/app/api/openrouter/v1/models/route.ts | grep -n "id:"`
Command: `cat workers/stealth-skeleton-provider/src/index.ts | grep -n "id: \"gse/"`

## 6. Regression greps
Found voided record 47-19-1 (113 files outside audit/history/data) and pulled items like 'NYJ ML -122', 'Jets DST', 'Chris Godwin OVER 3.5' in apps/web/public/cards/week8-7of7-sweep-receipt.svg, apps/web/lib/newsletter/issues.ts, and apps/web/lib/packages/catalog.ts.
Command: `grep -rn "47-19-1" . | grep -v 'audit' | grep -v 'history' | grep -v 'tests' | grep -v 'data/engine' | grep -v 'mind_wave13' | wc -l` (113)

## 7. CI
All TypeScript workspace tests pass successfully after running Prisma generate (no TS errors left in tree). Workspace typecheck exit status details: all workspaces passed.
Command: `npx prisma generate --schema=./packages/db/prisma/schema.prisma`
Command: `npm run typecheck`