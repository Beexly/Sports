# NGS Backfill Step 1 — Data Validation Report

**Date:** 2026-10-01. **Status:** validated locally (no DB, no credentials).
**Method:** fetched the full 2024 nflverse NGS season via the repo's own
`fetchNflverse` + `parseNgs*` + `projectNgsSignalRows` — the exact code path the
`/api/ops/ngs-backfill` route uses.

## Findings

### 1. Season assets contain complete weekly data
2024 season: weeks 1–18 REG fully populated.
- Receiving: 660–875 rows/week (weeks 1–17); week 18 partial (365 rows, mixed REG/POST)
- Rushing: 270–353 rows/week; Passing: 276–354 rows/week
- Week 0 = season aggregates (1,356 receiving rows) — projector correctly skips
- Weeks 19–23 = POST only, 0 REG rows — the backfill route's `seasonType === "REG"`
  filter correctly excludes them

### 2. Projector output volume
~130–147 signal payloads per REG week → **~2,400 payloads per full season**.
Across 2016–2024 (9 seasons): ~21,000 payloads, ~162 distinct season×week
fixtures per key — clears the 100-fixture floor for the within-player fit.

### 3. Raw scale anchors measured (fills the design doc's open question)

| key | n (2024) | mean | sd | range |
| --- | --- | --- | --- | --- |
| `ngs.avg_separation` | 1,306 | 3.121 | **1.039** | [0.69, 7.96] |
| `ngs.ryoe_per_att` | 554 | 0.366 | **1.688** | [−3.41, 9.81] |
| `ngs.cpoe` | 571 | 0.643 | **7.644** | [−18.63, 21.94] |

- `ryoe_per_att` sd=1.688 is a **new measurement** — the design doc (§7) flagged
  this as unmeasured. Use 1.7 as the normalization anchor.
- Separation sd=1.039 validates the scale-fit's 1.020 (within 2%).
- CPOE sd=7.644 validates the scale-fit's 7.820 (within 2.5%).
- All three keys are higher-is-better; `value = valueRaw` is directionally correct.

### 4. Production readiness
The `/api/ops/ngs-backfill` route (commit e03750b) uses this exact code path.
One season per call, 2016→present. First run should target a throwaway Neon
branch per the DB branch rule, starting with 2024 (validated here) before
sweeping back.

## Next (Steps 2–4)
Step 2 (crosswalk join) and Step 3 (within-player fit) require the backfilled
DB. Blocked on: throwaway Neon branch + route execution (needs Neon API key —
founder-gated).
