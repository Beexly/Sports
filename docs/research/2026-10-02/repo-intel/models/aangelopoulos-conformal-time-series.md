# aangelopoulos/conformal-time-series

- Stars: 145 (MIT) — companion to Angelopoulos et al., "Conformal PID Control for Time-Series Prediction" (arXiv 2307.16895)
- Repo: https://github.com/aangelopoulos/conformal-time-series

## 1. Vision

Prediction sets for time series with coverage guarantees **against any, possibly adversarial, sequence** — no exchangeability needed. Frames conformal calibration as a control problem: **Conformal PID Control** adjusts the quantile level online (quantile tracking / P-control, adaptive conformal inference) so coverage holds even under distribution shift.

## 2. The Ask

A stream of (prediction, outcome) pairs; the controller updates the miscoverage level each step. Notebook + test scripts; extensible to new datasets.

## 3. Constraints

- License: MIT. Research code (pushed 2023-11), not a package.
- Guarantee is on long-run coverage, not per-step intervals — intervals can swing wider during shift periods (honest, but ugly).

## 4. GSE lens

This is the **2026 live-check problem solved in principle**: when W1-4 (or mid-season) stops looking like the 2025 calibration slice — new schemes, injuries, weather — exchangeability-based intervals (MAPIE/crepes) lose their guarantee, and the exchangeability tests will tell you so. Conformal PID control is the fallback: an online controller that keeps long-run coverage *without* assuming the future looks like the past. Practical GSE mapping:

- Primary: MAPIE/crepes intervals conformalized per season. Gate: exchangeability test on the live slice.
- Fallback when the gate fires: switch the affected signal to PID-style adaptive quantiles until the next seasonal recalibration. Coverage degrades gracefully instead of silently.
- This is also the intellectually honest answer to "recalibrate per season or one global map": **per season, with an adaptive controller bridging regime shifts.**

## 5. Verdict

**REBUILD** — implement the PID/quantile-tracking controller as the drift-fallback for live signals; don't wire the research code directly. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/aangelopoulos/conformal-time-series
- Diagram: https://gitdiagram.com/aangelopoulos/conformal-time-series
- Star history: https://star-history.com/#aangelopoulos/conformal-time-series (145 stars)
- Open in browser IDE: https://github.dev/aangelopoulos/conformal-time-series
