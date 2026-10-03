# Dispatch 3 — Turn-On List
Flags/gates that are built but not enabled. Record only; never flip.

| Flag / gate | File:line reading it | Default | What flips on | Breaks if flipped Friday? |
|---|---|---|---|---|
| PERFORMANCE_STATS_ENABLED | apps/web/app/performance/page.tsx:128-131, 189-217 | off | publishes real win/loss/win-rate headline numbers | YES — bypasses effective gate; G2 fixes this |
| PERFORMANCE_STATS (bare, same surface) | apps/web/app/api/performance/route.ts:9-11 | off | API serves performance stats without eligibility gate | YES — same G2 defect |
| (calibration panel, for contrast) resolveEffectivePerformanceGate() | lib/ops/effective-performance-gate.ts via lib/calibration/report.ts:18 | gated | n/a — already effective-gated | n/a |

# Dispatch 3 — Forecast List
Works today, predictably breaks in week 1-4.

| Surface | Breaks how | Found |
|---|---|---|
| scoreSpreadPick pick'em handling (packages/prediction-engine/src/scoring.ts:390-392) | Any live board where books post spread === 0 (PK lines): the 0-spread book counts as an AWAY vote (only `s < 0` counts HOME), so an all-pick'em board publishes a phantom SPREAD pick (probed: conf 59 ≥ 50, side AWAY, consensus 1.0) and a mixed board inflates the away side. Evidence + scope note in the re-audit addendum of docs/calibration-proposals/2026-09-04-totals-tiebreak-strict.md | 2026-09-04 re-audit (H-N6) |
