# Phase 0 acceptance — NFL (real nflverse data)

Generated 2026-07-16T16:00:43.284Z by `scripts/edge-lab/phase0-acceptance.ts` (provenance b0ae175129c73a41…, model v5.1.0).

| item | value |
|---|---|
| games loaded | 1871 (2019–2025) |
| sealed holdout | season 2025: 272 games — NEVER evaluated here |
| eval rows | 1508 (skipped: {"noOdds":1,"noScores":0,"thinHistory":85,"tie":5}) |
| real run | fired 851/1056 (coverage 80.6%), mean EV-vs-close -0.1132 ± 0.0475 — not claimable |
| **placebo gate** | **PASSED** (median p 0.015, median EV -0.0912) |
| MI probe | I(score;Y|q) = 0.00945 nats, null 0.00468, p = 0.060 |

The pipeline is leak-free at this gate's detection threshold: time-scrambled features cannot beat the close.

MI reading: these schedule features carry no measurable information beyond the closing price — expected for deliberately modest features; the founder should know Phase-3 features must clear this bar to matter.