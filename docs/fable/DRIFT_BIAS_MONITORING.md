# Drift And Bias Monitoring

Existing calibration drift:
- `packages/prediction-engine/src/calibration-drift.ts`

New distribution checks:
- `computePopulationStabilityIndex`
- `computeKlDivergence`
- `computeChiSquareDrift`

New parity guard:
- `assessSafeFootballSegmentParity`

Safe football segments:
- position
- team
- home_away
- roof
- surface
- week
- season
- division
- conference

The parity check blocks non-football personal or protected segments. This keeps fairness diagnostics focused on football context and avoids turning sensitive personal categories into model governance axes without explicit policy approval.
