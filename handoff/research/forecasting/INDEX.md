# Forecasting / Prediction-Platform Research Index

Deep research completed 2026-08-25 (session 20260825_135931_e4fa29), continued same day
with adversarial review passes (review-* files) that audit the originals for errors,
gaps, undervalued items, and polish needs.

| File | What it holds |
|---|---|
| `platform-aggregation-methodology.md` | Documented methodology of Metaculus, Manifold, Polymarket, Numerai, Cultivate Labs/GJ Open: aggregation formulas (geometric mean of odds, extremization γ, recency weighting), LMSR/AMM mechanics, CLOB implied probability, staking/meta-model/MMC/feature-neutralization, superforecasting teaming. Includes repo-gap table + Top 8 adoptable techniques ranked by cost/value. |
| `academic-bibliography-implementable.md` | 10 structured citations (market efficiency, anytime-valid e-values, conformal prediction, logit-normal pooling, Brier decomposition, nflverse) + 6 implementable-now algorithms with formulas. NOTE: citations were NOT source-verified at write time — see review file before trusting IDs. |
| `platform-catalog-live-sweep.md` | Live verdicts (REAL-AND-LIVE / STALE / FABRICATED) for ~20 platforms with API availability notes. Verdicts spot-rechecked in review file. |
| `review-platform-aggregation.md` | Adversarial audit of the methodology report: formula/source errors, missed platform mechanics, ranking corrections, under-leveraged items vs existing repo modules. |
| `review-academic-bibliography.md` | Adversarial audit of the bibliography: citation spot-checks (wrong arXiv IDs flagged), missing literature, formula corrections (EV detector vig handling, CLV normalization), stronger variants. |
| `review-platform-catalog.md` | Adversarial audit of the sweep: verdict re-checks, missed platforms (Kalshi, INFER, exchanges), API auth/rate-limit details, zero-cost opportunities. |

## Implementation status (2026-08-25, complete)

- **Shipped**: `packages/prediction-engine/src/edge-lab/features/log-odds-pool.ts`
  (+ test) — geometric-mean-of-odds pooling with Satopää-style extremization.
- **Shipped**: `feature-exposure.ts` (+ test) — Numerai-style SRCC exposure per
  feature column (Top-8 item #4, promoted by the review pass).
- **Shipped**: `extremization-tuner.ts` (+ test) — Brier-optimized γ grid
  search with flat-optimum diagnostic.
- **Shipped**: `recency-weighted.ts` (+ test) — exponential-decay recency
  weighting over time-ordered forecasts; λ=1 reduces to flat mean + plain
  median; honest `dropped` reporting incl. zero-weight sources (Top-8 #2).
- **Shipped**: consensus geometric mode — `computeConsensus(..., { mode:
  "geometric" })` pools via logOddsPool; default arithmetic behavior byte-for-
  byte unchanged (wiring gap from review-platform-aggregation.md closed).
- **Shipped**: `mmc-contribution.ts` (+ test) — Numerai-style MMC: rank →
  gaussianize → project out consensus → correlate residual with outcome;
  nulls for degenerate/absorbed streams (documented limit: a source that IS
  the whole consensus gets an honest null). Complements brier-ogd-ensemble.
  All modules: tsc 0 errors, 50/50 tests green across the six suites.

## Review-pass corrections that supersede the original reports

- Manifold is **CPMM** (constant-product), not LMSR — the methodology report's
  LMSR section and Top-8 #5 are wrong; see review-platform-aggregation.md.
- Waudby-Smith & Ramdas citation ID is arXiv **2010.09686**, venue JRSS B —
  the bibliography's 2412.21125 is wrong; see review-academic-bibliography.md.
- PredictionBook is retired (not low-activity); INFER was missed entirely —
  see review-platform-catalog.md.
- EV-detector formula in the bibliography ignores vig removal; CLV tracker
  normalization explodes on longshots — use the corrected variants in the
  review file before implementing either.

## Remaining next candidates

1. Feed extremization-tuner output into consensus geometric mode (per-dataset γ
   instead of hardcoded 1).
2. Wire mmc-contribution into earned-weight/Brier-OGD weight updates as a
   tiebreaker for herd-tracking sources.
3. Live-data lane per review-platform-catalog.md zero-cost list: Manifold
   `/v0/markets` and Polymarket Gamma reads feeding clv-capture/hawkes-steam.
4. Bibliography's corrected EV-detector (vig-stripped) and CLV tracker
   (absolute normalization, N>30 gating) — implement only from the review
   file's stronger variants, not the original formulas.

## How to consume this directory

1. Read a `review-*.md` alongside its parent report — reviews carry corrections.
2. Trust formulas only where the review confirms them against the cited source.
3. New implementation tasks should cite the specific technique + review section.
