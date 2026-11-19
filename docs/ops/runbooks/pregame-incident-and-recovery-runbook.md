# Pregame & Production Incident Recovery Runbook

Actionable SRE recovery guide for Galaxy Sports Edge (`Sports-wt-triage`) across `localhost:3000`, Three-Noon Master Locks, `T-90m` adjustments, CAGE publication gates, Stripe/Whop entitlements, and cost-bounded cloud storage.

## 1. `localhost:3000` Fails or Stalls on Windows
- **Symptoms:** `Can't resolve '@/...'`, heap OOM during webpack compile, disk thrashing, or boot stalling on background `nflverse` CSV fetches.
- **Root Cause & Fix:** Start dev exclusively via `npm run dev` (`scripts/ops/start-web-dev.mjs`), which allocates `8 GB` heap across Windows/POSIX. [next.config.mjs](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/next.config.mjs) anchors `@` via `fileURLToPath` and disables dev persistent webpack cache when free disk drops below `10 GB`. [instrumentation.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/instrumentation.ts) skips background `nflverse` boot fetches unless `GSE_DEV_BOOT_INGEST=true`.

## 2. Storefront Buyer Paid but Still Sees Locked Pack / Free Tier
- **Checklist:**
  1. Check `Stripe` / `Whop` webhook logs for `recordPurchaseLedgerEntry` writes into `RevenueEvent` (`kind = "one_time_pack"`).
  2. Verify `UNLOCK_COOKIE_SECRET` (or `NEXTAUTH_SECRET`) is set in Vercel so [unlock-cookie.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/packages/unlock-cookie.ts) mints valid per-slug `gse_unlock_<slug>` cookies.
  3. Confirm [entitlements.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/entitlements.ts) resolves `resolvePackEntitlementTier()` for both `userId` and lowercase `customerEmail`.

## 3. CAGE `REFUSE` Receipt Blocks Publication (`mode: "ENFORCE"`)
- **Why It Fired:** One or more candidate rows in [publication-gate.ts](file:///C:/Users/Garrett/Sports-wt-triage/packages/governed/src/publication-gate.ts) failed a hard invariant:
  - `PASS_MARKED_PUBLISHABLE`: never ship `PASS` or `ABSTAIN` with `publishAllowed: true`.
  - `NEGATIVE_CLV_PLAY`: active play has negative expected CLV.
  - `CONFIDENCE_PERCENT_FORBIDDEN`: confidence string contained `%` or violated `NN/100`.
  - `SINGLE_SIDED_PROP_FORBIDDEN`: non-TD prop missing two-way American prices.
  - `INTERNAL_JARGON_LEAK`: customer copy contained internal math terms.
  - `UNATTRIBUTED_VOLUME_LEAK`: active named attribution dropped below `94%`.
- **Action:** Inspect `reasons[]` on the `REFUSE` receipt; fix the upstream candidate row; never switch `mode` back to `SHADOW`.

## 4. `T-90m` Adjustment Window (< 180s SLA) & `orbax` Checkpoints
- Use [trajectory_checkpoint.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/trajectory_checkpoint.py) mmap-loaded baseline matrices so `T-90m` official inactive deltas recompute in sub-second time rather than re-simulating `10,000` full-game worlds from scratch.
- Check live roster exclusions in sub-50ms via `/api/dfs/lineup-doctor` ([lineup-doctor.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/fantasy/lineup-doctor.ts)).

## 5. Zero-Waste Storage & BigQuery Safety
- Preview cold archive cleanup cleanly (dry-run default):
  `node scripts/ops/rclone-r2-offload.mjs`
- Keep BigQuery scans strictly capped below `1 GiB` via `execute_guarded_query()` in [gcp_warehouse.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/cloud/gcp_warehouse.py).
- Keep local S3 receipt integration testing free against LocalStack (`docker compose -f docker-compose.localstack.yml up -d`).
