# Launch preflight — steps, semantics, how to read

**Script:** `node scripts/ops/launch-preflight.mjs`  
**Target:** `BASE_URL` (default `https://www.galaxysportsedge.com`)  
**Optional:** `CRON_SECRET` for authenticated settle proof

Read-only. No deploys, no env writes, no gate flips.

---

## How to run

```bash
node scripts/ops/launch-preflight.mjs
BASE_URL=https://www.galaxysportsedge.com node scripts/ops/launch-preflight.mjs
CRON_SECRET=… node scripts/ops/launch-preflight.mjs
echo $?   # 0 = no hard blockers; 1 = hard !! present
```

| Line prefix | Meaning | Exit impact |
|-------------|---------|-------------|
| `OK` | Pass | — |
| `!!` **hard** | Launch blocker (pipeline, storage, gates, trust 404) | exit **1** |
| `!!` **soft** | Founder env / deploy lag / settlement capability lag | exit **0** |

---

## Steps (matches script output)

### 1. Health — `GET /api/health`

| Check | Pass | Notes |
|-------|------|--------|
| Readiness `ok=true` + HTTP 200 | hard if fail | **Only** database + ingestion checks |
| Operator `status` | soft if `degraded` while ok | Settlement CRITICAL/DEGRADED sets status without flipping ok |
| `checks.database` / `checks.ingestion` | hard if error | Ingestion stale if last SUCCESS > **240m** (`REFRESH_STALE_AFTER_MINUTES`) |
| `capabilities` settlement | soft if degraded/unavailable | Grace **6h** (`SETTLEMENT_DEFAULT_GRACE_HOURS`) |
| `capabilityGraph` | info | Observability only — never flips ok |

**Do not confuse:** `ok`/503 = uptime; `status` = operator including settlement.

### 2. Home + CSP — `GET /`

| Check | Pass |
|-------|------|
| HTTP 200 | hard |
| CSP contains `default-src` | hard |
| `X-Frame-Options` | soft if missing |

### 3. Ops truth — `GET /api/ops/public-surface-truth`

| Check | Pass |
|-------|------|
| HTTP 200 + deploy SHA | hard if not 200 |
| `settlement.overduePending === 0` + HEALTHY | hard if overdue > 0 |
| contests/waitlist `postgres` | hard |
| `STATS_PUBLIC` / public picks false | hard |
| free-lane / Jynx auto | soft if off |
| `revenueLadder` present, monetize false | soft if missing (SHA lag); hard if monetize true early |
| `founderNextSteps` (incl. Stripe audit) | soft if thin/missing |

### 4. Product gates

| Check | Pass |
|-------|------|
| `GET /api/picks` → **503** | hard |
| `GET /api/cron/settle-picks` unauth → **401** | hard |

### 5. Settle cycle (optional)

With `CRON_SECRET`:

| Check | Pass |
|-------|------|
| Auth settle 2xx | hard |
| Body has `clvRepair`, `snapshotRepair`, `teamGameLogRepair` (top-level or under `free`) | soft if missing |

### 6. Trust + SEO

Each **200** or **308**: security.txt, ads.txt, humans.txt, llms.txt, site.webmanifest, robots.txt, podcast feed, news-sitemap, sitemap. Missing → hard.

---

## Related platform constants

| Constant | Value | Used for |
|----------|-------|----------|
| `SETTLEMENT_DEFAULT_GRACE_HOURS` | 6 | Overdue PENDING after kickoff |
| Critical overdue threshold | 5 | Settlement CRITICAL band |
| `REFRESH_STALE_AFTER_MINUTES` | 240 | Ingestion health error/503 |
| Health-alert ingestion age | >90m | Alert snapshot (stricter than 240) |
| Health-alert settlement | CRITICAL only | Webhook paging |
| Quiet window | 4h | Re-alert while still unhealthy |

---

## After preflight

1. Fix **hard** !! first (deploy, storage, trust routes, gates).  
2. Founder: env (free-lane, Jynx), Stripe webhook audit, optional `CRON_SECRET` settle.  
3. Never flip LIVE_BOARD / PUBLIC_PICKS / STATS / PERFORMANCE_STATS from preflight.  

Owner checklist: `docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md`.

## Ingestion 503 recovery (free mode)

If `checks.ingestion=error` and age > 240m:
1. Confirm cron `/api/cron/free-spine-health` is scheduled **every 2h** (`0 */2 * * *`).
2. Manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://www.galaxysportsedge.com/api/cron/free-spine-health`
3. Re-run preflight — age should reset after SUCCESS IngestionRun.
