# Durable diagnosis: recalibration insufficient (2026-08-09 live)

## Live (prod probe)
- map n ≈ 760; Brier ≈ 0.275; ECE ≈ 0.112; Murphy reliability ≈ 0.026 (ok)
- Murphy **resolution** ≈ 0.002 (near-zero ranking power)
- Eligibility **RED**; publish off — **correct**

## Conclusion
Forecasts barely separate wins from losses. Temperature / Platt / hierarchical EB-τ fix **reliability** when resolution exists. With resolution ~0, **recalibration alone will not clear PROVEN floors**.

## Required path to PROVEN
Improve model ranking / feature quality → re-run calibration-metrics → Brier/ECE under floors → GREEN×3 → `CALIBRATION_AUTO_PUBLISH=true` once.

Never lower floors. Never publish while RED.
