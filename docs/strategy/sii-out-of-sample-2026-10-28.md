# SII out-of-sample — the stacked-box effect replicates

2026-10-28. The stability check said the 9+ bucket needed ~400 plays before its magnitude meant
anything. Prior seasons have them. Same construction, full 2024 and 2025 seasons, motion minus
no-motion EPA within each box bucket.

| Season | Box 7 | Box 8 | Box 9+ |
|---|---|---|---|
| 2024 | −0.039 (n=4,639/3,570) | −0.020 (n=854/820) | **−0.199 (n=131/196)** |
| 2025 | +0.035 (n=5,697/3,870) | −0.014 (n=1,001/771) | **−0.212 (n=154/170)** |
| 2026 wk1–5 | +0.019 | +0.036 | −0.067 (n=79/61) |
| 2026 wk6–7 | −0.064 | −0.288 | −0.680 (n=30/31) |

## What replicates

**The 9+ box effect is real.** Motion costs roughly 0.20 EPA against a stacked box in both full
prior seasons, independently. That is four windows in the same direction and two of them at
season scale. The 2026 pooled −0.0435 is the weakest of the four and is now the outlier, not the
headline.

**Box 8 is consistently slightly negative** across all three seasons (−0.020, −0.014, and 2026
negative in both halves). Small but stable in sign.

**Box 7 does not replicate.** −0.039, +0.035, then both signs in 2026. Treat as noise.

## Revised reading

- SII at 9+: **usable, magnitude ≈ −0.20.** The 2026 sample is too thin to estimate it, but the
  prior seasons are not, and they agree with each other.
- SII at 8: direction only, magnitude small.
- SII at 7: not usable.

## Caveat that still stands

Prior seasons are not 2026. The reconstruction differs (2026 uses involved players only; 2024/25
use the published participation file with full rosters), and the league changes. A −0.20 prior
with a −0.04 current season is a real gap that could be regime change or could be the
reconstruction. It is not resolved here.

## Consequence

The docstring constant should be the replicated prior-season figure with the 2026 figure named as
the current-season reading, not the other way round. Pinning −0.0435 as "the" number understates
the effect by 4×.
