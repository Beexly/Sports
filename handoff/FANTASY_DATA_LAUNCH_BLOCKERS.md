# Fantasy Data Launch Blockers
<!-- owner: founder | review: sprint -->

Status report for P11-04. This file consolidates every finding from the
three accuracy audits that requires OWNER decision or budget — items that
cannot be completed by code alone and would otherwise be committed silently
or left as stale comments.

## 0. The Gap: What Exists vs. a Real Fantasy-Primary Proprietary Score

A "real" fantasy-primary proprietary score pipeline needs four layers. This
repo ships **Layer 1 (fact ingestion) fully**, and has **scaffolding for
Layers 2–3**, but **Layer 4 is absent** — meaning the platform today produces
ranked picks derived from public-fact ingestion, not from a self-calibrating
predictive model that owns its own error surface.

| Layer | What a real pipeline needs | What exists today | Gap size |
|---|---|---|---|
| **1. Fact ingestion** | Real, rights-cleared free sources for ADP, rankings, scores, salaries | Complete: espn-public-api, open-meteo, ffc-adp, sleeper, nflverse, mlb-statsapi, etc. — all gated through the clearance engine | **None** — production-ready |
| **2. ADP cross-validation** | ≥2 independent ADP sources, refreshed on a schedule, with discrepancy alerts | `ffc-adp` only — single source, lazy refresh (on-demand only, no cron) | **Medium** — no freshness guard, no discrepancy detection |
| **3. Rankings persistence** | Poll rankings ingested and persisted on a schedule, wired into the pick-ranking pipeline | `espn-rankings.ts` adapter exists and is tested, but has **zero live consumers** — `getCfbSnapshot` and `apTop25` are only called from tests | **Medium** — dead code, not wired |
| **4. Proprietary projection model** | A trained/calibrated model that produces the primary score, with a feedback loop that learns from settled results and adjusts confidence | None — all `proj`/`ceiling`/`own` values in `dfs-slate.ts` are manually authored constants; no model training pipeline, no calibration feedback from `pick.result` | **Large** — the platform has no model-owned score |
| **5. Calibration feedback loop** | Historical pick results feed back into confidence calibration, producing calibrated `confidence` values and coverage gaps | `source-confidence.ts` exists for source-level confidence, but pick-level confidence is not recalibrated from settled outcomes | **Large** — confidence is static, not empirical |

**Summary:** The platform can ingest free facts, optimize lineups, and rank
picks — but the *primary score* that drives pick ordering is not
model-owned. Closing the gap to a real proprietary score requires
(1) scheduling ADP + rankings ingestion, (2) adding a second ADP provider,
and (3) building/train a projection model with a result-feedback loop.

---

## SAFE DIRECT (already addressed in this sprint)

These findings were fixed by code changes in the same commit as this doc:

- **P11-03 / Path A — partial lineup result silently dropped:** `generateLineups`
  now returns `{ requested, partial }` and `dfs-optimizer.tsx` surfaces a
  user-facing "partial" notice explaining why fewer lineups than requested
  were produced (salary/cap/uniqueness exhausted). Test:
  `surfaces partial=true when fewer unique lineups are feasible than requested`.
  **Files:** `apps/web/lib/fantasy/dfs-optimizer.ts`,
  `apps/web/components/fantasy/dfs-optimizer.tsx`,
  `apps/web/lib/fantasy/dfs-optimizer.test.ts`

- **P11-02 / GSE-SEC-050 — ESPN fact-extract path missing clearance gate in
  multi-source-scores.ts:** `fetchEspnForDates` and the final undated fallback
  in `fetchScoresMultiSource` now call `checkClearance()` before any
  `fetchEspnScoreboard` call. If the source's registry status flips (e.g.
  `storage_allowed` revoked → `permission_required`), the fetch is refused
  with a `clearance-denied` error pushed to the `errors` array instead of
  continuing silently. **File:** `apps/web/lib/data-sources/multi-source-scores.ts`

- **P11-02 / GSE-SEC-076 — Open-Meteo weather path missing clearance gate:**
  `fetchWeatherFreeFirst` now calls `checkClearance()` before hitting the
  Open-Meteo endpoint, enforcing the rights registry even on the open-license
  path so a future status change triggers refusal rather than silent
  ingestion. **File:** `apps/web/lib/data-sources/free-first-ingest.ts`

---

## NEEDS-OWNER (cannot be completed by code alone)

### N-1: Second ADP source required (P11-01 / F-01)

**What:** `ffc-adp` (Fantasy Football Calculator) is the ONLY configured ADP
source. A single source cannot detect stale or anomalous ADP data — there is
no cross-validation, no discrepancy alerting, and no fallback if the source
degrades or changes terms.

**What's needed:** A second ADP provider with a free or paid tier. Candidates:
Sleeper API (free, public), Yahoo Fantasy API (requires user OAuth), ESPN
Fantasy API (requires private key + commercial terms review).

**Why owner decision:** Budget for a paid provider, or approval to wire
Sleeper API as a cross-validation layer. Cost estimate: $0–$250/month for
Sleeper (free tier sufficient for cross-validation only).

### N-2: ADP freshness cron (P11-01 / F-02)

**What:** ADP currently refreshes lazily — `fetchScoresFreeFirst` only
fetches when a consumer calls it. There is no scheduled job that proactively
refreshes ADP so the cache is always warm. If a large influx of users hits
the site simultaneously, the first request pays the full network cost.

**What's needed:** A `vercel.json` cron config (or internal cron) that calls
the ADP refresh endpoint every 4 hours during NFL season. The ingestion code
exists; the cron schedule does not.

**Why owner decision:** `vercel.json` / cron scheduling is infra-as-config.
Requires signing off on frequency vs. cost and ensuring the cron job targets
the correct internal API route.

### N-3: ESPN rankings — wire into live pipeline (P11-02)

**What:** The `espn-rankings.ts` adapter (`parseEspnRankings`,
`fetchEspnRankings`) exists, is tested, and is rights-cleared
(`espn-public-api` / `approved_public_logged_off`). But `getCfbSnapshot` and
`apTop25` are only called from test files — there is no cron, no API route,
and no consumer in the pick-ranking pipeline.

**What's needed:** Decide whether rankings feed into the proven-path engine
(`proven-path-seed.ts`) as a polarity factor, or into the source confidence
model. Then schedule a cron + wire the adapter into the consumer.

**Why owner decision:** Product decision — does the platform want poll
rankings as a ranking factor? This determines which downstream consumer gets
wired and how the data flows into the pick-ranking pipeline.

### N-4: Model-owned projection pipeline (P11-04 / Layer 4)

**What:** All player projections (`proj`, `ceiling`, `own`) in
`dfs-slate.ts` are manually authored constants. There is no trained model,
no feature pipeline, and no model-training cron. The "primary score" that
drives pick ordering is therefore not proprietary — it's human-curated.

**What's needed:** A projection model training package that:
1. Ingests historical box scores + betting lines (nflverse, the-odds-api)
2. Trains a lightweight regression model (no GPU needed — linear/GBDT on CPU)
3. Persists model weights to the DB with versioning
4. Scores incoming players via the model at ingest time

**Why owner decision:** This is the single largest gap. Requires defining
the model architecture, feature set, training frequency, and whether
historical labels (settled pick results) are available in sufficient volume.
Estimated build: 2–3 sprints for an ML engineer.

### N-5: Pick-confidence calibration feedback loop (P11-04 / Layer 5)

**What:** `source-confidence.ts` derives confidence from source rights
status, cost, and status — but not from empirical pick accuracy. The
`confidence` field on `pick` records is not recalibrated from `pick.result`
(settled win/loss). There is no mechanism to detect "confidence is
systematically overdispersed" or "this factor type is miscalibrated."

**What's needed:** A calibration cron that:
1. Bins settled picks by confidence quartiles
2. Compares predicted confidence vs. actual hit rate
3. Produces a calibration curve + reliability table
4. Optionally rewrites confidence values with a Platt/isotonic correction

**Why owner decision:** Requires deciding whether the platform will
auto-adjust confidence from results (ML feedback) or keep it human-curated.
Also requires access to a statistically significant volume of settled picks
(minimum ~200 per sport for stable calibration bins).
