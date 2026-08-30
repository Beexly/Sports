# Claude Code image todos — closure (2026-08-06)

Source: Claude Code task list (free-path SNAPSHOT, residual RCA, clvRepair report, CRON_SECRET).

## Live baseline (probed)

| Signal | Value |
|--------|-------|
| Prod SHA | `63a714f…` (confirm redeploy after this PR) |
| Settlement | **HEALTHY** · overduePending **0** / 1478 |
| Cron unauth | **401** (secret configured + enforced) |
| Gates | LIVE_BOARD off · StatKing dark · public picks off |

## Task matrix

| # | Task | Status | Evidence |
|---|------|--------|----------|
| A | Wire free-path SNAPSHOT drain | **DONE** (code) + tripwire | `free-path-snapshot.ts` · runner enqueue + `recordFreePathSnapshot` + `drainPendingSnapshotOutcomes` · tests `free-path-snapshot.test.ts` |
| B | RCA residual overdue PENDING | **VOID / cleared** | Premise false: `overduePending: 0`. No residual band to RCA. Module remains for next spike. |
| C | Report clvRepair + SNAPSHOT in free settle response | **DONE** + top-level promote | Nested `free.clvRepair` / `free.snapshotRepair`; cron now also returns top-level fields |
| D | Verify CRON_SECRET (401 / 200) | **401 CONFIRMED** · **200 needs Bearer once** | Unauth curl → 401. Auth path: founder runs `scripts/ops/verify-cron-secret.mjs` or External Cron workflow when Actions minutes available |

## Cost system (“Jynx” / correct tools)

No repo module named **Jynx**. Money-saving stack already present:

| Lever | Module | Flip |
|-------|--------|------|
| Model tier | `apps/web/lib/claude-api/model-router.ts` | brief + calibration-insight = **haiku**; studio/journal/content/model-court = sonnet |
| Free content lane | `free-lane.ts` | `CONTENT_FREE_LANE_ENABLED=true` + `CEREBRAS_API_KEY` (brief only) |
| Internal LLM | `internal-llm.ts` | Groq/etc via env — not public claims |
| Free settlement | free-path (no Odds key) | **active** when key absent |

**Founder cost flip (no code):** set Vercel production env → redeploy:

```
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=<key from cloud.cerebras.ai>
# optional:
MODEL_CHEAP=claude-haiku-4-5-20251001
```

Do **not** flip LIVE_BOARD / PERFORMANCE_STATS / StatKing.

## What this PR changes

1. Top-level `clvRepair`, `snapshotRepair`, `scoreDates`, `rca` on free settle-picks JSON  
2. Unit + contract tripwires for SNAPSHOT path and response fields  

## Operator verify after deploy

```bash
# 401
curl -sS -o /dev/null -w "%{http_code}\n" https://www.galaxysportsedge.com/api/cron/settle-picks

# 200 + repair fields (secret never in git)
CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com \
  node scripts/ops/verify-cron-secret.mjs
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE_URL/api/cron/settle-picks" | jq '{path,picksSettled,clvRepair,snapshotRepair,scoreDates}'
```
