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

## Implementation status (2026-08-25)

- **Shipped**: `packages/prediction-engine/src/edge-lab/features/log-odds-pool.ts`
  (+ test) — geometric-mean-of-odds pooling with Satopää-style extremization.
  This is Top-8 item #1 from the methodology report.
- **Next candidates** (pending review-pass corrections): extremized γ grid-search
  tuning on historical predictions; recency-weighted median aggregation;
  Spearman feature-exposure tracking in calibration-monitor.

## How to consume this directory

1. Read a `review-*.md` alongside its parent report — reviews carry corrections.
2. Trust formulas only where the review confirms them against the cited source.
3. New implementation tasks should cite the specific technique + review section.
