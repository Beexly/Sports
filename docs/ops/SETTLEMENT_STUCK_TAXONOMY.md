# Settlement stuck taxonomy (2026-08-06)

## Gate before RCA

| Check | Live (probe) | Gate |
|-------|--------------|------|
| `deployment.sha` | still `2d0f3a21…` | **If SHA lags main, stop coding settle matching** — redeploy first |
| CRON unauth | 401 | Secret present |
| Overdue | 139 / 1478 CRITICAL | Moat oxygen |

Main already has date-targeted free settle + SNAPSHOT wire (#306). Until SHA advances, live RCA will still look like pre-date-target (`OVERDUE_NO_SCORE` / `NO_TRUSTED_FINAL` from undated boards).

## RCA codes (code truth — free runner)

| Code | Category | Wave | Meaning |
|------|----------|------|---------|
| `NO_TRUSTED_FINAL` | DATA_SOURCE | A | No usable final for that kickoff day |
| `OVERDUE_NO_SCORE` | DATA_SOURCE | A | Past grace, still no final (classic undated-board failure) |
| `TEAM_ORIENT_FAIL` | MATCHING | B | Final exists but home/away tokens didn't match |
| `DISPUTED_SCORES` | DATA_SOURCE | D | Policy hold — never auto-void |
| `SINGLE_SOURCE_POLICY_HOLD` | POLICY | D | Policy, not a matching bug |
| `WITHIN_GRACE` | TIMING | — | Not overdue yet |

## After redeploy + 2 hourly settle cycles

1. Run settle-picks with CRON_SECRET; capture `picksSettled`, `clvRepair`, `snapshotRepair`, `scoreDates`, `rca`.
2. Ops Bearer detail → `settlement.bySport` / `operatorNext`.
3. **Only then** improve matching:
   - Pareto dominated by `NO_TRUSTED_FINAL` / `OVERDUE_NO_SCORE` → score date coverage / source gaps
   - Pareto dominated by `TEAM_ORIENT_FAIL` → abbr/alias tables (name+abbr already on free path)
   - `DISPUTED` share → leave held (law)

## Free-path work kinds (enqueue ≠ done)

| Kind | Free path |
|------|-----------|
| `CLV_GRADE` | grade on settle + `clvRepair` drain |
| `SNAPSHOT_OUTCOME` | record on settle + `snapshotRepair` drain (#306) |
| `TEAM_GAME_LOG` | paid settleSport only — not free enqueue (ok until free learning expands) |

## Founder one-liner

Redeploy → SHA leaves `2d0f3a2…` → settle → read RCA Pareto. Matching code second.
