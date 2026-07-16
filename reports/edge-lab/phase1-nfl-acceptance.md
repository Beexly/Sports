# Phase 1 acceptance — the honesty engine (real nflverse data)

Generated 2026-07-16T16:24:11.315Z (provenance fcf68c3a2e6c67b4…, model v5.1.0).

| item | value |
|---|---|
| OOF segments (cal/tune/eval) | 352 / 352 / 352 — time-disjoint |
| sealed holdout | season 2025: 272 games, untouched |
| calibration | selected "beta" by held-out Brier decomposition |
| logit-pool β | -0.0822 ± 0.3511, CI [-0.7704, 0.6060] → **FIRE_NOTHING** |
| selective gate | τ=null → ZERO COVERAGE, honestly reported |
| VA marginal coverage | realized 0.5398 in [0.5185−tol, 0.5516+tol] → HOLDS |
| β/gate consistency | consistent (no firing without β evidence) |

**ACCEPTANCE: PASSED.** The honest outcome with Phase-0's modest features: the machinery says NO — β adds nothing, so nothing fires, and the zero is coverage-stamped. That refusal IS the honesty engine working (§2 P1 acceptance explicitly blesses this path).