# Explore: isotonic regression for calibration

Monotone PAVA map; prefer when reliability shape is odd / levels wrong.
Thin tails → Platt/Temp. Code: `isotonic-pava.ts`, bake-off in `calibration-map-bakeoff.ts`.
**Apply OFF** until Res improves + holdout floors. Isotonic plateaus can destroy ranking if used for Kelly conviction while Res≈0.
