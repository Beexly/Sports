# Calibration publish checklist (Founding → Proven)

Status: **DRAFT** — founder approval required before any public
`PERFORMANCE_STATS` / `LIVE_BOARD` / `CALIBRATION_ADJUSTMENTS_ENABLED` change.

## Hard blockers (all must pass)

- [ ] Settled, graded sample only (no open games)
- [ ] N overall ≥ **500** (strawman)
- [ ] N per primary market (spread / total) ≥ **150** (strawman)
- [ ] High-confidence tail (p ≥ 0.75): N ≥ **50** (strawman)
- [ ] Reliability diagram generated (overall + per market)
- [ ] ECE ≤ **0.05** (strawman)
- [ ] MCE ≤ **0.12** (strawman)
- [ ] Mean log loss reported (no silent tail disasters)
- [ ] BSS vs climatology > 0 (and vs close if available)
- [ ] Date range + model version printed on report
- [ ] No invented odds/scores/GSIS; offline gaps labelled
- [ ] Founder YES recorded for PERFORMANCE_STATS / board / calibration-apply flags

## Explicitly not enough

- Hot W–L streak
- Positive ROI alone
- BSS > 0 without diagram
- Temperature / Platt / isotonic fit without re-checking ECE/MCE/N

## Internal tooling (no gate flips)

| Piece | Path |
|-------|------|
| Isotonic / CIR / ECE / Brier decomp | `packages/prediction-engine/src/probability-calibration.ts` |
| Platt / Beta / selector | `packages/prediction-engine/src/calibration-map.ts` |
| Temperature (R&D) | `packages/prediction-engine/src/temperature-scaling.ts` |
| Metrics cron (artifact only) | `apps/web/app/api/cron/calibration-metrics` |
| Pipeline notes | `docs/ops/CALIBRATION_PIPELINE.md` |

## Output artifact

- Internal path: `.gse-local/calibration/metrics.json` (or ops/calibration/reports/)
- Includes: metrics, reliability bins, git SHA, notes
- **Not** exposed as a public Proven page until this checklist is complete and signed

## Gate action

Only after this file is COMPLETE and founder-signed:

- Consider `PERFORMANCE_STATS` / related public surfaces
- Consider `CALIBRATION_ADJUSTMENTS_ENABLED` for live apply

Until then: **Founding ladder only; board stays gated.**
