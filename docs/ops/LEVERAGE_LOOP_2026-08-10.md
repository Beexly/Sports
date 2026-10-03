# Leverage loop — 2026-08-10 (no gate flips)

Integrity: PERFORMANCE_STATS OFF · maps OFF · AUTO_PUBLISH OFF · RANKING_PAUSE_APPLY default OFF · free-path ABSENT-only · no invent PROVEN/ROI.

## Items

### 1. Market clock — wait Rundown / free Odds key

| Fact | Live |
|---|---|
| Last oddsInserted>0 | 2026-07-25 (stale ≫ 240m SLA) |
| Rundown | key present (`THERUNDOWN_API`); free-tier **HTTP 429** |
| THE_ODDS_API_KEY | **ABSENT** |
| Economy | daySpan=2, abort on 429, cascade-skip sports, longer inter-sport pause |

**Action (agent):** cannot invent a key. Ops surface now flags 429 in `oddsInserting.lastZeroOddsNote` / operatorHint. Signal board independent of market clock.

**Founder (optional):** set Production `THE_ODDS_API_KEY` (free tier OK) for dual-path inserts when Rundown is 429-blocked.

### 2. Pause dead sport|market groups (apply still OFF)

**Bug fixed:** proven-path `pauseGroups` used only Res≈0 holdout and was often **empty**, while RPCP listed **significance-dead** groups (live: 4). Enabling `RANKING_PAUSE_APPLY` would have paused nothing.

**Fix shipped:**

- `buildProvenPathPlan` pause = **Res≈0 ∪ significance-dead** (same criteria as RPCP)
- `pauseSources: { resNearZero, significanceDead }` for honesty
- `rankingPauseApplyPosture.planPauseGroups` surfaces advisory keys while apply stays OFF
- RPCP residual lists pause keys in operatorHint

**Still correct:** default OFF. Founder sets `RANKING_PAUSE_APPLY=true` only when ready to re-measure RES on keep set.

### 3. Selective δ + calib remeasure

- Selective runtime default **ON**, δ from plan (live ~0.08; RPCP may recommend 0.15 for RES)
- `calibration-metrics` backfill batch **150 → 250** per tick (unpriced-only work budget still holds)
- Re-run happens on Vercel cron; agent cannot call CRON_SECRET from this sandbox

### 4. Drive Brier ≤ 0.22 → GREEN×3

Live (pre-this-ship snapshot):

| Metric | Value | Floor |
|---|---|---|
| n | 339 | ≥100 |
| Brier | **0.2467** | ≤0.22 |
| ECE | 0.0387 | ≤0.05 |
| consecutiveGreen | 0 | K=3 |
| Murphy RES live | ~0.002 | need ~0.03–0.05 |
| RPCP projected RES | ~0.019 | still short of floor |

Murphy: **Brier ≈ REL − RES + UNC**. UNC≈0.25, REL low; need **RES lift**, not maps.

- Selective+pause **alone do not yet project Brier ≤ 0.22** on historical sample (ops now expose `projectedBrier` / `brierGapToFloor`).
- Path: more independent trueProb settles + pause dead groups when ready + keep selective + sport models when RES stays thin.
- **No invent PROVEN.** GREEN only after live eligibility floors clear.

### Coverage honesty

RPCP `independentCoverage` residual now uses **ML/SPREAD eligible denom** (same as bake-off ≥40% gate). `independentCoverageVsAll` kept as diagnostic (TOTAL dilutes).

## What was NOT flipped

- `RANKING_PAUSE_APPLY`
- `PERFORMANCE_STATS_ENABLED` / `CALIBRATION_AUTO_PUBLISH` / maps apply
- Free-path ABSENT rules
- Floors (Brier 0.22, ECE 0.05, n 100, K=3)

## Deploy

Merge to `main` → Vercel. After deploy, public-surface-truth should show:

- `provenPath.pauseGroups.length` ≈ `rankingPower.pauseGroupCount` (>0 when significance-dead exist)
- `rankingPauseApply.planPauseCount` > 0 with keys listed
- `rankingPower.independentCoverage` ≈ bake-off coverage (~65% post-backfill)
- `rankingPower.projectedBrier` / `brierGapToFloor` present
