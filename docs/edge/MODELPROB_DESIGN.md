# MODELPROB_DESIGN.md — Independent modelProb aggregation spec

**Cycle:** R71 (WIRING/PRODUCTIZATION — design only). **Status:** design / NOT SHIP.
**Contract requirement (murphy-res-definition.ts:48):** "Independent modelProb / edge ranking (not confidence/100 market echo)".
**Receipt contract (packages/prediction-engine/src/pick-proof-receipt.ts:48-52):** `modelProb?: number | null` — a genuinely calibrated 0..1 probability committed only when it exists; never `confidence/100`. `pick-proof-receipt.ts:83` asserts `0 <= p <= 1`.
**Market data invariant (LAW):** ZERO market/price/line/consensus/depth data enters this pipeline. `priced: false` by construction.

## Problem (C-28 — verified)
- `apps/web/lib/ops/compute-live-calibration-metrics.ts:119`: `"p from confidence/100 provisional; internal eligibility only until publish policy"`.
- `scoring.ts:486-494`: confidence derived from line-movement / consensus / depth (market structure).
- `calibration-apply.ts:55`: identity map `confidence/100`. No independent `modelProb` exists (`packages/` grep = null/absent — verified by R91).
- `murphy-res-definition.ts:48` names the fix: independent `modelProb`; `pick-proof-receipt.ts:50` demands it not be fabricated.

## Pipeline shape (player-level → game-level independent `p`)

### Inputs (market-free, in-flight builds only)
- **S1 — YACoe rolling signal** (R33): player-level signal from `packages/prediction-engine/src/edge-lab/yacoe-backtest.ts`. Pure fn; synthetic tests pass (exit 0, 4/4); `priced: false`.
- **S2 — TPR smoothed rate** (R34): player-level smoothed success rate; no market input.
- **S3+ (extensible)**: additional market-free player-level signals registered in `docs/ops/AGENT_LEDGER.md` before aggregation.

### Per-signal normalization (z-score vs. league-season baseline)
- Each signal `s_i` → `z_i = (s_i − μ_season) / σ_season` over the rolling league-season window.
- `μ_season`, `σ_season` computed from the same season's completed games (not including the target game); never from market-implied rates.

### Shrinkage toward league mean by sample size
- Map each `z_i` to a probability first (a z-score is unbounded, so it cannot be shrunk toward a `0..1` global directly): `p_i = logistic(κ · z_i)` with a pre-registered slope `κ`, so `p_i ∈ (0, 1)` by construction — required since `modelProb` must commit as a real `0..1` float (`pick-proof-receipt.ts:83` asserts the range).
- Then shrink: `p_i_shrunk = p_league + shrink(n_i) · (p_i − p_league)` where `shrink = n_i / (n_i + τ)` and `τ` is a season-level shrinkage parameter (pre-registered; never tuned post-hoc). Small `n` pulls strongly toward `p_league` (≈0.5 for binary); large `n` lets signal dominate. No market-based `τ`.

### Aggregation to game level (offense-weighted mean)
- Offense-side `p_game = Σ (w_j · p_j_shrunk) / Σ w_j` with `w_j` = snap-weight / target-share from NGS feed (`nflverse-ngs.ts`, pure ingestion; `priced: false`).
- Defense-side aggregated symmetrically for the opposing side; the receipt commits only the offense-side `p` for the pick side (`pick-proof-receipt.ts:52`).
- Final `modelProb` rounded to 6 decimals (`pick-proof-receipt.ts:111`) and committed as a real `0..1` float (never `"none"`) only when aggregation completes with `n_total ≥ minimum_n` (pre-registered threshold). Below threshold → `null` (honest absence, not `confidence/100`).

### Explicit no-market pipeline declaration
Every stage documented with `priced: false` annotation. No `line`, `entryOdds`, `marketFairProb`, `scoring.ts` confidence, or `calibration-apply` map touches this module. Verification: `grep -n 'priced\|confidence\|line\|market' MODELPROB_DESIGN.md` must show only references to exclusions and `priced: false`, never inputs.

### Method tag (versioned)
- `modelVersion` in receipt (e.g. `independent_modelProb_aggregation_v1`).
- Method tag: `independent_modelProb_aggregation_v1_2026-08`. Registered in preregistration doc before any SHIP claim (`CONTINUOUS.md` LAW 2 / `AGENTS.md` LAW 2).

### Slotting into murphy-res-definition contract (read-only, no sealed-path edits)
- `buildMurphyResSnapshot` (`murphy-res-definition.ts:83-107`) receives `resolution` and `reliability` computed over `modelProb`-binned forecasts (not `confidence/100` bins). `brier` computed with `p` from this pipeline; `UNC` unchanged (base-rate irreducible). No edit to `murphy-res-definition.ts` needed — only to the upstream producer that feeds it a real `modelProb` instead of `confidence/100`. Sealed paths (`packages/db/prisma/schema.prisma`, `.github/workflows/**`, `.claude/**`) untouched per `CONTINUOUS.md` LAW 4 / `AGENTS.md` LAW 6.

## Verification plan before any SHIP claim
1. `grep -rni "confidence/100\|marketFairProb\|line\|entryOdds" docs/edge/MODELPROB_DESIGN.md` → 0 hits as inputs (only exclusions noted).
2. Synthetic property: monotonic `p` increases with stronger `S1+S2` aggregate (reproducible; no real-data claim).
3. `pick-proof-receipt.ts` mint with `modelProb` from this aggregation (not `null`) and `modelVersion` tagged; re-verify hash (`verifyPickProofReceipt`) passes.
4. `murphy-res-definition.ts` contract: RES computed over modelProb bins must be ≥ pre-registered floor (`resNeededApprox`); if not, BLOCKED (honest gap) — not adjusted downward.

## Next actions (not done in R71)
- R33 complete: replace synthetic `YACoe` with real `ngs_receiving.csv.gz` parsed rows (`nflverse-ngs.ts:167`); verify `git rev-parse` of ingestion commit.
- R34 complete: wire `TPR` smoothed rate to same pipeline.
- Preregistration doc (`docs/edge/`) signed with frozen `τ`, minimum `n`, `modelVersion`, and exclusion list before any SHIP claim (per `CONTINUOUS.md` LAW 2 / `AGENTS.md` LAW 2 / `EDGE_LEDGER.md` C-28 rules).
- Then aggregate → commit receipt → compute `RES` independently → only then does `C-28` leave BLOCKED.

**Sealed-path status:** untouched (`packages/db/prisma/schema.prisma`, `.github/workflows/**`, `.claude/**`, `.env*`, `.githooks/**` not edited — verified by design: this is a spec file only).
**Market-echo status:** zero — this design explicitly excludes `confidence/100`, `scoring.ts`, `calibration-apply`, and any price data; only `YACoe` + `TPR` (both `priced: false`) enter.
