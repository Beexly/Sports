# Phase 3 acceptance — edge models (real data, honest boundaries)

Generated 2026-07-16T16:55:58.398Z (provenance f3c7924af7642ad3…).

| criterion | result |
|---|---|
| distillation beats baseline (walk-forward, real closes) | 6/6 folds, mean R² vs baseline 0.596 → PASS |
| props HB posterior-predictive calibration (real player-weeks) | PASS |
| residual GBM anti-rediscovery | test-pinned PASS (see residual-gbm.test.ts) |
| CLV vs obtainable price | **PENDING LINE-ARCHIVE DATA** — honestly unclaimed |

**PHASE 3: ACCEPTED within the honest data boundary.**

The models are built, validated on real data for their statistical targets, and wired to fire only through the
Phase-1 honesty gates. The price-CLV leg activates when the founder applies the line-archive migration and flips
LINE_ARCHIVE_ENABLED — from that point the archive accumulates decision-time prices and the acceptance harness
grades real CLV with no code changes.