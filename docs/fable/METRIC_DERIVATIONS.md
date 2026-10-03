# Metric Derivations

Existing metric surfaces:
- `apps/web/lib/metrics/opponent-adjusted-epa.ts`
- `apps/web/lib/metrics/coverage-map.ts`
- `apps/web/lib/metrics/feature-store.ts`
- `apps/web/lib/metrics/uncertainty-map.ts`
- `apps/web/lib/nflverse/pbp.ts`
- `apps/web/lib/nflverse/next-gen-stats.ts`
- `apps/web/lib/nflverse/pressure-coverage.ts`
- `apps/web/lib/nflverse/qbr.ts`
- `apps/web/lib/nflverse/player-lab.ts`

Evidence posture:
- EPA, CPOE, RYOE, pressure, coverage, and usage features should be documented against the actual module that computes or imports them.
- Any fixture-only metric example must be labeled as fixture-only.
- Any claim that a metric improves predictions must cite a backtest, calibration report, or replay output.

New primitive linkage:
- `apps/web/lib/fable/uncertainty.ts` ranks candidate predictions by probability uncertainty.
- `apps/web/lib/fable/drift.ts` checks distribution drift and safe football segment parity.
